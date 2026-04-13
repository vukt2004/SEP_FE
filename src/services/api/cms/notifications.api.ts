import { cmsAxios } from "@/services/http/axios.cms";
import type {
  SendSystemAnnouncementRequest,
  SendSystemAnnouncementResult,
} from "@/types/api/cms/notifications";

export const cmsNotificationsApi = {
  sendSystemAnnouncement(payload: SendSystemAnnouncementRequest) {
    return cmsAxios.post<SendSystemAnnouncementResult>(
      "/api/cms/notifications/system-announcement",
      payload,
    );
  },
};