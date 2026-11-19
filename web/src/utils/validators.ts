import { z } from 'zod';

// Đồng bộ 100% Regex đặc tả tại AGENTS.md Mục 3 & Mục 6.3.5
export const REGEX_PATTERNS = {
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  PHONE: /^(?:(?:03|05|07|08|09)\d{8}|\+84\d{9})$/,
  CCCD: /^\d{12}$/,
  BANK_ACCOUNT: /^\d{6,20}$/,
  BANK_NAME: /^[\p{L}\s]+$/u,
  ROOM_CODE: /^PT\d{12}$/,
  USER_CODE: /^ND\d{8}\d{4}$/,
  ROOM_TYPE_CODE: /^LPT\d{3}$/,
  AMENITY_CODE: /^TI\d{4}$/,
  COC_CODE: /^COC\d{3,}$/,
  PHI_THU_CODE: /^PT\d{3,}$/,
};

export const loginSchema = z.object({
  tenDangNhap: z.string().min(3, 'Tên đăng nhập hoặc Email tối thiểu 3 ký tự'),
  matKhau: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự'),
});

export const registerSchema = z
  .object({
    tenDangNhap: z
      .string()
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
      .max(50, 'Tên đăng nhập tối đa 50 ký tự')
      .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, chữ số và dấu gạch dưới'),
    hoVaTen: z
      .string()
      .min(2, 'Họ và tên ít nhất 2 ký tự')
      .max(100, 'Họ và tên tối đa 100 ký tự'),
    email: z.string().regex(REGEX_PATTERNS.EMAIL, 'Email không đúng định dạng chuẩn RFC 5322'),
    sdt: z
      .string()
      .regex(
        REGEX_PATTERNS.PHONE,
        'Số điện thoại không hợp lệ (đầu số 03, 05, 07, 08, 09 gồm 10 số hoặc +84 gồm 9 số)',
      ),
    matKhau: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự'),
    xacNhanMatKhau: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    chuTro: z.boolean().default(false),
    cccd: z.string().optional(),
    anhCccdTruoc: z.string().optional(),
    anhCccdSau: z.string().optional(),
    tenNganHang: z.string().optional(),
    soTaiKhoan: z.string().optional(),
    tenChuTaiKhoan: z.string().optional(),
  })
  .refine((data) => data.matKhau === data.xacNhanMatKhau, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['xacNhanMatKhau'],
  })
  .refine((data) => !data.chuTro || (!!data.cccd && REGEX_PATTERNS.CCCD.test(data.cccd)), {
    message: 'Căn cước công dân phải gồm đúng 12 chữ số',
    path: ['cccd'],
  })
  .refine(
    (data) =>
      !data.chuTro ||
      (!!data.soTaiKhoan && REGEX_PATTERNS.BANK_ACCOUNT.test(data.soTaiKhoan.trim())),
    {
      message: 'Số tài khoản ngân hàng phải từ 6 đến 20 chữ số',
      path: ['soTaiKhoan'],
    },
  )
  .refine(
    (data) =>
      !data.chuTro ||
      (!!data.tenNganHang &&
        REGEX_PATTERNS.BANK_NAME.test(data.tenNganHang.trim()) &&
        !!data.tenChuTaiKhoan?.trim()),
    {
      message: 'Tên ngân hàng chỉ chứa chữ cái/khoảng trắng và phải nhập tên chủ tài khoản',
      path: ['tenNganHang'],
    },
  )
  .refine((data) => !data.chuTro || (!!data.anhCccdTruoc && !!data.anhCccdSau), {
    message: 'Vui lòng tải lên đầy đủ ảnh mặt trước và mặt sau CCCD',
    path: ['anhCccdTruoc'],
  });

export const profileUpdateSchema = z.object({
  hoVaTen: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự').max(100, 'Tối đa 100 ký tự'),
  email: z.string().regex(REGEX_PATTERNS.EMAIL, 'Email không đúng định dạng chuẩn RFC 5322'),
  sdt: z
    .string()
    .regex(
      REGEX_PATTERNS.PHONE,
      'Số điện thoại Việt Nam không hợp lệ (03/05/07/08/09 + 8 số hoặc +84 + 9 số)',
    ),
});

