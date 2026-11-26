import { axiosClient } from '@/api/axiosClient';
import type { BankLookupRequest, BankLookupResponse } from '@/types/bank.types';

export const bankService = {
  lookupAccount: (data: BankLookupRequest): Promise<BankLookupResponse> => {
    return axiosClient.post<unknown, BankLookupResponse>('/api/banks/lookup', data);
  },
};
