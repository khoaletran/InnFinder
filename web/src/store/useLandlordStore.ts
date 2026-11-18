import { create } from 'zustand';
import type {
  LandlordDashboardStats,
  LandlordRoomItem,
  TrangThaiPhongTro,
} from '@/types/landlord.types';

export type LandlordRoomFilter = 'ALL' | TrangThaiPhongTro;

interface LandlordState {
  rooms: LandlordRoomItem[];
  stats: LandlordDashboardStats | null;
  filterStatus: LandlordRoomFilter;
  searchQuery: string;
  isLoading: boolean;

  setRooms: (rooms: LandlordRoomItem[]) => void;
  setStats: (stats: LandlordDashboardStats) => void;
  setFilterStatus: (status: LandlordRoomFilter) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  addRoom: (room: LandlordRoomItem) => void;
  updateRoom: (id: string, updated: Partial<LandlordRoomItem>) => void;
  removeRoom: (id: string) => void;
}

export const useLandlordStore = create<LandlordState>((set) => ({
  rooms: [],
  stats: null,
  filterStatus: 'ALL',
  searchQuery: '',
  isLoading: false,

  setRooms: (rooms) => set({ rooms }),
  setStats: (stats) => set({ stats }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),
  updateRoom: (id, updated) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    })),
  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== id),
    })),
}));
