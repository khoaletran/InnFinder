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
} from '../types/admin.types';

// Mock Data chuẩn theo ảnh thiết kế
const MOCK_STATS: AdminDashboardStats = {
  nguoiDung: { total: 48216, label: 'Người dùng' },
  soTinDang: { total: 28482, label: 'Số tin đăng' },
  doanhThu: { total: '12,8 tỷ', label: 'Doanh thu tháng' },
  khieuNai: { total: 24, label: 'Khiếu nại', isAlert: true },
  hangDoi: {
    tinMoi: 124,
    xacMinhChuTro: 45,
    baoCaoViPham: 12,
  },
  tangTruongGiaoDich: [
    { thang: 'T1', giaTri: 45 },
    { thang: 'T2', giaTri: 65 },
    { thang: 'T3', giaTri: 85 },
    { thang: 'T4', giaTri: 60 },
    { thang: 'T5', giaTri: 95 },
    { thang: 'T6', giaTri: 110 },
  ],
};

const MOCK_USERS: AdminUserItem[] = [
  {
    maNguoiDung: 'ND202611060001',
    tenDangNhap: 'leminhquan',
    hoVaTen: 'Lê Minh Quân',
    email: 'minhquan@gmail.com',
    sdt: '0902 456 789',
    vaiTro: 'KHACH_HANG',
    chuTro: false,
    trangThai: 'HOAT_DONG',
    ngayTao: '15/06/2024',
    soTinDang: 12,
    soLichHen: 45,
    soGiaoDich: 28,
  },
  {
    maNguoiDung: 'ND202611060002',
    tenDangNhap: 'nguyenthuthao',
    hoVaTen: 'Nguyễn Thu Thảo',
    email: 'thuthao@gmail.com',
    sdt: '0912 345 678',
    vaiTro: 'KHACH_HANG',
    chuTro: true,
    trangThai: 'HOAT_DONG',
    ngayTao: '20/07/2024',
    soTinDang: 5,
    soLichHen: 18,
    soGiaoDich: 12,
  },
  {
    maNguoiDung: 'ND202611060003',
    tenDangNhap: 'phanantuan',
    hoVaTen: 'Phan Anh Tuấn',
    email: 'anhtuan@gmail.com',
    sdt: '0933 112 233',
    vaiTro: 'KHACH_HANG',
    chuTro: false,
    trangThai: 'KHOA',
    ngayTao: '10/08/2024',
    soTinDang: 0,
    soLichHen: 2,
    soGiaoDich: 1,
  },
  {
    maNguoiDung: 'ND202611060004',
    tenDangNhap: 'buihoangnam',
    hoVaTen: 'Bùi Hoàng Nam',
    email: 'hoangnam@gmail.com',
    sdt: '0988 776 655',
    vaiTro: 'QUAN_TRI',
    chuTro: false,
    trangThai: 'HOAT_DONG',
    ngayTao: '01/01/2024',
    soTinDang: 0,
    soLichHen: 0,
    soGiaoDich: 0,
  },
];

