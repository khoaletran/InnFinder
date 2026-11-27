import { axiosClient } from '@/api/axiosClient';

export type ChatChannelType = 'BOOKING' | 'ROOMMATE';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
}

export interface ChatThread {
  channelId: string;
  contextType: ChatChannelType;
  contextId: string;
  title: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerRoleLabel: string;
  messages: ChatMessage[];
}

export interface ChatConversationSummary {
  channelId: string;
  contextType: ChatChannelType;
  contextId: string;
  title: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerRoleLabel: string;
  lastMessage: string | null;
  lastSenderName: string | null;
  updatedAt: string | null;
  updatedAtMs: number;
}

const chatUrl = (channelType: ChatChannelType, contextId: string) =>
  `/api/chats/${channelType}/${encodeURIComponent(contextId)}/messages`;

export const directChatService = {
  getConversations: (scope: 'ALL' | 'CUSTOMER' | 'LANDLORD' = 'ALL') =>
    axiosClient.get<unknown, ChatConversationSummary[]>('/api/chats/conversations', {
      params: { scope },
    }),

  getThread: (channelType: ChatChannelType, contextId: string) =>
    axiosClient.get<unknown, ChatThread>(chatUrl(channelType, contextId)),

  sendMessage: (channelType: ChatChannelType, contextId: string, content: string) =>
    axiosClient.post<unknown, ChatMessage>(chatUrl(channelType, contextId), { content }),
};
