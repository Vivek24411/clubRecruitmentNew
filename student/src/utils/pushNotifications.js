import axios from "axios";

const INSTALLATION_KEY = "discovrFirebaseInstallationId";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const configured = Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.projectId
  && firebaseConfig.messagingSenderId
  && firebaseConfig.appId
  && vapidKey,
);

let clientPromise;
let currentInstallationId = localStorage.getItem(INSTALLATION_KEY) || "";
const registrationWaiters = new Set();

function announce(status, detail = {}) {
  window.dispatchEvent(new CustomEvent("push-state-changed", { detail: { status, ...detail } }));
}

async function uploadInstallation(installationId) {
  currentInstallationId = installationId;
  localStorage.setItem(INSTALLATION_KEY, installationId);
  await axios.put(`${import.meta.env.VITE_BASE_URI}/student/push/registration`, { installationId });
  registrationWaiters.forEach((resolve) => resolve(installationId));
  registrationWaiters.clear();
  announce("enabled", { installationId });
}

async function removeInstallation(installationId) {
  if (!installationId) return;
  try {
    await axios.delete(`${import.meta.env.VITE_BASE_URI}/student/push/registration`, {
      data: { installationId },
    });
  } finally {
    if (currentInstallationId === installationId) {
      currentInstallationId = "";
      localStorage.removeItem(INSTALLATION_KEY);
    }
  }
}

function serviceWorkerUrl() {
  const params = new URLSearchParams(
    Object.entries(firebaseConfig).filter(([, value]) => Boolean(value)),
  );
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function messagingClient() {
  if (!configured || !("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      const [{ getApps, initializeApp }, messagingApi] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!await messagingApi.isSupported()) return null;
      const app = getApps().find(({ name }) => name === "discovr-messaging")
        || initializeApp(firebaseConfig, "discovr-messaging");
      const serviceWorkerRegistration = await navigator.serviceWorker.register(serviceWorkerUrl(), { scope: "/" });
      const messaging = messagingApi.getMessaging(app);
      messagingApi.onRegistered(messaging, (installationId) => {
        void uploadInstallation(installationId).catch(() => announce("error"));
      });
      messagingApi.onUnregistered(messaging, (installationId) => {
        void removeInstallation(installationId)
          .catch(() => {})
          .finally(() => announce("disabled"));
      });
      messagingApi.onMessage(messaging, (payload) => {
        window.dispatchEvent(new CustomEvent("discovr-push-notification", { detail: payload }));
      });
      return { messaging, messagingApi, serviceWorkerRegistration };
    })();
  }
  return clientPromise;
}

function waitForRegistration(timeoutMs = 15000) {
  let cancel;
  const promise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      registrationWaiters.delete(done);
      reject(new Error("Firebase registration timed out. Please try again."));
    }, timeoutMs);
    const done = (installationId) => {
      window.clearTimeout(timeout);
      resolve(installationId);
    };
    registrationWaiters.add(done);
    cancel = () => {
      window.clearTimeout(timeout);
      registrationWaiters.delete(done);
    };
  });
  return { promise, cancel };
}

export async function enablePushNotifications() {
  if (!configured) throw new Error("Push notifications are not configured yet");
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support push notifications");
  }
  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked in your browser settings");
  }
  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");
  const client = await messagingClient();
  if (!client) throw new Error("This browser does not support push notifications");

  const registration = waitForRegistration();
  try {
    await client.messagingApi.register(client.messaging, {
      vapidKey,
      serviceWorkerRegistration: client.serviceWorkerRegistration,
    });
    await registration.promise;
  } catch (error) {
    registration.cancel();
    throw error;
  }
  return getPushNotificationState();
}

export async function syncPushRegistration() {
  if (!configured || !("Notification" in window) || Notification.permission !== "granted") return;
  const client = await messagingClient();
  if (!client) return;
  await client.messagingApi.register(client.messaging, {
    vapidKey,
    serviceWorkerRegistration: client.serviceWorkerRegistration,
  });
}

export async function disablePushNotifications() {
  const client = await messagingClient();
  const installationId = currentInstallationId || localStorage.getItem(INSTALLATION_KEY) || "";
  await removeInstallation(installationId);
  if (client) await client.messagingApi.unregister(client.messaging);
  announce("disabled");
  return getPushNotificationState();
}

export async function detachPushRegistration() {
  const installationId = currentInstallationId || localStorage.getItem(INSTALLATION_KEY) || "";
  if (!installationId) return;
  await axios.delete(`${import.meta.env.VITE_BASE_URI}/student/push/registration`, {
    data: { installationId },
  });
}

export async function getPushNotificationState() {
  if (!configured) return { status: "unconfigured", configured: false };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unsupported", configured: true };
  }
  if (Notification.permission === "denied") return { status: "blocked", configured: true };
  const installationId = currentInstallationId || localStorage.getItem(INSTALLATION_KEY) || "";
  if (Notification.permission !== "granted" || !installationId) {
    return { status: "disabled", configured: true };
  }
  try {
    const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/push/registration`, {
      params: { installationId },
    });
    return { status: data.active ? "enabled" : "disabled", configured: true };
  } catch {
    return { status: "disabled", configured: true };
  }
}
