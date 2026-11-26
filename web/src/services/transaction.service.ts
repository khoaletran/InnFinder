import { axiosClient } from '@/api/axiosClient';
import type { LandlordWalletInfo } from '@/types/landlord.types';
import type { TransactionResponse, WithdrawRequestDTO } from '@/types/transaction.types';

export const transactionService = {
  getMyTransactions: async (): Promise<TransactionResponse[]> => {
    return axiosClient.get<unknown, TransactionResponse[]>('/api/transactions/my-history');
  },

  getLandlordWallet: async (): Promise<LandlordWalletInfo> => {
    return axiosClient.get<unknown, LandlordWalletInfo>('/api/landlord/wallet');
  },

  requestWithdraw: async (payload: WithdrawRequestDTO): Promise<TransactionResponse> => {
    return axiosClient.post<unknown, TransactionResponse>('/api/landlord/wallet/withdraw', payload);
  },

  retryRefund: async (
    maGiaoDich: string,
    payload: { tenNganHang: string; soTaiKhoan: string; tenChuTaiKhoan?: string },
  ): Promise<TransactionResponse> => {
    return axiosClient.patch<unknown, TransactionResponse>(
      `/api/transactions/${maGiaoDich}/retry-refund`,
      payload,
    );
  },
};

export default transactionService;
