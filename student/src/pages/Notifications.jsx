import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";
import { Button, EmptyState, Page, PageHeader, SkeletonList } from "../components/ui";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/student/notifications`)
      .then(({ data }) =>
        data.success ? setNotifications(data.notifications) : toast.error(data.msg),
      )
      .catch(() => toast.error("Could not load notifications"))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (notification) => {
    if (notification.readAt) return;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/notifications/read`,
        { notificationId: notification._id },
      );
      if (!data.success) throw new Error(data.msg);
      setNotifications((items) =>
        items.map((item) => (item._id === notification._id ? data.notification : item)),
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update notification");
    }
  };

  const markAllRead = async () => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/notifications/read-all`,
      );
      if (!data.success) throw new Error(data.msg);
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => (item.readAt ? item : { ...item, readAt })));
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update notifications");
    }
  };

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <Page width="3xl">
      <PageHeader
        eyebrow={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        title="Notifications"
        description="Team invitations, round schedules, decisions, and RSVP updates."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              Mark all as read
            </Button>
          )
        }
      />

      <div className="mt-8">
        {loading ? (
          <SkeletonList rows={4} />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Updates about your applications and RSVPs will appear here."
            action={
              <Button to="/events" variant="secondary">
                Browse events
              </Button>
            }
          />
        ) : (
          <ol className="stagger card divide-y divide-line overflow-hidden">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              return (
                <li
                  key={notification._id}
                  className={`relative p-5 transition-colors duration-500 ${
                    unread ? "bg-accent-tint/35" : ""
                  }`}
                >
                  {/* Unread gets an accent spine rather than a coloured block. */}
                  {unread && (
                    <span
                      className="absolute inset-y-0 left-0 w-0.5 bg-accent"
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <h2 className={`text-[0.9375rem] ${unread ? "font-semibold" : "font-medium"}`}>
                      {notification.title}
                    </h2>
                    <time className="tabular flex-none text-xs text-ink-3">
                      {formatDateTime(notification.createdAt)}
                    </time>
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {notification.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {notification.link && (
                      <Link
                        to={notification.link}
                        onClick={() => markRead(notification)}
                        className="link link-accent text-sm font-semibold"
                      >
                        Open details →
                      </Link>
                    )}
                    {unread && (
                      <button
                        onClick={() => markRead(notification)}
                        className="link text-sm text-ink-3"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Page>
  );
}
