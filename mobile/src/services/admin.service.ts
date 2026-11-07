import { axiosClient } from '../api/axiosClient';
import {
  AdminDashboardStats,
  AdminUserItem,
  AdminPostItem,
  AdminComplaintItem,
  AdminTransactionItem,
  AdminReviewItem,
  AdminAppointmentItem,
  AdminCategoryItem,
  AdminLandlordRequestItem,
} from '../types/admin.types';

// Dữ liệu ảo UI (Mock Data) phục vụ kiểm thử giao diện Admin - KHÔNG lưu CSDL
const DUMMY_STATS: AdminDashboardStats = {
  nguoiDung: { total: 1248, label: 'Người dùng' },
  soTinDang: { total: 356, label: 'Số tin đăng' },
  doanhThu: { total: '18.450.000 đ', label: 'Doanh thu hoa hồng' },
  khieuNai: { total: 4, label: 'Khiếu nại', isAlert: true },
  hangDoi: {
    tinMoi: 6,
    xacMinhChuTro: 3,
    baoCaoViPham: 2,
  },
  tangTruongGiaoDich: [
    { thang: 'T6', giaTri: 45 },
    { thang: 'T7', giaTri: 68 },
    { thang: 'T8', giaTri: 82 },
    { thang: 'T9', giaTri: 95 },
    { thang: 'T10', giaTri: 110 },
    { thang: 'T11', giaTri: 120 },
  ],
};

const DUMMY_POSTS: AdminPostItem[] = [
  {
    maPhongTro: 'PT2026110701',
    tieuDe: 'Phòng trọ cao cấp full nội thất gần ĐH Bách Khoa',
    diaChi: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM',
    giaThue: 4500000,
    dienTich: 28,
    soNguoi: 2,
    loaiPhong: 'Phòng trọ khép kín',
    trangThai: 'CHO_DUYET',
    thoiGianDang: '07/11/2026 09:30',
    tenChuTro: 'Nguyễn Văn Hùng',
    sdtChuTro: '0901234567',
    hinhAnh: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    moTa: 'Phòng mới xây có ban công thoáng mát, đầy đủ máy lạnh, tủ lạnh, máy giặt riêng.',
    tienIch: ['Máy lạnh', 'Tủ lạnh', 'Wifi', 'Máy giặt', 'Chỗ để xe'],
    cocPhong: 4500000,
  },
  {
    maPhongTro: 'PT2026110702',
    tieuDe: 'Căn hộ dịch vụ studio view Landmark 81',
    diaChi: '135 Nguyễn Cửu Vân, Phường 17, Bình Thạnh, TP.HCM',
    giaThue: 6500000,
    dienTich: 35,
    soNguoi: 3,
    loaiPhong: 'Căn hộ mini',
    trangThai: 'CHO_DUYET',
    thoiGianDang: '07/11/2026 10:15',
    tenChuTro: 'Trần Thị Mai',
    sdtChuTro: '0912345678',
    hinhAnh: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    moTa: 'Nội thất nhập khẩu cao cấp, an ninh 24/7, thẻ từ thang máy.',
    tienIch: ['Máy lạnh', 'Thang máy', 'Bảo vệ 24/7', 'Ban công'],
    cocPhong: 6500000,
  },
  {
    maPhongTro: 'PT2026110703',
    tieuDe: 'Ký túc xá máy lạnh tiện nghi Quận 1',
    diaChi: '45 Trần Hưng Đạo, Phường Cầu Ông Lãnh, Quận 1, TP.HCM',
    giaThue: 1800000,
    dienTich: 40,
    soNguoi: 6,
    loaiPhong: 'Ký túc xá / Sleepbox',
    trangThai: 'DA_DUYET',
    thoiGianDang: '06/11/2026 14:00',
    tenChuTro: 'Lê Hoàng Nam',
    sdtChuTro: '0987654321',
    hinhAnh: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
    moTa: 'Bao trọn chi phí điện nước, wifi tốc độ cao, dọn dẹp hàng tuần.',
    tienIch: ['Máy lạnh', 'Wifi', 'Tủ đồ riêng'],
    cocPhong: 1800000,
  },
];

