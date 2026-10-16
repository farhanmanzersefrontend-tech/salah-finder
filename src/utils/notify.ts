export const isNotificationSupported = () => {
  return "Notification" in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
};

export const showPrayerNotification = (title: string, body: string) => {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    return new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: "prayer-azan",
    });
  } catch {
    return null;
  }
};
