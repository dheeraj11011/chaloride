import { useEffect } from "react";
import useStore from "../store/useStore";

const Toast = () => {
  const { notification, clearNotification } = useStore();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(clearNotification, 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };

  return (
    <div
      className={`fixed top-20 right-4 z-[9999] ${colors[notification.type] || colors.info} text-white px-5 py-3 rounded-xl shadow-lg max-w-sm text-sm font-medium transition-all animate-pulse`}
    >
      {notification.msg}
    </div>
  );
};

export default Toast;
