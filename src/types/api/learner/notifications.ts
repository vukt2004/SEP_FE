import type { ApiResult } from "../common";
import type { PaginationResult } from "./gameplay";

export interface NotificationActor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface NotificationItem {
  id: string;
  notificationId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  actionUrl?: string | null;
  actor?: NotificationActor | null;
}

export type NotificationsListResult = ApiResult<PaginationResult<NotificationItem>>;
export type UnreadNotificationsResult = ApiResult<NotificationItem[]>;
export type UnreadCountResult = ApiResult<{ unreadCount: number }>;
export type MarkNotificationReadResult = ApiResult<unknown>;