const MOCK_POSTS: AdminPostItem[] = [
  {
    maPhongTro: 'PT20261106001',
    tieuDe: 'Phòng trọ ban công gần ĐH Sư Phạm',
    diaChi: '124/6 An Dương Vương, Phường 4, Quận 5, TP. Hồ Chí Minh',
    giaThue: 3800000,
    dienTich: 24,
    soNguoi: 3,
    loaiPhong: 'Phòng khép kín',
    trangThai: 'CHO_DUYET',
    thoiGianDang: 'Hôm nay 10:30',
    tenChuTro: 'Nguyễn Minh Anh',
    sdtChuTro: '0901 234 567',
    hinhAnh: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
    ],
    moTa: 'Phòng rộng thoáng mát, có ban công riêng nhìn ra phố, trang bị sẵn máy lạnh và kệ bếp nhỏ để nấu ăn nhẹ. Giờ giấc tự do, không chung chủ, có bảo vệ 24/7 an ninh tuyệt đối.',
    tienIch: ['Máy lạnh', 'Wifi', 'Ban công', 'Tủ lạnh', 'Bảo vệ', 'Giờ giấc tự do'],
    cocPhong: 3800000,
  },
  {
    maPhongTro: 'PT20261106002',
    tieuDe: 'Studio Thảo Điền view Landmark 81',
    diaChi: '36 Đường 49, Thảo Điền, TP. Thủ Đức',
    giaThue: 6500000,
    dienTich: 32,
    soNguoi: 2,
    loaiPhong: 'Studio',
    trangThai: 'DA_DUYET',
    thoiGianDang: '05/11/2026',
    tenChuTro: 'Trần Văn Long',
    sdtChuTro: '0908 765 432',
    hinhAnh: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
    ],
    moTa: 'Căn hộ Studio cao cấp đầy đủ tiện nghi, view Landmark 81 siêu đẹp.',
    tienIch: ['Máy lạnh', 'Tủ lạnh', 'Bếp', 'Máy giặt', 'Hồ bơi'],
    cocPhong: 6500000,
  },
  {
    maPhongTro: 'PT20261106003',
    tieuDe: 'Phòng trọ gác lửng Quận 10 giá rẻ',
    diaChi: '528/15 Cách Mạng Tháng 8, Phường 11, Quận 10',
    giaThue: 3200000,
    dienTich: 20,
    soNguoi: 2,
    loaiPhong: 'Gác lửng',
    trangThai: 'CHO_DUYET',
    thoiGianDang: 'Hôm nay 08:15',
    tenChuTro: 'Lê Thị Dung',
    sdtChuTro: '0918 334 455',
    hinhAnh: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
    ],
    moTa: 'Phòng có gác sạch sẽ, vệ sinh khép kín trong phòng.',
    tienIch: ['Gác lửng', 'Wifi', 'Chỗ để xe'],
    cocPhong: 3200000,
  },
];

const MOCK_COMPLAINTS: AdminComplaintItem[] = [
  {
    maKhieuNai: '#KN001234',
    nguoiKhieuNai: 'Trần Minh Hoà',
    doiTuongBiKhieuNai: 'Chủ trọ Minh Anh',
    vanDe: 'Chất lượng phòng không đúng thực tế. Máy lạnh bị hỏng từ khi nhận phòng, ban công có nhiều rác thải chưa dọn dẹp khi bàn giao phòng.',
    thoiGian: 'Hôm nay 09:45',
    trangThai: 'CHO_XU_LY',
    hinhAnh: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
    ],
    phongLienQuan: {
      maPhong: 'PT20261106001',
      tieuDe: 'Phòng trọ ban công gần ĐH Sư Phạm',
      chuTro: 'Chủ trọ: Nguyễn Minh Anh',
      diaChi: '124/6 An Dương Vương, P.4, Q.5',
    },
  },
  {
    maKhieuNai: '#KN001235',
    nguoiKhieuNai: 'Lê Khắc Tiệp',
    doiTuongBiKhieuNai: 'Chủ trọ Quốc Bảo',
    vanDe: 'Không hoàn tiền cọc đúng hạn sau khi hết hợp đồng thuê.',
    thoiGian: '24/10/2026',
    trangThai: 'DANG_XU_LY',
    hinhAnh: [],
    phongLienQuan: {
      maPhong: 'PT20261106002',
      tieuDe: 'Studio Thảo Điền view Landmark 81',
      chuTro: 'Trần Văn Long',
      diaChi: '36 Đường 49, Thảo Điền',
    },
  },
  {
    maKhieuNai: '#KN001236',
    nguoiKhieuNai: 'Bùi Thị Hinh',
    doiTuongBiKhieuNai: 'Chủ trọ Thuỳ Linh',
    vanDe: 'Tăng giá điện nước vô lý trái hợp đồng ký kết ban đầu.',
    thoiGian: '22/10/2026',
    trangThai: 'DA_XU_LY',
    hinhAnh: [],
  },
];

