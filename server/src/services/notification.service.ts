import { Notification, type INotification } from "../models/Notification";
import { HttpError } from "../utils/errors";
import { pageMeta } from "../utils/http";

function present(item: INotification) {
  return {
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    body: item.body,
    link: item.link,
    read: item.read,
    createdAt: item.createdAt,
  };
}

export function notify(input: { userId: string; type: INotification["type"]; title: string; body?: string; link?: string }) {
  return Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    link: input.link ?? "",
    read: false,
  });
}

export async function listNotifications(userId: string, page: number, limit: number) {
  const filter = { userId };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { items: items.map(present), unread, ...pageMeta(page, limit, total) };
}

export async function unreadCount(userId: string) {
  const unread = await Notification.countDocuments({ userId, read: false });
  return { unread };
}

export async function markRead(userId: string, id: string) {
  const item = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
  if (!item) throw new HttpError(404, "NOT_FOUND", "Notification not found");
  return present(item);
}

export async function markAllRead(userId: string) {
  await Notification.updateMany({ userId, read: false }, { read: true });
}
