const pageNotifications = new Map<string, Notification>();

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

export async function notificationWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  try {
    await navigator.serviceWorker.register('/sw.js');
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolve => window.setTimeout(() => resolve(null), 5000)),
    ]);
  } catch { return null; }
}

export const showPrayerNotification = async (title: string, body: string, silent = false, token?: string) => {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const registration = await notificationWorker();
    if (registration) {
      await registration.showNotification(title, {
        body, icon: '/icon-192.png', tag: token ? 'azan-playing' : 'prayer-azan', silent,
        ...(token ? { data: { token }, actions: [{ action: 'mute-azan', title: 'Mute azan' }], requireInteraction: true } : {}),
      });
      return true;
    }
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: token ? 'azan-playing' : 'prayer-azan',
      silent,
    });
    notification.onclick = () => { window.focus(); notification.close(); };
    if (token) pageNotifications.set(token, notification);
    notification.onclose = () => { if (token) pageNotifications.delete(token); };
    return notification;
  } catch {
    return null;
  }
};

export async function closeAzanNotification(token: string) {
  pageNotifications.get(token)?.close();
  pageNotifications.delete(token);
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const notifications = await registration?.getNotifications({ tag: 'azan-playing' });
    notifications?.filter(item => item.data?.token === token).forEach(item => item.close());
  } catch { /* Notification cleanup must not interrupt playback controls. */ }
}
