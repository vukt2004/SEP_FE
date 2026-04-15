import { learnerAxios } from "@/services/http/axios.learner";
import type {
  ConversationMessagesResult,
  ConversationsListResult,
  CreatePrivateConversationRequest,
  GetChatConversationsParams,
  GetChatMessagesParams,
  PrivateConversationResult,
  SendConversationMessageBody,
  SendConversationMessageResult,
} from "@/types/api/learner/chat";
import type { ApiResult } from "@/types/api/common";

export interface ChatUserItem {
  id: string;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarPath?: string | null;
  email?: string | null;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export const learnerChatApi = {
  getOrCreatePrivateConversation(otherUserId: string) {
    const body: CreatePrivateConversationRequest = { otherUserId };
    return learnerAxios.post<PrivateConversationResult>(
      "/api/learner/chat/conversations/private",
      body,
    );
  },

  getConversations(params?: GetChatConversationsParams) {
    return learnerAxios.get<ConversationsListResult>("/api/learner/chat/conversations", {
      params,
    });
  },

  getConversationMessages(conversationId: string, params?: GetChatMessagesParams) {
    return learnerAxios.get<ConversationMessagesResult>(
      `/api/learner/chat/conversations/${conversationId}/messages`,
      { params },
    );
  },

  sendConversationMessage(conversationId: string, body: SendConversationMessageBody) {
    const formData = new FormData();
    formData.append("ChatRoomId", conversationId);
    formData.append("Content", body.content ?? "");
    formData.append("MessageType", String(body.messageType ?? 0));

    if (body.replyToMessageId) {
      formData.append("ReplyToMessageId", body.replyToMessageId);
    }

    if (body.imageFile) {
      formData.append("ImageFile", body.imageFile);
    }

    return learnerAxios.post<SendConversationMessageResult>(
      `/api/learner/chat/conversations/${conversationId}/messages`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  deleteMessage(messageId: string) {
    return learnerAxios.delete<ApiResult<null>>(`/api/learner/chat/messages/${messageId}`);
  },

  getUsers(params?: { pageNumber?: number; pageSize?: number; searchTerm?: string }) {
    return learnerAxios.get<ApiResult<PagedResult<ChatUserItem>>>("/api/learner/chat/users", {
      params,
    });
  },
};
