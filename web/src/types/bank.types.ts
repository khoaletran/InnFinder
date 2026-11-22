export interface BankLookupRequest {
  bin: string;
  soTaiKhoan: string;
}

export interface BankLookupResponse {
  bin: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  hopLe: boolean;
  thongBao: string;
}
