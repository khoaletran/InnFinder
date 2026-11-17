export type VaiTro = 'QUAN_TRI' | 'KHACH_HANG';

export interface RegisterRequest {
  tenDangNhap: string;
  hoVaTen?: string;
  matKhau: string;
  xacNhanMatKhau: string;
  email: string;
  sdt: string;
  cccd?: string;
  chuTro: boolean;
  // Thông tin chủ trọ đính kèm nếu đăng ký làm chủ trọ
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
  maNguoiGui?: string;
  doiTuongKhieuNai: string;
  vanDe: string;
  hinhAnh?: string;
  mucDoUuTien?: number;
  phongLienQuanId?: string;
}

export interface ComplaintResponseDTO {
  id: string | number;
  maKhieuNai?: string;
  maNguoiGui: string;
  tenNguoiGui?: string;
  doiTuongKhieuNai: string;
  tenDoiTuong?: string;
  vanDe: string;
  hinhAnh?: string;
  trangThai: 'CHO_DUYET' | 'CHO_XU_LY' | 'DANG_XU_LY' | 'DA_XU_LI' | 'DA_XU_LY' | 'TU_CHOI';
  ketLuan?: string;
  mucDoViPham?: 'NHE' | 'TRUNG_BINH' | 'NANG';
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
