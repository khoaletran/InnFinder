export type VaiTro = 'QUAN_TRI' | 'KHACH_HANG';

export type TrangThaiKhieuNai = 'CHO_DUYET' | 'DANG_XU_LY' | 'DA_XU_LI';

export type MucDoViPham = 'NHE' | 'TRUNG_BINH' | 'NANG';

export type TrangThaiYeuCauChuTro = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

export interface RegisterRequest {
  tenDangNhap: string;
  hoVaTen?: string;
  matKhau: string;
  xacNhanMatKhau: string;
  email: string;
  sdt: string;
  cccd?: string;
  chuTro: boolean;
  anhCccdTruoc?: string;
  anhCccdSau?: string;
  tenNganHang?: string;
  soTaiKhoan?: string;
  tenChuTaiKhoan?: string;
}

export interface LoginRequest {
  tenDangNhap: string;
  matKhau: string;
}

export interface AuthResponse {
  token: string;
  maNguoiDung: string;
  tenDangNhap: string;
  vaiTro: VaiTro;
  chuTro: boolean;
}

export interface UserProfileResponse {
  maNguoiDung: string;
  tenDangNhap: string;
  hoVaTen?: string;
  email: string;
  sdt: string;
  cccd?: string;
  vaiTro: VaiTro;
  chuTro: boolean;
  hinhDaiDien?: string;
  avatarUrl?: string;
  thoiGianMoTaiKhoan: string;
}

export interface UpdateProfileRequest {
  hoVaTen?: string;
  email: string;
  sdt: string;
  hinhDaiDien?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  matKhauCu: string;
  matKhauMoi: string;
  xacNhanMatKhauMoi: string;
}

export interface BankAccountResponse {
  id?: number;
  soTaiKhoan: string;
  tenNganHang: string;
  tenChuTaiKhoan?: string;
}

export interface UpgradeLandlordRequest {
  cccd: string;
  anhCccdTruoc: string;
  anhCccdSau: string;
  tenNganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
}

export interface ComplaintRequestDTO {
  doiTuongKhieuNai: string;
  vanDe: string;
  hinhAnh?: string;
  mucDoUuTien?: number;
}

export interface ComplaintResponseDTO {
  id?: string | number;
  maKhieuNai: string;
  maNguoiGui?: string;
  tenNguoiGui?: string;
  doiTuongKhieuNai: string;
  tenDoiTuong?: string;
  vanDe: string;
  hinhAnh?: string;
  trangThai: TrangThaiKhieuNai;
  ketQua?: string;
  ketLuan?: string;
  mucDoViPham?: MucDoViPham;
  ngayGui?: string;
  createdAt?: string;
  ngayTao?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: 'SYSTEM' | 'APPOINTMENT' | 'TRANSACTION' | 'COMPLAINT' | 'POST';
  createdAt: string;
  read: boolean;
  linkUrl?: string;
}
