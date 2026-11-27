import type { InfiniteData, QueryClient } from '@tanstack/react-query';
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
  nextCursor: string | null;
  hasMore: boolean;
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

export interface ChatConversationPage {
  items: ChatConversationSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatSsePayload {
  channelId: string;
  contextType: ChatChannelType;
  contextId: string;
  updatedAt: string;
  updatedAtMs: number;
  message: ChatMessage;
}

const chatUrl = (channelType: ChatChannelType, contextId: string) =>
  `/api/chats/${channelType}/${encodeURIComponent(contextId)}/messages`;

export const directChatService = {
  getConversations: (
    scope: 'ALL' | 'CUSTOMER' | 'LANDLORD' = 'ALL',
    limit = 10,
    cursor?: string,
  ) =>
    axiosClient.get<unknown, ChatConversationPage>('/api/chats/conversations', {
      params: { scope, limit, ...(cursor ? { cursor } : {}) },
    }),

  getThread: (
    channelType: ChatChannelType,
    contextId: string,
    limit = 10,
    beforeId?: string,
  ) =>
    axiosClient.get<unknown, ChatThread>(chatUrl(channelType, contextId), {
      params: { limit, ...(beforeId ? { beforeId } : {}) },
    }),

  sendMessage: (channelType: ChatChannelType, contextId: string, content: string) =>
    axiosClient.post<unknown, ChatMessage>(chatUrl(channelType, contextId), { content }),
};

function mergeMessageIntoThread(
  thread: ChatThread,
  incoming: ChatMessage,
  tempId?: string,
): ChatThread {
  const withoutTemp = tempId
    ? thread.messages.filter((m) => m.id !== tempId)
    : thread.messages;

  if (withoutTemp.some((m) => m.id === incoming.id)) {
    return { ...thread, messages: withoutTemp };
  }

  // Nếu SSE đẩy về trước khi API sendMessage hoàn tất, thay thế tin tạm tương ứng
  const matchedTempIdx = withoutTemp.findIndex(
    (m) =>
      m.id.startsWith('temp-') &&
      m.senderId === incoming.senderId &&
      m.content === incoming.content,
  );
  if (matchedTempIdx >= 0) {
    const next = [...withoutTemp];
    next[matchedTempIdx] = incoming;
    return { ...thread, messages: next };
  }

  return { ...thread, messages: [...withoutTemp, incoming] };
}

export function appendOptimisticChatMessage(
  queryClient: QueryClient,
  channelType: ChatChannelType,
  contextId: string,
  optimistic: ChatMessage,
): InfiniteData<ChatThread> | undefined {
  const queryKey = ['chat', channelType, contextId];
  const previous = queryClient.getQueryData<InfiniteData<ChatThread>>(queryKey);
  if (previous && previous.pages.length > 0) {
    const [firstPage, ...rest] = previous.pages;
    queryClient.setQueryData<InfiniteData<ChatThread>>(queryKey, {
      ...previous,
      pages: [
        {
          ...firstPage,
          messages: [...firstPage.messages, optimistic],
        },
        ...rest,
      ],
    });
  }
  return previous;
}

export function reconcileSavedChatMessage(
  queryClient: QueryClient,
  channelType: ChatChannelType,
  contextId: string,
  saved: ChatMessage,
  tempId: string,
): void {
  const queryKey = ['chat', channelType, contextId];
  queryClient.setQueryData<InfiniteData<ChatThread>>(queryKey, (old) => {
    if (!old || old.pages.length === 0) return old;
    const [firstPage, ...rest] = old.pages;
    return {
      ...old,
      pages: [mergeMessageIntoThread(firstPage, saved, tempId), ...rest],
    };
  });
}

export function applySseChatMessage(
  queryClient: QueryClient,
  payload: ChatSsePayload,
): void {
  if (!payload?.message || !payload.channelId) return;

  const threadQueries = queryClient.getQueriesData<InfiniteData<ChatThread>>({ queryKey: ['chat'] });
  for (const [key, data] of threadQueries) {
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) continue;
    const firstPage = data.pages[0];
    if (!firstPage || !Array.isArray(firstPage.messages)) continue;
    const sameChannel =
      firstPage.channelId === payload.channelId ||
      (key[1] === payload.contextType && key[2] === payload.contextId);
    if (sameChannel) {
      const [, ...rest] = data.pages;
      queryClient.setQueryData<InfiniteData<ChatThread>>(key, {
        ...data,
        pages: [mergeMessageIntoThread(firstPage, payload.message), ...rest],
      });
    }
  }

  let foundInConversations = false;
  const convQueries = queryClient.getQueriesData<InfiniteData<ChatConversationPage>>({
    queryKey: ['chat', 'conversations'],
  });
  for (const [key, data] of convQueries) {
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) continue;
    let matched: ChatConversationSummary | null = null;
    for (const page of data.pages) {
      const hit = page.items.find((c) => c.channelId === payload.channelId);
      if (hit) {
        matched = hit;
        break;
      }
    }
    if (matched) {
      foundInConversations = true;
      const updatedItem: ChatConversationSummary = {
        ...matched,
        lastMessage: payload.message.content,
        lastSenderName: payload.message.senderName,
        updatedAt: payload.updatedAt || payload.message.createdAt,
        updatedAtMs: payload.updatedAtMs || Date.now(),
      };
      const [firstPage, ...rest] = data.pages;
      const nextPages: ChatConversationPage[] = [
        {
          ...firstPage,
          items: [
            updatedItem,
            ...firstPage.items.filter((c) => c.channelId !== payload.channelId),
          ],
        },
        ...rest.map((p) => ({
          ...p,
          items: p.items.filter((c) => c.channelId !== payload.channelId),
        })),
      ];
      queryClient.setQueryData<InfiniteData<ChatConversationPage>>(key, {
        ...data,
        pages: nextPages,
      });
    }
  }

  if (!foundInConversations) {
    void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }
}
