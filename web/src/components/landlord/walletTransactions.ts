import type { LandlordTransactionItem } from '@/types/landlord.types';

export const TRANSACTION_TYPES: Record<string, string> = {
  COC_XEM_PHONG: 'Nộp cọc giữ chân', CONG_TIEN_COC: 'Nhận cọc thế chân',
  HOAN_COC: 'Hoàn cọc', HOAN_TIEN_RUT: 'Hoàn tiền rút thất bại',
  RUT_TIEN: 'Rút tiền', YEU_CAU_RUT_TIEN: 'Rút tiền', THU_HOA_HONG: 'Hoa hồng sàn',
};
export const TRANSACTION_STATUSES = {
  CHO_THANH_TOAN: 'Chờ đối soát', THANH_CONG: 'Thành công', THAT_BAI: 'Thất bại', HOAN_TIEN: 'Hoàn tiền',
} as const;

export function transactionDirection(transaction: LandlordTransactionItem): 'in' | 'out' | 'unknown' {
  if (['RUT_TIEN', 'YEU_CAU_RUT_TIEN', 'COC_XEM_PHONG', 'THU_HOA_HONG'].includes(transaction.loaiGiaoDich)) return 'out';
  if (['CONG_TIEN_COC', 'HOAN_COC', 'HOAN_TIEN_RUT'].includes(transaction.loaiGiaoDich)) return 'in';
  return 'unknown';
}

export function matchesTransactionType(transaction: LandlordTransactionItem, type: string) {
  if (!type) return true;
  if (type === 'COC') return ['COC_XEM_PHONG', 'CONG_TIEN_COC'].includes(transaction.loaiGiaoDich);
  if (type === 'FEE') return transaction.loaiGiaoDich === 'THU_HOA_HONG' || (transaction.phiHoaHong ?? 0) > 0;
  if (type === 'REFUND') return ['HOAN_COC', 'HOAN_TIEN_RUT'].includes(transaction.loaiGiaoDich) || transaction.trangThai === 'HOAN_TIEN';
  return ['RUT_TIEN', 'YEU_CAU_RUT_TIEN'].includes(transaction.loaiGiaoDich);
}
