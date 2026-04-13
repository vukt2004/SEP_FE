import type { ApiResult } from "../common";

export interface SendSystemAnnouncementRequest {
  title: string;
  body: string;
  actionUrl?: string;
  payloadJson?: string;
}

export interface SendSystemAnnouncementResponse {
  notificationId: string;
  recipientCount: number;
}

export type SendSystemAnnouncementResult = ApiResult<SendSystemAnnouncementResponse>;