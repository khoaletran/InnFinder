import { create } from 'zustand';
import { useAuthStore } from '@/store/useAuthStore';
import type { ChatMessage, ChatResponse, SearchCriteria } from '@/types/chat.types';
import type { RoomSummaryResponse } from '@/types/room.types';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  criteria?: SearchCriteria;
  roomIds: string[];
}

const HISTORY_STORAGE_PREFIX = 'innfinder:chat-history:';
const MAX_STORED_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 40;

function getHistoryStorageKey(userId?: string): string {
  return `${HISTORY_STORAGE_PREFIX}${userId || 'guest'}`;
}

function loadSessions(userId?: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getHistoryStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ChatSession =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages),
      )
      .slice(0, MAX_STORED_SESSIONS);
  } catch {
    return [];
  }
}

function saveSessions(userId: string | undefined, sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      getHistoryStorageKey(userId),
      JSON.stringify(sessions.slice(0, MAX_STORED_SESSIONS)),
    );
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage hoặc đầy dung lượng
  }
}

function buildSessionTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Cuộc trò chuyện mới';
  return cleaned.length > 52 ? `${cleaned.slice(0, 52)}…` : cleaned;
}

function upsertSession(
  sessions: ChatSession[],
  sessionId: string,
  messages: ChatMessage[],
  criteria: SearchCriteria | undefined,
  roomIds: string[],
  fallbackTitle: string,
): ChatSession[] {
  const existing = sessions.find((s) => s.id === sessionId);
  const firstUserMsg = messages.find((m) => m.role === 'user')?.text;
  const updated: ChatSession = {
    id: sessionId,
    title: existing?.title || buildSessionTitle(firstUserMsg || fallbackTitle),
    updatedAt: Date.now(),
    messages,
    criteria,
    roomIds,
  };
  return [updated, ...sessions.filter((s) => s.id !== sessionId)].slice(0, MAX_STORED_SESSIONS);
}

interface ChatState {
  isOpen: boolean;
  activeSessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  criteria?: SearchCriteria;
  roomIds: string[];
  selectedRoom: RoomSummaryResponse | null;
  setOpen: (open: boolean) => void;
  selectRoom: (room: RoomSummaryResponse | null) => void;
  addUser: (text: string) => void;
  addResponse: (response: ChatResponse) => void;
  openSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearHistory: () => void;
  reset: () => void;
  syncAccount: (userId?: string) => void;
}

const initialUserId = useAuthStore.getState().user?.maNguoiDung;

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeSessionId: null,
  sessions: loadSessions(initialUserId),
  messages: [],
  roomIds: [],
  selectedRoom: null,
  setOpen: (isOpen) => set({ isOpen }),
  selectRoom: (selectedRoom) => set({ selectedRoom }),
  addUser: (text) =>
    set((state) => {
      const userId = useAuthStore.getState().user?.maNguoiDung;
      const sessionId = state.activeSessionId ?? crypto.randomUUID();
      const nextMessages = [
        ...state.messages,
        { id: crypto.randomUUID(), role: 'user' as const, text },
      ].slice(-MAX_MESSAGES_PER_SESSION);
      const nextSessions = upsertSession(
        state.sessions,
        sessionId,
        nextMessages,
        state.criteria,
        state.roomIds,
        text,
      );
      saveSessions(userId, nextSessions);
      return {
        activeSessionId: sessionId,
        sessions: nextSessions,
        messages: nextMessages,
      };
    }),
  addResponse: (response) =>
    set((state) => {
      const userId = useAuthStore.getState().user?.maNguoiDung;
      const sessionId = state.activeSessionId ?? crypto.randomUUID();
      const nextMessages = [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          text: response.message,
          rooms: response.rooms,
          suggestions: response.suggestions,
          searchMode: response.searchMode,
        },
      ].slice(-MAX_MESSAGES_PER_SESSION);
      const nextCriteria = response.criteria ?? state.criteria;
      const nextRoomIds =
        response.searchMode !== 'CONTEXT' || response.rooms.length
          ? response.rooms.map((r) => r.maPhongTro)
          : state.roomIds;
      const nextSelectedRoom =
        response.searchMode !== 'CONTEXT' ? null : state.selectedRoom;
      const nextSessions = upsertSession(
        state.sessions,
        sessionId,
        nextMessages,
        nextCriteria,
        nextRoomIds,
        response.message,
      );
      saveSessions(userId, nextSessions);
      return {
        activeSessionId: sessionId,
        sessions: nextSessions,
        messages: nextMessages,
        criteria: nextCriteria,
        roomIds: nextRoomIds,
        selectedRoom: nextSelectedRoom,
      };
    }),
  openSession: (sessionId) =>
    set((state) => {
      const target = state.sessions.find((s) => s.id === sessionId);
      if (!target) return state;
      return {
        activeSessionId: target.id,
        messages: target.messages,
        criteria: target.criteria,
        roomIds: target.roomIds,
        selectedRoom: null,
      };
    }),
  deleteSession: (sessionId) =>
    set((state) => {
      const userId = useAuthStore.getState().user?.maNguoiDung;
      const nextSessions = state.sessions.filter((s) => s.id !== sessionId);
      saveSessions(userId, nextSessions);
      if (state.activeSessionId === sessionId) {
        return {
          sessions: nextSessions,
          activeSessionId: null,
          messages: [],
          criteria: undefined,
          roomIds: [],
          selectedRoom: null,
        };
      }
      return { sessions: nextSessions };
    }),
  clearHistory: () =>
    set(() => {
      const userId = useAuthStore.getState().user?.maNguoiDung;
      saveSessions(userId, []);
      return {
        sessions: [],
        activeSessionId: null,
        messages: [],
        criteria: undefined,
        roomIds: [],
        selectedRoom: null,
      };
    }),
  reset: () =>
    set({
      activeSessionId: null,
      messages: [],
      criteria: undefined,
      roomIds: [],
      selectedRoom: null,
    }),
  syncAccount: (userId) =>
    set({
      isOpen: false,
      activeSessionId: null,
      sessions: loadSessions(userId),
      messages: [],
      criteria: undefined,
      roomIds: [],
      selectedRoom: null,
    }),
}));

const unsubscribeAuth = useAuthStore.subscribe((next, previous) => {
  if (next.user?.maNguoiDung !== previous.user?.maNguoiDung) {
    useChatStore.getState().syncAccount(next.user?.maNguoiDung);
  }
});
if (import.meta.hot) import.meta.hot.dispose(unsubscribeAuth);