const MOCK_TRANSACTIONS: AdminTransactionItem[] = [
  {
    maGiaoDich: '#GD0001234',
    phongTro: 'Phòng trọ ban công gần ĐH Sư Phạm',
    diaChiPhong: '124/6 An Dương Vương, Phường 4, Quận 5',
    soTien: 4500000,
    loaiGiaoDich: 'Cọc giữ chân',
    trangThai: 'THANH_CONG',
    thoiGian: 'Hôm nay 11:20',
    nguoiThucHien: 'Nguyễn Thu Thảo',
    chuTro: 'Nguyễn Minh Anh',
    tienCoc: 3000000,
    phiDichVu: 500000,
    thucNhan: 3500000,
  },
  {
    maGiaoDich: '#GD0001235',
    phongTro: 'Studio Thảo Điền view Landmark 81',
    soTien: 6500000,
    loaiGiaoDich: 'Tiền thuê tháng đầu',
    trangThai: 'THANH_CONG',
    thoiGian: '25/10/2026',
    nguoiThucHien: 'Lê Minh Quân',
    chuTro: 'Trần Văn Long',
    tienCoc: 6500000,
    phiDichVu: 300000,
    thucNhan: 6200000,
  },
  {
    maGiaoDich: '#GD0001236',
    phongTro: 'Phòng trọ gác lửng Quận 10 giá rẻ',
    soTien: 3200000,
    loaiGiaoDich: 'Cọc giữ chân',
    trangThai: 'DANG_XU_LY',
    thoiGian: 'Hôm qua 15:45',
    nguoiThucHien: 'Phan Anh Tuấn',
    chuTro: 'Lê Thị Dung',
    tienCoc: 3200000,
    phiDichVu: 200000,
    thucNhan: 3000000,
  },
];

const MOCK_REVIEWS: AdminReviewItem[] = [
  {
    maDanhGia: 'DG001',
    phongTroId: 'PT20261106001',
    tenPhongTro: 'Phòng trọ ban công gần ĐH Sư Phạm',
    diaChiPhong: 'Quận 5, TP. Hồ Chí Minh',
    nguoiDanhGia: 'Trần Minh Hoà',
    diem: 4.8,
    noiDung: 'Phòng rất thoáng mát, sạch sẽ, chủ nhà thân thiện hỗ trợ nhiệt tình. Có chỗ để xe an toàn.',
    thoiGian: '15/10/2026',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 128,
    diemTrungBinhPhong: 4.8,
  },
  {
    maDanhGia: 'DG002',
    phongTroId: 'PT20261106002',
    tenPhongTro: 'Studio Thảo Điền view Landmark 81',
    diaChiPhong: 'Thảo Điền, TP. Thủ Đức',
    nguoiDanhGia: 'Lê Khắc Tiệp',
    diem: 4.9,
    noiDung: 'View tuyệt đẹp, phòng sang trọng đúng như ảnh mô tả. Đầy đủ tiện nghi.',
    thoiGian: '20/10/2026',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 64,
    diemTrungBinhPhong: 4.9,
  },
  {
    maDanhGia: 'DG003',
    phongTroId: 'PT20261106003',
    tenPhongTro: 'Phòng trọ gác lửng Quận 10 giá rẻ',
    diaChiPhong: 'Quận 10, TP. Hồ Chí Minh',
    nguoiDanhGia: 'Lê Thu Quỳnh',
    diem: 3.5,
    noiDung: 'Phòng hơi ẩm mốc vào mùa mưa, cách âm chưa tốt lắm.',
    thoiGian: '24/10/2026',
    trangThai: 'HIEN_THI',
    tongDanhGiaPhong: 42,
    diemTrungBinhPhong: 3.8,
  },
];

const MOCK_APPOINTMENTS: AdminAppointmentItem[] = [
  {
    maDatLich: '#LX001234',
    tenKhachHang: 'Nguyễn Thu Thảo',
    sdtKhachHang: '0912 345 678',
    tenChuTro: 'Nguyễn Minh Anh',
    sdtChuTro: '0901 234 567',
    tenPhongTro: 'Phòng trọ ban công gần ĐH Sư Phạm',
    diaChiPhong: '124/6 An Dương Vương, P.4, Q.5',
    ngayHen: '25/10/2026 - 14:00',
    trangThai: 'XAC_NHAN',
    ghiChu: 'Khách hàng muốn xem phòng vào chiều và đặt xác nhận giữ chỗ luôn.',
    tienCoc: 200000,
  },
  {
    maDatLich: '#LX001235',
    tenKhachHang: 'Lê Minh Quân',
    sdtKhachHang: '0902 456 789',
    tenChuTro: 'Trần Văn Long',
    sdtChuTro: '0908 765 432',
    tenPhongTro: 'Studio Thảo Điền view Landmark 81',
    diaChiPhong: '36 Đường 49, Thảo Điền',
    ngayHen: '26/10/2026 - 09:30',
    trangThai: 'HOAN_THANH',
    ghiChu: 'Đã gặp mặt và hoàn tất thủ tục xem phòng.',
    tienCoc: 300000,
  },
  {
    maDatLich: '#LX001236',
    tenKhachHang: 'Phan Anh Tuấn',
    sdtKhachHang: '0933 112 233',
    tenChuTro: 'Lê Thị Dung',
    sdtChuTro: '0918 334 455',
    tenPhongTro: 'Phòng trọ gác lửng Quận 10',
    diaChiPhong: '528/15 Cách Mạng Tháng 8, Q.10',
    ngayHen: '27/10/2026 - 16:00',
    trangThai: 'HUY',
    ghiChu: 'Khách bận đột xuất không đến được.',
    tienCoc: 200000,
  },
];

