import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  CreateRoomStep1Data,
  CreateRoomStep2Data,
  CreateRoomStep3Data,
  CreateRoomStep4Data,
  RoomImageItem,
} from '../types/landlord.types';

const DRAFTS_STORAGE_KEY = 'innfinder_room_drafts';

export interface RoomDraftItem {
  id: string;
  updatedAt: string;
  currentStep: number;
  step1: CreateRoomStep1Data;
  step2: CreateRoomStep2Data;
  step3: CreateRoomStep3Data;
  step4: CreateRoomStep4Data;
  images: RoomImageItem[];
  tour360Id: string | null;
}

export interface DraftSnapshotInput {
  currentStep?: number;
  step1?: Partial<CreateRoomStep1Data>;
  step2?: Partial<CreateRoomStep2Data>;
  step3?: Partial<CreateRoomStep3Data>;
  step4?: Partial<CreateRoomStep4Data>;
  images?: RoomImageItem[];
  tour360Id?: string | null;
}

interface CreateRoomState {
  currentStep: number;
  step1: CreateRoomStep1Data;
  step2: CreateRoomStep2Data;
  step3: CreateRoomStep3Data;
  step4: CreateRoomStep4Data;
  images: RoomImageItem[];
  tour360Id: string | null;

  activeDraftId: string | null;
  drafts: RoomDraftItem[];
  draftsLoaded: boolean;

  // Actions
  setStep: (step: number) => void;
  updateStep1: (data: Partial<CreateRoomStep1Data>) => void;
  updateStep2: (data: Partial<CreateRoomStep2Data>) => void;
  updateStep3: (data: Partial<CreateRoomStep3Data>) => void;
  updateStep4: (data: Partial<CreateRoomStep4Data>) => void;
  setImages: (images: RoomImageItem[]) => void;
  addImage: (uri: string) => void;
  removeImage: (index: number) => void;
  setCoverImage: (index: number) => void;
  setTour360Id: (id: string | null) => void;
  resetWizard: () => void;

  // Draft actions
  loadDrafts: () => Promise<void>;
  saveDraft: (snapshot?: DraftSnapshotInput) => Promise<RoomDraftItem>;
  loadDraftIntoWizard: (draftId: string) => boolean;
  deleteDraft: (draftId: string) => Promise<void>;
}

const initialStep1: CreateRoomStep1Data = {
  tenPhong: '',
  maLPT: 'LPT002',
  giaThue: 3500000,
  cocPhong: 3500000,
  giaDien: 0,
  giaNuoc: { gia: 0, theoNguoi: false },
  dienTich: 24,
  soNguoi: 2,
  diaChi: '',
};

const initialStep2: CreateRoomStep2Data = {
  diaChi: '',
  kinhDo: '106.6874',
  viDo: '10.8231',
};

const initialStep3: CreateRoomStep3Data = {
  tienIchIds: ['TI0001', 'TI0002'],
};

const initialStep4: CreateRoomStep4Data = {
  moTa: '',
};

async function persistDrafts(drafts: RoomDraftItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.warn('Lỗi lưu danh sách bản nháp vào AsyncStorage:', err);
  }
}

