import type { ApiResult } from "../common";
import type { PaginationResult } from "./gameplay";

export type ChatRoomType = 0 | 1;
export type ChatMessageType = 0 | 1 | 2 | 3;

export interface ChatConversationMember {
  id: string;
  userId: string;
  userName: string;
  avatarPath?: string | null;
  joinedAt: string;
  leftAt?: string | null;
  lastReadAt?: string | null;
}

export interface ChatMessageReadBy {
  userId: string;
  userName?: string | null;
  avatarPath?: string | null;
  readAt: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  messageType: ChatMessageType;
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToMessageId?: string | null;
  replyToMessage?: ChatMessage | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  createdAt: string;
  readBy: ChatMessageReadBy[];
}

export interface ChatConversation {
  id: string;
  name?: string | null;
  roomType: ChatRoomType;
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  members: ChatConversationMember[];
  lastMessage?: ChatMessage | null;
  createdAt: string;
}

export interface CreatePrivateConversationRequest {
  otherUserId: string;
}

export interface GetChatConversationsParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  PageNumber?: number;
  PageSize?: number;
  SearchTerm?: string;
}

export interface GetChatMessagesParams {
  pageNumber?: number;
  pageSize?: number;
  beforeMessageId?: string;
  PageNumber?: number;
  PageSize?: number;
  BeforeMessageId?: string;
}

export interface SendConversationMessageRequest {
  content: string;
  messageType?: ChatMessageType;
  replyToMessageId?: string | null;
}

export interface SendConversationMessageBody {
  content: string;
  messageType?: ChatMessageType;
  replyToMessageId?: string | null;
  imageFile?: File | null;
}

export type PrivateConversationResult = ApiResult<ChatConversation>;
export type ConversationsListResult = ApiResult<PaginationResult<ChatConversation>>;
export type ConversationMessagesResult = ApiResult<PaginationResult<ChatMessage>>;
export type SendConversationMessageResult = ApiResult<ChatMessage>;
