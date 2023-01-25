import * as safety from "../safety/mod.ts";

export type NotificationIdentity = string;

export interface Notification {
  readonly identity: NotificationIdentity;
  readonly count: (set?: number) => number;
  readonly subject?: string;
}

export interface Notifications<T extends Notification = Notification> {
  readonly collection: T[];
}

export interface MutableNotificationsSupplier<T extends Notification> {
  notifications: Notifications<T>;
}

// deno-lint-ignore no-empty-interface
export interface NotificationsSupplier<T extends Notification = Notification>
  extends Readonly<MutableNotificationsSupplier<T>> {
}

export function isNotificationsSupplier<T extends Notification>(
  o: unknown,
): o is NotificationsSupplier<T> {
  const isType = safety.typeGuard<NotificationsSupplier<T>>("notifications");
  return isType(o);
}

/**
 * See if source is already a NotificationSupplier and, if it is, return
 * source.notifications. If it's not already a supplier, mutate source into a
 * supplier by giving it an empty collection and returning it.
 * @param source the instance to check
 * @param notFound the return value of this function will be assigned if source is not already a LightningNavigationNotificationSupplier
 * @param found the return value of this function will be assigned if source is already a LightningNavigationNotificationSupplier
 * @returns value of either found or notFound
 */
export function prepareNotifications<T extends Notification = Notification>(
  source: unknown,
  notFound: () => Notifications<T>,
  found?: (lnn: Notifications<T>) => Notifications<T>,
  assignmentFailed?: (diagnostic: string) => void,
): Notifications<T> {
  const result = isNotificationsSupplier<T>(source)
    ? (found ? found(source.notifications) : source.notifications)
    : ((source as MutableNotificationsSupplier<T>).notifications = notFound());
  if (assignmentFailed && !isNotificationsSupplier(source)) {
    assignmentFailed(
      "isNotificationsSupplier(source) is false in prepareNotifications(). This should never happen.",
    );
  }
  return result;
}

/**
 * Add notification to dest if it doesn't exist or increment count if it does
 * @param dest the instance to mutate
 * @param notification the notification to add
 * @returns dest
 */
export function mergeNotifications<T extends Notification = Notification>(
  notification: T,
  dest: Notifications<T>,
): Notifications<T> {
  const existing = dest.collection.find((n) =>
    n.identity == notification.identity
  );
  if (existing) {
    existing.count(existing.count() + notification.count());
  } else {
    dest.collection.push(notification);
  }
  return dest;
}

/**
 * See if dest is already a NotificationSupplier and, if it is, add source.notifications
 * collection items to it. If it's not already a supplier, mutate dest into a supplier
 * by giving it the source.
 * @param source the notifications to assign
 * @param dest the instance to mutate and turn into a LightningNavigationNotificationSupplier
 * @returns dest as LightningNavigationNotificationSupplier
 */
export function referenceNotifications<T extends Notification = Notification>(
  source: NotificationsSupplier<T>,
  dest: unknown,
): NotificationsSupplier<T> {
  if (isNotificationsSupplier(dest)) {
    for (const lnn of source.notifications.collection) {
      mergeNotifications(lnn, dest.notifications);
    }
  } else {
    (dest as MutableNotificationsSupplier<T>).notifications =
      source.notifications;
  }
  return dest as NotificationsSupplier<T>;
}