export const useCreateRoomStore = create<CreateRoomState>((set, get) => ({
  currentStep: 1,
  step1: initialStep1,
  step2: initialStep2,
  step3: initialStep3,
  step4: initialStep4,
  images: [],
  tour360Id: null,

  activeDraftId: null,
  drafts: [],
  draftsLoaded: false,

  setStep: (step) => set({ currentStep: step }),

  updateStep1: (data) =>
    set((state) => ({ step1: { ...state.step1, ...data } })),

  updateStep2: (data) =>
    set((state) => ({ step2: { ...state.step2, ...data } })),

  updateStep3: (data) =>
    set((state) => ({ step3: { ...state.step3, ...data } })),

  updateStep4: (data) =>
    set((state) => ({ step4: { ...state.step4, ...data } })),

  setImages: (images) => set({ images }),

  addImage: (uri) =>
    set((state) => {
      const isFirst = state.images.length === 0;
      return {
        images: [...state.images, { uri, isCover: isFirst }],
      };
    }),

  removeImage: (index) =>
    set((state) => {
      const updated = state.images.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isCover)) {
        updated[0].isCover = true;
      }
      return { images: updated };
    }),

  setCoverImage: (index) =>
    set((state) => ({
      images: state.images.map((img, i) => ({
        ...img,
        isCover: i === index,
      })),
    })),

  setTour360Id: (id) => set({ tour360Id: id }),

  resetWizard: () =>
    set({
      currentStep: 1,
      step1: initialStep1,
      step2: initialStep2,
      step3: initialStep3,
      step4: initialStep4,
      images: [],
      tour360Id: null,
      activeDraftId: null,
    }),

  loadDrafts: async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (!raw) {
        set({ drafts: [], draftsLoaded: true });
        return;
      }
      const parsed: RoomDraftItem[] = JSON.parse(raw);
      const list = Array.isArray(parsed)
        ? [...parsed].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        : [];
      set({ drafts: list, draftsLoaded: true });
    } catch (err) {
      console.warn('Lỗi đọc bản nháp phòng trọ:', err);
      set({ draftsLoaded: true });
    }
  },

  saveDraft: async (snapshot) => {
    const state = get();
    if (!state.draftsLoaded) {
      await get().loadDrafts();
    }
    const latest = get();
    const draftId = latest.activeDraftId || `DRAFT_${Date.now()}`;
    const mergedStep1: CreateRoomStep1Data = {
      ...latest.step1,
      ...snapshot?.step1,
    };
    const mergedStep2: CreateRoomStep2Data = {
      ...latest.step2,
      ...snapshot?.step2,
    };
    const mergedStep3: CreateRoomStep3Data = {
      ...latest.step3,
      ...snapshot?.step3,
    };
    const mergedStep4: CreateRoomStep4Data = {
      ...latest.step4,
      ...snapshot?.step4,
    };

    const draft: RoomDraftItem = {
      id: draftId,
      updatedAt: new Date().toISOString(),
      currentStep: snapshot?.currentStep ?? latest.currentStep,
      step1: mergedStep1,
      step2: mergedStep2,
      step3: mergedStep3,
      step4: mergedStep4,
      images: snapshot?.images ?? latest.images,
      tour360Id: snapshot?.tour360Id !== undefined ? snapshot.tour360Id : latest.tour360Id,
    };

    const nextDrafts = [draft, ...latest.drafts.filter((d) => d.id !== draftId)];
    set({
      activeDraftId: draftId,
      drafts: nextDrafts,
      draftsLoaded: true,
      currentStep: draft.currentStep,
      step1: draft.step1,
      step2: draft.step2,
      step3: draft.step3,
      step4: draft.step4,
      images: draft.images,
      tour360Id: draft.tour360Id,
    });
    await persistDrafts(nextDrafts);
    return draft;
  },

  loadDraftIntoWizard: (draftId) => {
    const found = get().drafts.find((d) => d.id === draftId);
    if (!found) return false;
    set({
      activeDraftId: found.id,
      currentStep: found.currentStep || 1,
      step1: { ...initialStep1, ...found.step1 },
      step2: { ...initialStep2, ...found.step2 },
      step3: { ...initialStep3, ...found.step3 },
      step4: { ...initialStep4, ...found.step4 },
      images: found.images || [],
      tour360Id: found.tour360Id ?? null,
    });
    return true;
  },

  deleteDraft: async (draftId) => {
    const state = get();
    const nextDrafts = state.drafts.filter((d) => d.id !== draftId);
    set({
      drafts: nextDrafts,
      activeDraftId: state.activeDraftId === draftId ? null : state.activeDraftId,
    });
    await persistDrafts(nextDrafts);
  },
}));
