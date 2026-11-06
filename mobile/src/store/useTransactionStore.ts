import { create } from "zustand";
import { bookingService } from "../services/booking.service";
import { TransactionResponse, TrangThaiGD } from "../types/booking.types";

export type TransactionFilterTab = "ALL" | TrangThaiGD;

interface TransactionState {
  transactions: TransactionResponse[];
  isLoading: boolean;
  error: string | null;
  activeTab: TransactionFilterTab;

  setActiveTab: (tab: TransactionFilterTab) => void;
  fetchTransactions: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: false,
  error: null,
  activeTab: "ALL",

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Gọi 100% API thật: GET /api/transactions/my-history
  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bookingService.getMyTransactions();
      set({ transactions: data || [], isLoading: false });
    } catch (err: any) {
      set({
        transactions: [],
        error:
          err.response?.data?.message ||
          err.message ||
          "Không thể tải lịch sử giao dịch",
        isLoading: false,
      });
    }
  },
}));
