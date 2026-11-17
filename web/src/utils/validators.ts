import { z } from 'zod';

export const REGEX_PATTERNS = {
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  PHONE: /^(?:(?:\+84)|0)(?:3|5|7|8|9)\d{8}$/,
  CCCD: /^\d{12}$/,
  ROOM_CODE: /^PT\d{12}$/,
  USER_CODE: /^ND\d{8}\d{4}$/,
};

export const loginSchema = z.object({
  tenDangNhap: z.string().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  matKhau: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z.object({
  tenDangNhap: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, chữ số và dấu gạch dưới'),
  hoVaTen: z.string().min(2, 'Họ và tên ít nhất 2 ký tự').max(100, 'Họ và tên tối đa 100 ký tự'),
  email: z.string().regex(REGEX_PATTERNS.EMAIL, 'Email không đúng định dạng chuẩn RFC 5322'),
  sdt: z.string().regex(REGEX_PATTERNS.PHONE, 'Số điện thoại không hợp lệ (đầu số 03, 05, 07, 08, 09 gồm 10 số hoặc +84)'),
  matKhau: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự'),
  xacNhanMatKhau: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  chuTro: z.boolean().default(false),
  // Điều kiện nếu chuTro = true
  cccd: z.string().optional(),
  anhCccdTruoc: z.string().optional(),
  anhCccdSau: z.string().optional(),
  tenNganHang: z.string().optional(),
  soTaiKhoan: z.string().optional(),
  tenChuTaiKhoan: z.string().optional(),
}).refine((data) => data.matKhau === data.xacNhanMatKhau, {
  message: 'Mật khẩu xác nhận không trùng khớp',
  path: ['xacNhanMatKhau'],
}).refine((data) => {
  if (data.chuTro) {
    return !!data.cccd && REGEX_PATTERNS.CCCD.test(data.cccd);
  }
  return true;
}, {
  message: 'Căn cước công dân phải gồm đúng 12 chữ số',
  path: ['cccd'],
}).refine((data) => {
  if (data.chuTro) {
    return !!data.tenNganHang && !!data.soTaiKhoan && !!data.tenChuTaiKhoan;
  }
  return true;
}, {
  message: 'Vui lòng điền đầy đủ thông tin tài khoản ngân hàng để nhận thanh toán',
  path: ['soTaiKhoan'],
});

export const changePasswordSchema = z.object({
  matKhauCu: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  matKhauMoi: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
  xacNhanMatKhauMoi: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
}).refine((data) => data.matKhauMoi === data.xacNhanMatKhauMoi, {
  message: 'Mật khẩu xác nhận không trùng khớp',
  path: ['xacNhanMatKhauMoi'],
});