const MOCK_CATEGORIES: AdminCategoryItem[] = [
  { ma: 'LP01', ten: 'Phòng trọ khép kín', loai: 'LOAI_PHONG', moTa: 'Phòng có nhà vệ sinh riêng bên trong', trangThai: true },
  { ma: 'LP02', ten: 'Chung cư mini', loai: 'LOAI_PHONG', moTa: 'Căn hộ chung cư diện tích vừa và nhỏ', trangThai: true },
  { ma: 'LP03', ten: 'Studio', loai: 'LOAI_PHONG', moTa: 'Không gian mở không ngăn vách', trangThai: true },
  { ma: 'LP04', ten: 'Ký túc xá / Sleepbox', loai: 'LOAI_PHONG', moTa: 'Giường tầng tiện nghi, giá rẻ cho sinh viên', trangThai: true },
  { ma: 'LP05', ten: 'Homestay', loai: 'LOAI_PHONG', moTa: 'Thuê theo ngày/tháng phong cách gia đình', trangThai: true },
  { ma: 'TI01', ten: 'Máy lạnh', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI02', ten: 'Tủ lạnh', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI03', ten: 'Máy giặt', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI04', ten: 'Wifi', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'TI05', ten: 'Gác lửng', loai: 'TIEN_ICH', trangThai: true },
  { ma: 'KV01', ten: 'Quận 1', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV02', ten: 'Quận 5', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV03', ten: 'Quận 10', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV04', ten: 'Bình Thạnh', loai: 'KHU_VUC', trangThai: true },
  { ma: 'KV05', ten: 'Thủ Đức', loai: 'KHU_VUC', trangThai: true },
];

export const adminService = {
  // 1. Dashboard & Thống kê
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/dashboard');
      if (res?.data) {
        return {
          ...MOCK_STATS,
          hangDoi: {
            ...MOCK_STATS.hangDoi,
            tinMoi: res.data.pendingRoomsCount ?? MOCK_STATS.hangDoi.tinMoi,
            baoCaoViPham: res.data.pendingComplaintsCount ?? MOCK_STATS.hangDoi.baoCaoViPham,
          },
        };
      }
      return MOCK_STATS;
    } catch {
      return MOCK_STATS;
    }
  },

  // 2. Quản lý Người dùng
  getUsers: async (role?: string): Promise<AdminUserItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/users', { params: { role } });
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return MOCK_USERS;
    } catch {
      return MOCK_USERS;
    }
  },

  getUserById: async (id: string): Promise<AdminUserItem | null> => {
    const list = await adminService.getUsers();
    return list.find((u) => u.maNguoiDung === id) || list[0];
  },

  toggleUserLock: async (id: string, lock: boolean): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/users/${id}/status`, { status: lock ? 'KHOA' : 'HOAT_DONG' });
      return true;
    } catch {
      return true;
    }
  },

  // 3. Quản lý Bài đăng
  getPosts: async (status?: string): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/pending-rooms');
      if (Array.isArray(res?.data) && res.data.length > 0) {
        return res.data.map((r: any) => ({
          maPhongTro: r.maPhongTro,
          tieuDe: r.tieuDe || 'Phòng trọ cho thuê',
          diaChi: r.diaChi || 'TP. Hồ Chí Minh',
          giaThue: r.giaThue || 0,
          dienTich: r.dienTich || 20,
          soNguoi: r.soNguoi || 2,
          loaiPhong: r.loaiPhong?.tenLoaiPhongTro || 'Phòng khép kín',
          trangThai: r.trangThai || 'CHO_DUYET',
          thoiGianDang: r.thoiGianDang || 'Hôm nay',
          tenChuTro: r.chuPhongTro?.nguoiDung?.hoVaTen || 'Chủ trọ',
          sdtChuTro: r.chuPhongTro?.nguoiDung?.sdt || '0900000000',
          hinhAnh: r.hinhAnh?.map((img: any) => img.url) || [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
          ],
          moTa: r.moTa || 'Mô tả phòng',
          tienIch: ['Máy lạnh', 'Wifi', 'Ban công'],
          cocPhong: r.cocPhong || r.giaThue || 0,
        }));
      }
      return MOCK_POSTS;
    } catch {
      return MOCK_POSTS;
    }
  },

  getPostById: async (id: string): Promise<AdminPostItem | null> => {
    const list = await adminService.getPosts();
    return list.find((p) => p.maPhongTro === id) || list[0];
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
      await axiosClient.patch(`/api/admin/rooms/${id}/reject`, { reason: lyDo });
      return true;
    } catch {
      return true;
    }
  },

  // 4. Khiếu nại
  getComplaints: async (status?: string): Promise<AdminComplaintItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/complaints', { params: { status } });
      if (Array.isArray(res?.data) && res.data.length > 0) {
        return res.data.map((c: any) => ({
          maKhieuNai: c.maKhieuNai || `#KN${c.id}`,
          nguoiKhieuNai: c.nguoiGui?.hoVaTen || 'Khách hàng',
          doiTuongBiKhieuNai: c.doiTuongBiKhieuNai?.hoVaTen || 'Chủ trọ',
          vanDe: c.vanDe || 'Khiếu nại về phòng',
          thoiGian: c.thoiGian || 'Hôm nay',
          trangThai: c.trangThai || 'CHO_XU_LY',
          hinhAnh: c.hinhAnh ? [c.hinhAnh] : [],
        }));
      }
      return MOCK_COMPLAINTS;
    } catch {
      return MOCK_COMPLAINTS;
    }
  },

  getComplaintById: async (id: string): Promise<AdminComplaintItem | null> => {
    const list = await adminService.getComplaints();
    return list.find((c) => c.maKhieuNai === id) || list[0];
  },

  resolveComplaint: async (id: string, status: string, ghiChu?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/complaints/${id}/status`, { status, ghiChu });
      return true;
    } catch {
      return true;
    }
  },

  // 5. Giao dịch
  getTransactions: async (): Promise<AdminTransactionItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/transactions');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return MOCK_TRANSACTIONS;
    } catch {
      return MOCK_TRANSACTIONS;
    }
  },

  getTransactionById: async (id: string): Promise<AdminTransactionItem | null> => {
    const list = await adminService.getTransactions();
    return list.find((t) => t.maGiaoDich === id) || list[0];
  },

  // 6. Đánh giá
  getReviews: async (): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/reviews');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return MOCK_REVIEWS;
    } catch {
      return MOCK_REVIEWS;
    }
  },

  getReviewsByRoom: async (roomId: string): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>(`/api/reviews/room/${roomId}`);
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return MOCK_REVIEWS.filter((r) => r.phongTroId === roomId || true);
    } catch {
      return MOCK_REVIEWS;
    }
  },

  deleteReview: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/api/reviews/${id}`);
      return true;
    } catch {
      return true;
    }
  },

  // 7. Lịch hẹn xem phòng
  getAppointments: async (): Promise<AdminAppointmentItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/appointments');
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      return MOCK_APPOINTMENTS;
    } catch {
      return MOCK_APPOINTMENTS;
    }
  },

  getAppointmentById: async (id: string): Promise<AdminAppointmentItem | null> => {
    const list = await adminService.getAppointments();
    return list.find((a) => a.maDatLich === id) || list[0];
  },

  // 8. Danh mục
  getCategories: async (type?: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'): Promise<AdminCategoryItem[]> => {
    if (!type) return MOCK_CATEGORIES;
    return MOCK_CATEGORIES.filter((c) => c.loai === type);
  },
};
