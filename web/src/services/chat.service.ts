import { axiosClient } from '@/api/axiosClient';
import { AI_REQUEST_TIMEOUT_MS } from '@/constants/ai';
import type { ChatRequest, ChatResponse } from '@/types/chat.types';

export const chatService = {
  send: (request: ChatRequest, signal: AbortSignal): Promise<ChatResponse> =>
    axiosClient.post<unknown, ChatResponse>('/api/chat', request, { signal, timeout: AI_REQUEST_TIMEOUT_MS }),
};