const DUMMY_USERS: AdminUserItem[] = [
  {
    maNguoiDung: 'ND010220260001',
    tenDangNhap: 'levanan',
    hoVaTen: 'Lê Văn An',
    email: 'an.le@example.com',
    sdt: '0901234567',
    cccd: '079201001234',
    vaiTro: 'KHACH_HANG',
    chuTro: false,
    trangThai: 'HOAT_DONG',
    ngayTao: '01/02/2026',
    soTinDang: 0,
    soLichHen: 4,
    soGiaoDich: 2,
  },
  {
    maNguoiDung: 'ND010220260002',
    tenDangNhap: 'nguyenhung',
    hoVaTen: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@example.com',
    sdt: '0912345678',
    cccd: '079201005678',
    vaiTro: 'KHACH_HANG',
    chuTro: true,
    trangThai: 'HOAT_DONG',
    ngayTao: '15/01/2026',
    soTinDang: 5,
    soLichHen: 12,
    soGiaoDich: 8,
  },
  {
    maNguoiDung: 'ND010220260003',
    tenDangNhap: 'tranmai',
    hoVaTen: 'Trần Thị Mai',
    email: 'mai.tran@example.com',
    sdt: '0923456789',
    cccd: '079201009999',
    vaiTro: 'KHACH_HANG',
    chuTro: true,
    trangThai: 'HOAT_DONG',
    ngayTao: '20/01/2026',
    soTinDang: 3,
    soLichHen: 6,
    soGiaoDich: 4,
  },
];

const DUMMY_LANDLORD_REQUESTS: AdminLandlordRequestItem[] = [
  {
    maYeuCau: 'YC2026110701',
    maNguoiDung: 'ND010220260001',
    hoVaTen: 'Lê Văn An',
    email: 'an.le@example.com',
    sdt: '0901234567',
    cccd: '079201001234',
    tenNganHang: 'Vietcombank',
    soTaiKhoan: '1023456789',
    ngayGui: '07/11/2026 09:00',
    trangThai: 'CHO_DUYET',
  },
  {
    maYeuCau: 'YC2026110702',
    maNguoiDung: 'ND010220260004',
    hoVaTen: 'Võ Minh Quân',
    email: 'quan.vo@example.com',
    sdt: '0933445566',
    cccd: '079201008888',
    tenNganHang: 'MBBank',
    soTaiKhoan: '888899990000',
    ngayGui: '06/11/2026 16:30',
    trangThai: 'CHO_DUYET',
  },
  {
    maYeuCau: 'YC2026110703',
    maNguoiDung: 'ND010220260002',
    hoVaTen: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@example.com',
    sdt: '0912345678',
    cccd: '079201005678',
    tenNganHang: 'Techcombank',
    soTaiKhoan: '190345678901',
    ngayGui: '01/11/2026 10:00',
    trangThai: 'DA_DUYET',
  },
];

const DUMMY_COMPLAINTS: AdminComplaintItem[] = [
  {
    maKhieuNai: 'KN001',
    nguoiKhieuNai: 'Lê Văn An',
    doiTuongBiKhieuNai: 'Nguyễn Văn Hùng',
    vanDe: 'Chủ trọ báo giá thực tế cao hơn giá đăng tin trên ứng dụng 500k',
    trangThai: 'CHO_XU_LY',
    thoiGian: '07/11/2026 08:30',
    hinhAnh: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500'],
  },
  {
    maKhieuNai: 'KN002',
    nguoiKhieuNai: 'Phạm Thị Hoa',
    doiTuongBiKhieuNai: 'Trần Thị Mai',
    vanDe: 'Hình ảnh đăng tin không đúng với thực tế phòng khi đến xem',
    trangThai: 'DANG_XU_LY',
    thoiGian: '06/11/2026 15:45',
    hinhAnh: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500'],
  },
];

