import { create } from 'zustand';
import {
  CreateRoomStep1Data,
  CreateRoomStep2Data,
  CreateRoomStep3Data,
  CreateRoomStep4Data,
  RoomImageItem,
} from '../types/landlord.types';

interface CreateRoomState {
  currentStep: number;
  step1: CreateRoomStep1Data;
  step2: CreateRoomStep2Data;
  step3: CreateRoomStep3Data;
  step4: CreateRoomStep4Data;
  images: RoomImageItem[];

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
  resetWizard: () => void;
}

const initialStep1: CreateRoomStep1Data = {
  tenPhong: '',
  maLPT: 'LPT001',
  giaThue: 3500000,
  cocPhong: 3500000,
  dienTich: 24,
  soNguoi: 2,
  diaChi: '',
};

const initialStep2: CreateRoomStep2Data = {
  diaChi: '',
  kinhDo: '10.8231',
  viDo: '106.6297',
};

const initialStep3: CreateRoomStep3Data = {
  tienIchIds: [],
};

const initialStep4: CreateRoomStep4Data = {
  moTa: '',
};

export const useCreateRoomStore = create<CreateRoomState>((set) => ({
  currentStep: 1,
  step1: initialStep1,
  step2: initialStep2,
  step3: initialStep3,
  step4: initialStep4,
  images: [],

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

  resetWizard: () =>
    set({
      currentStep: 1,
      step1: initialStep1,
      step2: initialStep2,
      step3: initialStep3,
      step4: initialStep4,
      images: [],
    }),
}));
