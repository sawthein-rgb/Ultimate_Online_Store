const NOTIFICATION_STORAGE_KEY = "uos-notifications";
const NOTIFICATION_EVENT_NAME = "uos-notifications-updated";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readNotificationStore() {
  try {
    const rawValue = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.warn("Notifications could not be read from localStorage.", error);
    return [];
  }
}

function writeNotificationStore(items) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT_NAME, {
      detail: clone(items),
    })
  );
}

function normalizeNotification(input) {
  return {
    id: input.id || `notice-${crypto.randomUUID().slice(0, 8)}`,
    audienceType: input.audienceType,
    sellerId: input.sellerId || null,
    title: input.title?.trim() || "Notification",
    body: input.body?.trim() || "",
    kind: input.kind || "general",
    orderId: input.orderId || null,
    requestId: input.requestId || null,
    read: Boolean(input.read),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

function sortByNewest(items) {
  return [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function matchesAudience(notification, audienceType, sellerId = null) {
  if (notification.audienceType !== audienceType) {
    return false;
  }

  if (audienceType === "seller") {
    return notification.sellerId === sellerId;
  }

  return true;
}

export function addNotification(input) {
  const items = readNotificationStore();
  const notification = normalizeNotification(input);
  const nextItems = sortByNewest([notification, ...items]).slice(0, 120);

  writeNotificationStore(nextItems);
  return notification;
}

export function listNotifications({ audienceType, sellerId = null, limit = 6, unreadOnly = false }) {
  return sortByNewest(readNotificationStore())
    .filter((notification) => matchesAudience(notification, audienceType, sellerId))
    .filter((notification) => (unreadOnly ? !notification.read : true))
    .slice(0, limit);
}

export function countUnreadNotifications({ audienceType, sellerId = null }) {
  return readNotificationStore().filter((notification) => {
    return matchesAudience(notification, audienceType, sellerId) && !notification.read;
  }).length;
}

export function markNotificationsAsRead({ audienceType, sellerId = null }) {
  const items = readNotificationStore();
  let changed = false;

  const nextItems = items.map((notification) => {
    if (!matchesAudience(notification, audienceType, sellerId) || notification.read) {
      return notification;
    }

    changed = true;
    return {
      ...notification,
      read: true,
      updatedAt: new Date().toISOString(),
    };
  });

  if (changed) {
    writeNotificationStore(nextItems);
  }
}

export function subscribeToNotificationChanges(listener) {
  const handleStorage = (event) => {
    if (event.key && event.key !== NOTIFICATION_STORAGE_KEY) {
      return;
    }

    try {
      listener(event.newValue ? JSON.parse(event.newValue) : readNotificationStore());
    } catch (error) {
      console.warn("Notification sync event could not be parsed.", error);
      listener(readNotificationStore());
    }
  };
  const handleLocalUpdate = () => {
    listener(readNotificationStore());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(NOTIFICATION_EVENT_NAME, handleLocalUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(NOTIFICATION_EVENT_NAME, handleLocalUpdate);
  };
}