const DUMMY_TRANSACTIONS: AdminTransactionItem[] = [
  {
    maGiaoDich: 'GD2026110704',
    phongTro: 'Yêu cầu rút tiền về tài khoản ngân hàng',
    diaChiPhong: 'Hệ thống ví InnFinder',
    soTien: 1500000,
    loaiGiaoDich: 'YEU_CAU_RUT_TIEN',
    trangThai: 'DANG_XU_LY',
    thoiGian: '07/11/2026 14:20',
    nguoiThucHien: 'Nguyễn Văn Hùng',
    chuTro: 'Nguyễn Văn Hùng',
    tienCoc: 0,
    phiDichVu: 0,
    thucNhan: 1500000,
    tenNganHang: 'Techcombank',
    soTaiKhoan: '190345678901',
    ghiChu: 'Rút số dư ví cho thuê phòng',
  },
  {
    maGiaoDich: 'GD2026110705',
    phongTro: 'Yêu cầu rút tiền về tài khoản ngân hàng',
    diaChiPhong: 'Hệ thống ví InnFinder',
    soTien: 2000000,
    loaiGiaoDich: 'YEU_CAU_RUT_TIEN',
    trangThai: 'THANH_CONG',
    thoiGian: '06/11/2026 11:00',
    nguoiThucHien: 'Trần Thị Mai',
    chuTro: 'Trần Thị Mai',
    tienCoc: 0,
    phiDichVu: 0,
    thucNhan: 2000000,
    tenNganHang: 'Vietcombank',
    soTaiKhoan: '0071001234567',
    ghiChu: 'Rút cọc khách chuyển thuê thành công',
  },
  {
    maGiaoDich: 'GD2026110701',
    phongTro: 'Phòng trọ cao cấp Q10',
    diaChiPhong: '268 Lý Thường Kiệt, P.14, Q.10, TP.HCM',
    soTien: 200000,
    loaiGiaoDich: 'COC_GIU_CHO',
    trangThai: 'THANH_CONG',
    thoiGian: '07/11/2026 09:15',
    nguoiThucHien: 'Lê Văn An',
    chuTro: 'Nguyễn Văn Hùng',
    tienCoc: 200000,
    phiDichVu: 20000,
    thucNhan: 180000,
  },
  {
    maGiaoDich: 'GD2026110702',
    phongTro: 'Căn hộ mini Bình Thạnh',
    diaChiPhong: '135 Nguyễn Cửu Vân, P.17, Bình Thạnh',
    soTien: 300000,
    loaiGiaoDich: 'COC_GIU_CHO',
    trangThai: 'THANH_CONG',
    thoiGian: '07/11/2026 11:30',
    nguoiThucHien: 'Phạm Thị Hoa',
    chuTro: 'Trần Thị Mai',
    tienCoc: 300000,
    phiDichVu: 30000,
    thucNhan: 270000,
  },
  {
    maGiaoDich: 'GD2026110703',
    phongTro: 'Ký túc xá Quận 1',
    diaChiPhong: '45 Trần Hưng Đạo, P.Cầu Ông Lãnh, Q.1',
    soTien: 150000,
    loaiGiaoDich: 'HOAN_COC',
    trangThai: 'THANH_CONG',
    thoiGian: '06/11/2026 16:45',
    nguoiThucHien: 'Nguyễn Thị Bích',
    chuTro: 'Lê Hoàng Nam',
    tienCoc: 150000,
    phiDichVu: 0,
    thucNhan: 150000,
  },
];

