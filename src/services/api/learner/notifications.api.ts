import { learnerAxios } from "@/services/http/axios.learner";
import type {
  MarkNotificationReadResult,
  NotificationsListResult,
  UnreadCountResult,
  UnreadNotificationsResult,
} from "@/types/api/learner/notifications";

export const learnerNotificationsApi = {
  getNotifications(params?: { pageNumber?: number; pageSize?: number }) {
    return learnerAxios.get<NotificationsListResult>("/api/learner/notifications", { params });
  },
  getUnreadNotifications() {
    return learnerAxios.get<UnreadNotificationsResult>("/api/learner/notifications/unread");
  },
  getUnreadCount() {
    return learnerAxios.get<UnreadCountResult>("/api/learner/notifications/unread-count");
  },
  markAsRead(notificationId: string) {
    return learnerAxios.post<MarkNotificationReadResult>(
      `/api/learner/notifications/${notificationId}/read`,
      undefined,
    );
  },
  markAllAsRead() {
    return learnerAxios.post<MarkNotificationReadResult>(
      "/api/learner/notifications/read-all",
      undefined,
    );
  },
};
