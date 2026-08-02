import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/student/notifications`)
      .then(({ data }) => data.success ? setNotifications(data.notifications) : toast.error(data.msg))
      .catch(() => toast.error("Could not load notifications"))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (notification) => {
    if (notification.readAt) return;
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/notifications/read`, { notificationId: notification._id });
      if (!data.success) throw new Error(data.msg);
      setNotifications((items) => items.map((item) => item._id === notification._id ? data.notification : item));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) { toast.error(error.response?.data?.msg || error.message || "Could not update notification"); }
  };

  const markAllRead = async () => {
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/notifications/read-all`);
      if (!data.success) throw new Error(data.msg);
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => item.readAt ? item : { ...item, readAt }));
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success(data.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message || "Could not update notifications"); }
  };

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Notifications</h1><p className="mt-1 text-slate-600">Invitations, round schedules, decisions, and RSVP updates.</p></div>{notifications.some((item) => !item.readAt) && <button onClick={markAllRead} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Mark all as read</button>}</div>
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {loading ? <p className="p-6" role="status">Loading notifications…</p> : notifications.length === 0 ? <p className="p-10 text-center text-slate-500">You’re all caught up.</p> : notifications.map((notification) => (
        <div key={notification._id} className={`border-b border-slate-100 p-5 last:border-0 ${notification.readAt ? "bg-white" : "bg-blue-50/60"}`}>
          <div className="flex gap-3">
            {!notification.readAt && <span className="mt-2 h-2 w-2 flex-none rounded-full bg-blue-600" aria-label="Unread" />}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{notification.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
              <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
              {notification.link && <Link to={notification.link} onClick={() => markRead(notification)} className="mt-2 inline-block text-sm font-semibold text-[#1a4b8e] hover:underline">Open details</Link>}
              {!notification.readAt && <button onClick={() => markRead(notification)} className="ml-4 mt-2 text-sm font-semibold text-slate-600 hover:underline">Mark as read</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>;
}