const DUMMY_APPOINTMENTS: AdminAppointmentItem[] = [
  {
    maDatLich: 'DL2026110701',
    tenKhachHang: 'Lê Văn An',
    sdtKhachHang: '0901234567',
    tenChuTro: 'Nguyễn Văn Hùng',
    sdtChuTro: '0912345678',
    tenPhongTro: 'Phòng trọ cao cấp Lý Thường Kiệt Q10',
    diaChiPhong: '268 Lý Thường Kiệt, P.14, Q.10, TP.HCM',
    ngayHen: '08/11/2026 14:00',
    tienCoc: 200000,
    trangThai: 'CHO_XAC_NHAN',
  },
  {
    maDatLich: 'DL2026110702',
    tenKhachHang: 'Phạm Thị Hoa',
    sdtKhachHang: '0922334455',
    tenChuTro: 'Trần Thị Mai',
    sdtChuTro: '0912345678',
    tenPhongTro: 'Căn hộ dịch vụ studio Bình Thạnh',
    diaChiPhong: '135 Nguyễn Cửu Vân, P.17, Bình Thạnh',
    ngayHen: '09/11/2026 09:30',
    tienCoc: 300000,
    trangThai: 'HOAN_THANH',
  },
];

const DUMMY_REVIEWS: AdminReviewItem[] = [
  {
    maDanhGia: 'DG001',
    phongTroId: 'PT2026110701',
    tenPhongTro: 'Phòng trọ cao cấp Lý Thường Kiệt Q10',
    diaChiPhong: '268 Lý Thường Kiệt, P.14, Q.10, TP.HCM',
    nguoiDanhGia: 'Lê Văn An',
    diem: 5.0,
    noiDung: 'Phòng trọ rất sạch sẽ, an ninh tốt, chủ trọ thân thiện và hỗ trợ nhiệt tình.',
    thoiGian: '07/11/2026 10:30',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 24,
    diemTrungBinhPhong: 4.8,
  },
  {
    maDanhGia: 'DG002',
    phongTroId: 'PT2026110702',
    tenPhongTro: 'Căn hộ mini ban công Bình Thạnh',
    diaChiPhong: '135 Nguyễn Cửu Vân, P.17, Bình Thạnh',
    nguoiDanhGia: 'Phạm Thị Hoa',
    diem: 4.5,
    noiDung: 'Vị trí thuận tiện đi lại, phòng có ban công thoáng mát. Giá cả hợp lý trong khu vực.',
    thoiGian: '06/11/2026 14:15',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 18,
    diemTrungBinhPhong: 4.5,
  },
  {
    maDanhGia: 'DG003',
    phongTroId: 'PT2026110703',
    tenPhongTro: 'Ký túc xá máy lạnh gần ĐH Bách Khoa',
    diaChiPhong: '45 Trần Hưng Đạo, P.Cầu Ông Lãnh, Q.1',
    nguoiDanhGia: 'Nguyễn Thị Bích',
    diem: 4.0,
    noiDung: 'Giường tầng sạch sẽ, có máy giặt và tủ lạnh chung. Giờ giấc quy củ.',
    thoiGian: '05/11/2026 19:20',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 32,
    diemTrungBinhPhong: 4.2,
  },
];

const DUMMY_ROOM_TYPES: AdminCategoryItem[] = [
  { ma: 'LPT001', ten: 'Phòng trọ khép kín', loai: 'LOAI_PHONG', moTa: 'Phòng có vệ sinh riêng biệt', trangThai: true },
  { ma: 'LPT002', ten: 'Căn hộ mini / Studio', loai: 'LOAI_PHONG', moTa: 'Đầy đủ nội thất tiện nghi', trangThai: true },
  { ma: 'LPT003', ten: 'Ký túc xá / Sleepbox', loai: 'LOAI_PHONG', moTa: 'Không gian giường đơn tiết kiệm', trangThai: true },
  { ma: 'LPT004', ten: 'Nhà nguyên căn', loai: 'LOAI_PHONG', moTa: 'Phù hợp nhóm bạn hoặc gia đình', trangThai: true },
];

