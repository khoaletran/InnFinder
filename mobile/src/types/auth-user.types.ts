// 1. Phân quyền và Chế độ hoạt động
export type VaiTro = 'QUAN_TRI' | 'KHACH_HANG';
export type AppMode = 'TENANT' | 'LANDLORD' | 'ADMIN'; // Khách thuê | Chủ nhà | Quản trị

// 2. DTO Đăng ký (UC 2.1)
export interface RegisterRequest {
  tenDangNhap: string;
  hoVaTen?: string;
  matKhau: string;
  xacNhanMatKhau: string;
  email: string;
  sdt: string;
  cccd?: string;
  chuTro: boolean; 
}

// 3. DTO Đăng nhập
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

// 4. DTO Hồ sơ người dùng
export interface UserProfileResponse {
  maNguoiDung: string;
  tenDangNhap: string;
  hoVaTen?: string;
  email: string;
  sdt: string;
  cccd?: string;
  vaiTro: VaiTro;
  chuTro: boolean;
  avatarUrl?: string;
  thoiGianMoTaiKhoan: string;
}

export interface UpdateProfileRequest {
  hoVaTen?: string;
  email: string;
  sdt: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  matKhauCu: string;
  matKhauMoi: string;
  xacNhanMatKhauMoi: string;
}

// 5. DTO Tài khoản ngân hàng
export interface BankAccountResponse {
  soTaiKhoan: string;
  tenNganHang: string;
}

// 6. DTO Khiếu nại (UC 2.7)
export interface ComplaintRequestDTO {
  vanDe: string;
  doiTuongKhieuNaiId: string;
  phongTroId?: string;
  hinhAnh?: string;
}
