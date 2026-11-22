import { create } from 'zustand';
import { useAuthStore } from '@/store/useAuthStore';
import type { ChatMessage, ChatResponse, SearchCriteria } from '@/types/chat.types';
import type { RoomSummaryResponse } from '@/types/room.types';

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  criteria?: SearchCriteria;
  roomIds: string[];
  selectedRoom: RoomSummaryResponse | null;
  setOpen: (open: boolean) => void;
  selectRoom: (room: RoomSummaryResponse | null) => void;
  addUser: (text: string) => void;
  addResponse: (response: ChatResponse) => void;
  reset: () => void;
}

// Intentionally kept in memory: conversations are not written to localStorage or shared across accounts.
export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  roomIds: [],
  selectedRoom: null,
  setOpen: (isOpen) => set({ isOpen }),
  selectRoom: (selectedRoom) => set({ selectedRoom }),
  addUser: (text) => set((state) => ({
    messages: [...state.messages, { id: crypto.randomUUID(), role: 'user' as const, text }].slice(-40),
  })),
  addResponse: (response) => set((state) => ({
    messages: [...state.messages, {
      id: crypto.randomUUID(), role: 'assistant' as const, text: response.message,
      rooms: response.rooms, suggestions: response.suggestions, searchMode: response.searchMode,
    }].slice(-40),
    criteria: response.criteria ?? state.criteria,
    roomIds: response.searchMode !== 'CONTEXT' || response.rooms.length
      ? response.rooms.map((r) => r.maPhongTro) : state.roomIds,
    selectedRoom: response.searchMode !== 'CONTEXT' ? null : state.selectedRoom,
  })),
  reset: () => set({ messages: [], criteria: undefined, roomIds: [], selectedRoom: null }),
}));

// Also clear when logout/account changes on a page where the widget is not mounted.
const unsubscribeAuth = useAuthStore.subscribe((next, previous) => {
  if (next.user?.maNguoiDung !== previous.user?.maNguoiDung) {
    useChatStore.getState().reset();
    useChatStore.getState().setOpen(false);
  }
});
if (import.meta.hot) import.meta.hot.dispose(unsubscribeAuth);