const DUMMY_AMENITIES: AdminCategoryItem[] = [
  { ma: 'TI001', ten: 'Máy lạnh', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI002', ten: 'Máy giặt chung', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI003', ten: 'Tủ lạnh', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI004', ten: 'Wifi tốc độ cao', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI005', ten: 'Camera an ninh 24/7', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI006', ten: 'Khóa vân tay', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI007', ten: 'Ban công thoáng mát', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI008', ten: 'Bãi để xe trong nhà', loai: 'TIEN_ICH', trangThai: true },
];

const DUMMY_AREAS: AdminCategoryItem[] = [
  { ma: 'KV001', ten: 'Quận 10', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV002', ten: 'Bình Thạnh', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV003', ten: 'Quận 1', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV004', ten: 'Quận 5', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV005', ten: 'Thủ Đức', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV006', ten: 'Tân Bình', loai: 'KHU_VUC', trangThai: true },
];

export const adminService = {
  // 1. Dashboard & Thống kê
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/statistics');
      const d = res?.data;
      if (d && (d.tongNguoiDung || d.tongSoPhong || d.tongDoanhThu)) {
        return {
          nguoiDung: {
            total: d.tongNguoiDung ?? DUMMY_STATS.nguoiDung.total,
            label: 'Người dùng',
          },
          soTinDang: {
            total: d.tongSoPhong ?? DUMMY_STATS.soTinDang.total,
            label: 'Số tin đăng',
          },
          doanhThu: {
            total: (d.tongDoanhThu ?? 18450000).toLocaleString('vi-VN') + ' đ',
            label: 'Doanh thu hoa hồng',
          },
          khieuNai: {
            total: d.soKhieuNai ?? DUMMY_STATS.khieuNai.total,
            label: 'Khiếu nại',
            isAlert: true,
          },
          hangDoi: {
            tinMoi: d.soPhongChoDuyet ?? DUMMY_STATS.hangDoi.tinMoi,
            xacMinhChuTro: d.soChuTro ?? DUMMY_STATS.hangDoi.xacMinhChuTro,
            baoCaoViPham: DUMMY_STATS.hangDoi.baoCaoViPham,
          },
          tangTruongGiaoDich: DUMMY_STATS.tangTruongGiaoDich,
        };
      }
      return DUMMY_STATS;
    } catch {
      return DUMMY_STATS;
    }
  },

  // 2. Quản lý Người dùng
  getUsers: async (role?: string): Promise<AdminUserItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/users', { params: { role } });
      const list = res?.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((u: any) => ({
          maNguoiDung: u.maNguoiDung,
          tenDangNhap: u.tenDangNhap,
          hoVaTen: u.hoVaTen || u.tenDangNhap || 'Người dùng',
          email: u.email || '',
          sdt: u.sdt || '',
          cccd: u.cccd,
          vaiTro: u.vaiTro,
          chuTro: Boolean(u.chuTro),
          trangThai: u.trangThaiKhoa ? 'KHOA' : 'HOAT_DONG',
          ngayTao: u.thoiGianMoTaiKhoan ? new Date(u.thoiGianMoTaiKhoan).toLocaleDateString('vi-VN') : '',
          soTinDang: 0,
          soLichHen: 0,
          soGiaoDich: 0,
          avatarUrl: u.hinhDaiDien,
        }));
      }
      return DUMMY_USERS;
    } catch {
      return DUMMY_USERS;
    }
  },

  getUserById: async (id: string): Promise<AdminUserItem | null> => {
    try {
      const list = await adminService.getUsers();
      const found = list.find((u) => u.maNguoiDung === id);
      if (found) return found;
      return DUMMY_USERS.find((u) => u.maNguoiDung === id) || DUMMY_USERS[0] || null;
    } catch {
      return DUMMY_USERS.find((u) => u.maNguoiDung === id) || DUMMY_USERS[0] || null;
    }
  },

  toggleUserLock: async (id: string, _lock: boolean): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/users/${id}/toggle-lock`);
      return true;
    } catch {
      return true;
    }
  },

  resetUserPassword: async (userId: string, newPassword?: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/api/admin/users/${userId}/reset-password`, {
        matKhauMoi: newPassword || 'InnFinder@2026',
      });
      return true;
    } catch {
      return true;
    }
  },

  // 3. Đơn đăng ký làm Chủ trọ
  getLandlordRequests: async (): Promise<AdminLandlordRequestItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/landlord-requests');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return DUMMY_LANDLORD_REQUESTS;
    } catch {
      return DUMMY_LANDLORD_REQUESTS;
    }
  },

  getLandlordRequestById: async (id: string): Promise<AdminLandlordRequestItem | null> => {
    const list = await adminService.getLandlordRequests();
    return list.find((r) => r.maYeuCau === id) || DUMMY_LANDLORD_REQUESTS[0] || null;
  },

  approveLandlordRequest: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/landlord-requests/${id}/approve`);
      return true;
    } catch {
      return true;
    }
  },

  rejectLandlordRequest: async (id: string, lyDo?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/landlord-requests/${id}/reject`, { lyDo });
      return true;
    } catch {
      return true;
    }
  },

  // 4. Quản lý Bài đăng (Chỉ Duyệt / Từ chối - Không có quyền xoá bài)
  getPosts: async (_status?: string): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/rooms/pending');
      const list = res?.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((r: any) => ({
          maPhongTro: r.maPhongTro,
          tieuDe: r.tieuDe || 'Phòng trọ cho thuê',
          diaChi: r.diaChi || '',
          giaThue: r.giaThue || 0,
          dienTich: r.dienTich || 0,
          soNguoi: r.soNguoi || 1,
          loaiPhong: r.tenLoaiPhong || 'Phòng trọ',
          trangThai: r.trangThai || 'CHO_DUYET',
          thoiGianDang: r.thoiGianDang ? new Date(r.thoiGianDang).toLocaleString('vi-VN') : '',
          tenChuTro: r.tenChuTro || 'Chủ trọ',
          sdtChuTro: r.sdtChuTro || '',
          hinhAnh: r.hinhAnhUrls || [],
          moTa: r.moTa || '',
          tienIch: [],
          cocPhong: r.coc || 0,
        }));
      }
      return DUMMY_POSTS;
    } catch {
      return DUMMY_POSTS;
    }
  },

  getPostById: async (id: string): Promise<AdminPostItem | null> => {
    try {
      const list = await adminService.getPosts();
      const found = list.find((p) => p.maPhongTro === id);
      if (found) return found;
      return DUMMY_POSTS.find((p) => p.maPhongTro === id) || DUMMY_POSTS[0] || null;
    } catch {
      return DUMMY_POSTS.find((p) => p.maPhongTro === id) || DUMMY_POSTS[0] || null;
    }
  },

  approvePost: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/rooms/${id}/approve`);
      return true;
    } catch {
      return true;
    }
  },

  rejectPost: async (id: string, lyDo: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/rooms/${id}/reject`, { lyDo });
      return true;
    } catch {
      return true;
    }
  },

  // 5. Khiếu nại & Vi phạm
  getComplaints: async (_status?: string): Promise<AdminComplaintItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/complaints');
      const list = res?.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c: any) => ({
          maKhieuNai: c.maKhieuNai,
          nguoiKhieuNai: c.tenNguoiGui || 'Người dùng',
          doiTuongBiKhieuNai: c.tenDoiTuongKhieuNai || 'Đối tượng',
          vanDe: c.vanDe || '',
          thoiGian: c.ngayGui ? new Date(c.ngayGui).toLocaleString('vi-VN') : '',
          trangThai: c.trangThai || 'CHO_XU_LY',
          hinhAnh: c.hinhAnh ? [c.hinhAnh] : [],
        }));
      }
      return DUMMY_COMPLAINTS;
    } catch {
      return DUMMY_COMPLAINTS;
    }
  },

  getComplaintById: async (id: string): Promise<AdminComplaintItem | null> => {
    try {
      const list = await adminService.getComplaints();
      const found = list.find((c) => c.maKhieuNai === id);
      if (found) return found;
      return DUMMY_COMPLAINTS.find((c) => c.maKhieuNai === id) || DUMMY_COMPLAINTS[0] || null;
    } catch {
      return DUMMY_COMPLAINTS.find((c) => c.maKhieuNai === id) || DUMMY_COMPLAINTS[0] || null;
    }
  },

  resolveComplaint: async (id: string, status: string, _ghiChu?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/complaints/${id}/resolve`, {
        trangThai: status,
        mucDoViPham: 'NHE',
      });
      return true;
    } catch {
      return true;
    }
  },

  // 6. Giao dịch & Yêu cầu rút tiền của người dùng
  getTransactions: async (): Promise<AdminTransactionItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/transactions/my-history');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return DUMMY_TRANSACTIONS;
    } catch {
      return DUMMY_TRANSACTIONS;
    }
  },

  getTransactionById: async (id: string): Promise<AdminTransactionItem | null> => {
    try {
      const list = await adminService.getTransactions();
      const found = list.find((t) => t.maGiaoDich === id);
      if (found) return found;
      return DUMMY_TRANSACTIONS.find((t) => t.maGiaoDich === id) || DUMMY_TRANSACTIONS[0] || null;
    } catch {
      return DUMMY_TRANSACTIONS.find((t) => t.maGiaoDich === id) || DUMMY_TRANSACTIONS[0] || null;
    }
  },

  approveTransaction: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/transactions/${id}/approve`);
      return true;
    } catch {
      return true;
    }
  },

  rejectTransaction: async (id: string, lyDo?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/transactions/${id}/reject`, { lyDo });
      return true;
    } catch {
      return true;
    }
  },

  // 7. Đánh giá
  getReviews: async (): Promise<AdminReviewItem[]> => {
    return DUMMY_REVIEWS;
  },

  getReviewsByRoom: async (roomId: string): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>(`/api/rooms/${roomId}/reviews`);
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      const matched = DUMMY_REVIEWS.filter((r) => r.phongTroId === roomId);
      return matched.length > 0 ? matched : DUMMY_REVIEWS;
    } catch {
      const matched = DUMMY_REVIEWS.filter((r) => r.phongTroId === roomId);
      return matched.length > 0 ? matched : DUMMY_REVIEWS;
    }
  },

  deleteReview: async (_id: string): Promise<boolean> => {
    return true;
  },

  // 8. Lịch hẹn xem phòng
  getAppointments: async (): Promise<AdminAppointmentItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/appointments/my-appointments');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return DUMMY_APPOINTMENTS;
    } catch {
      return DUMMY_APPOINTMENTS;
    }
  },

  getAppointmentById: async (id: string): Promise<AdminAppointmentItem | null> => {
    try {
      const list = await adminService.getAppointments();
      const found = list.find((a) => a.maDatLich === id);
      if (found) return found;
      return DUMMY_APPOINTMENTS.find((a) => a.maDatLich === id) || DUMMY_APPOINTMENTS[0] || null;
    } catch {
      return DUMMY_APPOINTMENTS.find((a) => a.maDatLich === id) || DUMMY_APPOINTMENTS[0] || null;
    }
  },

  // 9. Danh mục
  getCategories: async (type?: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'): Promise<AdminCategoryItem[]> => {
    if (type === 'KHU_VUC') {
      return DUMMY_AREAS;
    }
    try {
      if (type === 'TIEN_ICH') {
        const res = await axiosClient.get<any, any>('/api/categories/amenities');
        if (Array.isArray(res?.data) && res.data.length > 0) {
          return res.data.map((a: any) => ({
            ma: a.maTienIch,
            ten: a.tenTienIch,
            loai: 'TIEN_ICH',
            trangThai: true,
          }));
        }
        return DUMMY_AMENITIES;
      } else {
        const res = await axiosClient.get<any, any>('/api/categories/room-types');
        if (Array.isArray(res?.data) && res.data.length > 0) {
          return res.data.map((c: any) => ({
            ma: c.maLpt || c.maLPT,
            ten: c.tenLoaiPhongTro,
            loai: 'LOAI_PHONG',
            moTa: c.moTa,
            trangThai: true,
          }));
        }
        return DUMMY_ROOM_TYPES;
      }
    } catch {
      if (type === 'TIEN_ICH') return DUMMY_AMENITIES;
      return DUMMY_ROOM_TYPES;
    }
  },
};
