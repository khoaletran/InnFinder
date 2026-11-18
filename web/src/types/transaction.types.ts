// Khớp 100% Enum TrangThaiGD trong AGENTS.md Mục 4
export type TrangThaiGD = 'CHO_THANH_TOAN' | 'THANH_CONG' | 'THAT_BAI' | 'HOAN_TIEN';

export interface TransactionResponse {
  maGiaoDich: string;
  soTien: number;
  loaiGiaoDich: string;
  noiDung: string;
  ngayGiaoDich: string;
  trangThai: TrangThaiGD;
}

export interface WithdrawRequestDTO {
  soTien: number;
  soTaiKhoan: string;
  tenNganHang: string;
  tenChuTaiKhoan?: string;
}
