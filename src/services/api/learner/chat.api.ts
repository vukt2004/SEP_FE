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
    return learnerAxios.post<SendConversationMessageResult>(
      `/api/learner/chat/conversations/${conversationId}/messages`,
      body,
    );
  },
};