export const bankAccountSchema = z.object({
  soTaiKhoan: z
    .string()
    .regex(REGEX_PATTERNS.BANK_ACCOUNT, 'Số tài khoản phải gồm từ 6 đến 20 chữ số'),
  tenNganHang: z
    .string()
    .min(2, 'Vui lòng chọn hoặc nhập tên ngân hàng')
    .regex(REGEX_PATTERNS.BANK_NAME, 'Tên ngân hàng chỉ chứa chữ cái và khoảng trắng'),
  tenChuTaiKhoan: z.string().max(100).optional(),
});

export const upgradeLandlordSchema = z.object({
  cccd: z.string().regex(REGEX_PATTERNS.CCCD, 'Số CCCD phải gồm đúng 12 chữ số'),
  anhCccdTruoc: z.string().min(1, 'Vui lòng tải lên ảnh mặt trước CCCD'),
  anhCccdSau: z.string().min(1, 'Vui lòng tải lên ảnh mặt sau CCCD'),
  tenNganHang: z
    .string()
    .min(2, 'Vui lòng chọn ngân hàng')
    .regex(REGEX_PATTERNS.BANK_NAME, 'Tên ngân hàng chỉ chứa chữ cái và khoảng trắng'),
  soTaiKhoan: z
    .string()
    .regex(REGEX_PATTERNS.BANK_ACCOUNT, 'Số tài khoản ngân hàng phải từ 6 đến 20 chữ số'),
  tenChuTaiKhoan: z.string().min(2, 'Vui lòng nhập họ tên chủ tài khoản khớp CCCD'),
});

export const changePasswordSchema = z
  .object({
    matKhauCu: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    matKhauMoi: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    xacNhanMatKhauMoi: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
  })
  .refine((data) => data.matKhauMoi === data.xacNhanMatKhauMoi, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['xacNhanMatKhauMoi'],
  });

export const complaintSchema = z.object({
  doiTuongKhieuNai: z.string().min(2, 'Vui lòng nhập mã hoặc tên đối tượng bị phản ánh'),
  vanDe: z.string().min(15, 'Nội dung phản ánh phải có ít nhất 15 ký tự mô tả chi tiết'),
  hinhAnh: z.string().optional(),
  mucDoUuTien: z.number().min(1).max(3).default(2),
});

export const scheduleBookingSchema = z.object({
  maPhongTro: z.string().min(1, 'Thiếu mã phòng trọ cần đặt lịch'),
  ngayHen: z.string().refine((val) => {
    const dt = new Date(val);
    return !isNaN(dt.getTime()) && dt.getTime() >= Date.now() - 60_000;
  }, 'Thời gian hẹn xem phòng phải từ thời điểm hiện tại trở đi'),
  sdtLienHe: z
    .string()
    .regex(REGEX_PATTERNS.PHONE, 'Số điện thoại liên hệ không hợp lệ (03/05/07/08/09 hoặc +84)'),
  ghiChu: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

export const reviewSchema = z.object({
  diem: z.number().int().min(1, 'Vui lòng chọn từ 1 đến 5 sao').max(5, 'Tối đa 5 sao'),
  noiDung: z.string().min(10, 'Nhận xét tối thiểu 10 ký tự').max(1000, 'Tối đa 1000 ký tự'),
});

export const withdrawSchema = (maxBalance: number) =>
  z.object({
    soTien: z
      .number()
      .positive('Số tiền rút phải lớn hơn 0')
      .min(50_000, 'Hạn mức rút tối thiểu 50.000 ₫')
      .max(maxBalance, 'Số tiền rút vượt quá số dư khả dụng trong ví'),
    soTaiKhoan: z
      .string()
      .regex(REGEX_PATTERNS.BANK_ACCOUNT, 'Số tài khoản nhận tiền phải từ 6 đến 20 chữ số'),
    tenNganHang: z
      .string()
      .min(2, 'Vui lòng chọn ngân hàng nhận tiền')
      .regex(REGEX_PATTERNS.BANK_NAME, 'Tên ngân hàng chỉ chứa chữ cái và khoảng trắng'),
  });

export const categoryDepositFeeSchema = z
  .object({
    soTienCoc: z.number().int().positive('Mức cọc xem phòng phải lớn hơn 0'),
    phiThu: z.number().int().min(0, 'Phí hoa hồng sàn phải >= 0'),
  })
  .refine((d) => d.phiThu < d.soTienCoc, {
    message: 'Phí hoa hồng hệ thống (phiThu) bắt buộc nhỏ hơn mức cọc giữ chân (soTienCoc)',
    path: ['phiThu'],
  });
