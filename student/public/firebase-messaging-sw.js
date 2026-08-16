/* global firebase, importScripts */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = String(event.notification.data?.link || "/notifications");
  const target = requested.startsWith("/") && !requested.startsWith("//")
    ? new URL(requested, self.location.origin).href
    : new URL("/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});

importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

const parameters = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: parameters.get("apiKey"),
  authDomain: parameters.get("authDomain"),
  projectId: parameters.get("projectId"),
  storageBucket: parameters.get("storageBucket"),
  messagingSenderId: parameters.get("messagingSenderId"),
  appId: parameters.get("appId"),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  firebase.messaging().onBackgroundMessage((payload) => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || "Discovr update", {
      body: data.body || "You have a new recruitment update.",
      icon: "/discovr-o.png",
      badge: "/discovr-o.png",
      tag: `${data.type || "notification"}:${data.link || "/notifications"}`,
      data: { link: data.link || "/notifications" },
    });
  });
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
