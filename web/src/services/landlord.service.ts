import { axiosClient } from '../api/axiosClient';
import { uploadService } from './upload.service';
import type {
  LandlordDashboardStats,
  LandlordRoomItem,
  LandlordAppointmentItem,
  LandlordTransactionItem,
  LandlordWalletInfo,
  ReviewItem,
  ComplaintItem,
  AmenityItem,
  CategoryItem,
  BankAccountItem,
} from '../types/landlord.types';

// Mock data ban đầu
const MOCK_CATEGORIES: CategoryItem[] = [
  { maLpt: 'LPT01', tenLoaiPhongTro: 'Phòng trọ khép kín', soTienCoc: 200000, phiThu: 20000 },
  { maLpt: 'LPT02', tenLoaiPhongTro: 'Căn hộ mini / Studio', soTienCoc: 300000, phiThu: 30000 },
  { maLpt: 'LPT03', tenLoaiPhongTro: 'Phòng trọ chung chủ', soTienCoc: 150000, phiThu: 15000 },
  { maLpt: 'LPT04', tenLoaiPhongTro: 'Nhà nguyên căn', soTienCoc: 500000, phiThu: 50000 },
  { maLpt: 'LPT05', tenLoaiPhongTro: 'Homestay / Ký túc xá', soTienCoc: 100000, phiThu: 10000 },
];

const MOCK_AMENITIES: AmenityItem[] = [
  { maTienIch: 'TI01', tenTienIch: 'Máy lạnh', bieuTuong: 'wind' },
  { maTienIch: 'TI02', tenTienIch: 'Tủ lạnh', bieuTuong: 'refrigerator' },
  { maTienIch: 'TI03', tenTienIch: 'Máy giặt chung', bieuTuong: 'shirt' },
  { maTienIch: 'TI04', tenTienIch: 'Wifi tốc độ cao', bieuTuong: 'wifi' },
  { maTienIch: 'TI05', tenTienIch: 'Gác lửng', bieuTuong: 'home' },
  { maTienIch: 'TI06', tenTienIch: 'Ban công thoáng mát', bieuTuong: 'sun' },
  { maTienIch: 'TI07', tenTienIch: 'Camera an ninh', bieuTuong: 'video' },
  { maTienIch: 'TI08', tenTienIch: 'Khóa vân tay', bieuTuong: 'lock' },
  { maTienIch: 'TI09', tenTienIch: 'Chỗ để xe miễn phí', bieuTuong: 'bike' },
  { maTienIch: 'TI10', tenTienIch: 'Bếp nấu ăn riêng', bieuTuong: 'flame' },
];

let mockRooms: LandlordRoomItem[] = [
  {
    id: '1',
    maPhongTro: 'PT261108000001',
    tenPhong: 'Phòng Studio Full Nội Thất View Đẹp',
    giaThue: 4500000,
    cocPhong: 4500000,
    dienTich: 28,
    soNguoi: 2,
    trangThai: 'DA_DUYET',
    isRented: false,
    hinhAnhUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    danhSachAnh: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
    diaChi: '123 Đường D2, Phường 25, Quận Bình Thạnh, TP.HCM',
    kinhDo: 106.7145,
    viDo: 10.8012,
    moTa: 'Phòng mới xây 100%, có máy lạnh inverter, tủ lạnh, giường nệm cao cấp, ban công đón nắng gió cực mát mẻ.',
    loaiPhong: 'Căn hộ mini / Studio',
    maLpt: 'LPT02',
    dsTienIch: ['Máy lạnh', 'Tủ lạnh', 'Wifi tốc độ cao', 'Ban công thoáng mát', 'Khóa vân tay'],
    thoiGianDang: '2026-11-10',
  },
  {
    id: '2',
    maPhongTro: 'PT261108000002',
    tenPhong: 'Phòng Trọ Gác Cao Rộng Rãi Gần ĐH Hutech',
    giaThue: 3200000,
    cocPhong: 3200000,
    dienTich: 22,
    soNguoi: 3,
    trangThai: 'DA_DUYET',
    isRented: true,
    hinhAnhUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    danhSachAnh: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
    diaChi: '475A Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP.HCM',
    kinhDo: 106.7142,
    viDo: 10.8015,
    moTa: 'Gác đúc bê tông đứng không đụng đầu, giờ giấc tự do, không chung chủ, có camera an ninh 24/7.',
    loaiPhong: 'Phòng trọ khép kín',
    maLpt: 'LPT01',
    dsTienIch: ['Máy lạnh', 'Gác lửng', 'Wifi tốc độ cao', 'Camera an ninh', 'Chỗ để xe miễn phí'],
    thoiGianDang: '2026-11-08',
  },
  {
    id: '3',
    maPhongTro: 'PT261108000003',
    tenPhong: 'Phòng Cao Cấp Có Ban Công Liền Kề Q1',
    giaThue: 5200000,
    cocPhong: 5200000,
    dienTich: 32,
    soNguoi: 2,
    trangThai: 'CHO_DUYET',
    isRented: false,
    hinhAnhUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    diaChi: '88 Nguyễn Xí, Phường 26, Quận Bình Thạnh, TP.HCM',
    kinhDo: 106.7088,
    viDo: 10.8123,
    moTa: 'Phòng vừa hoàn thiện nội thất, sofa, bếp điện từ, máy hút mùi, bồn tắm nằm cao cấp.',
    loaiPhong: 'Căn hộ mini / Studio',
    maLpt: 'LPT02',
    dsTienIch: ['Máy lạnh', 'Tủ lạnh', 'Máy giặt chung', 'Wifi tốc độ cao', 'Ban công thoáng mát', 'Bếp nấu ăn riêng'],
    thoiGianDang: '2026-11-15',
  },
  {
    id: '4',
    maPhongTro: 'PT261108000004',
    tenPhong: 'Phòng Trọ Giá Rẻ Sinh Viên An Ninh',
    giaThue: 2500000,
    cocPhong: 2500000,
    dienTich: 18,
    soNguoi: 2,
    trangThai: 'HUY',
    isRented: false,
    hinhAnhUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    diaChi: '25/11 Xô Viết Nghệ Tĩnh, Phường 17, Bình Thạnh, TP.HCM',
    kinhDo: 106.7055,
    viDo: 10.7954,
    moTa: 'Phòng nhỏ gọn, có WC riêng, lối đi riêng, nước máy thủy cục.',
    loaiPhong: 'Phòng trọ khép kín',
    maLpt: 'LPT01',
    dsTienIch: ['Wifi tốc độ cao', 'Camera an ninh', 'Chỗ để xe miễn phí'],
    thoiGianDang: '2026-11-01',
  },
];

let mockAppointments: LandlordAppointmentItem[] = [
  {
    id: 'DL01',
    khachHangTen: 'Nguyễn Văn An',
    sdt: '0901234567',
    emailKhachHang: 'an.nguyen@gmail.com',
    phongTen: 'Phòng Studio Full Nội Thất View Đẹp',
    maPhongTro: 'PT261108000001',
    diaChiPhong: '123 Đường D2, Phường 25, Quận Bình Thạnh, TP.HCM',
    thoiGian: '09:30',
    ngayHen: '2026-11-18',
    rawNgayHen: '2026-11-18T09:30:00',
    trangThai: 'CHO_XAC_NHAN',
    coc: 200000,
    phiThu: 20000,
    giaThue: 4500000,
    ghiChu: 'Tôi qua xem phòng vào buổi sáng, có thể dọn vào ở đầu tháng tới.',
    hinhAnh: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    daNhanLaiCoc: false,
    daNopCoc: true,
  },
  {
    id: 'DL02',
    khachHangTen: 'Trần Thị Mai',
    sdt: '0912345678',
    emailKhachHang: 'mai.tran@gmail.com',
    phongTen: 'Phòng Trọ Gác Cao Rộng Rãi Gần ĐH Hutech',
    maPhongTro: 'PT261108000002',
    diaChiPhong: '475A Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP.HCM',
    thoiGian: '14:00',
    ngayHen: '2026-11-18',
    rawNgayHen: '2026-11-18T14:00:00',
    trangThai: 'XAC_NHAN',
    coc: 200000,
    phiThu: 20000,
    giaThue: 3200000,
    ghiChu: 'Đã hẹn trước, chủ trọ dẫn xem lúc 14h.',
    hinhAnh: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    daNhanLaiCoc: true,
    daNopCoc: true,
    khachHangDongY: null,
    chuTroDongY: null,
  },
  {
    id: 'DL03',
    khachHangTen: 'Lê Hoàng Nam',
    sdt: '0987654321',
    emailKhachHang: 'nam.le@gmail.com',
    phongTen: 'Phòng Studio Full Nội Thất View Đẹp',
    maPhongTro: 'PT261108000001',
    diaChiPhong: '123 Đường D2, Phường 25, Quận Bình Thạnh, TP.HCM',
    thoiGian: '16:30',
    ngayHen: '2026-11-19',
    rawNgayHen: '2026-11-19T16:30:00',
    trangThai: 'HOAN_THANH',
    coc: 200000,
    phiThu: 20000,
    giaThue: 4500000,
    ghiChu: 'Khách và chủ trọ đã gặp mặt, hoàn cọc và chốt thuê thành công.',
    hinhAnh: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    daNhanLaiCoc: true,
    daNopCoc: true,
    khachHangDongY: true,
    chuTroDongY: true,
  },
  {
    id: 'DL04',
    khachHangTen: 'Phạm Minh Tuấn',
    sdt: '0934567890',
    emailKhachHang: 'tuan.pm@gmail.com',
    phongTen: 'Phòng Cao Cấp Có Ban Công Liền Kề Q1',
    maPhongTro: 'PT261108000003',
    diaChiPhong: '88 Nguyễn Xí, Phường 26, Quận Bình Thạnh, TP.HCM',
    thoiGian: '10:00',
    ngayHen: '2026-11-15',
    rawNgayHen: '2026-11-15T10:00:00',
    trangThai: 'HUY',
    coc: 200000,
    phiThu: 0,
    giaThue: 5200000,
    ghiChu: 'Khách bận việc đột xuất xin hủy hẹn.',
    lyDoHuy: 'Khách hàng có việc bận gia đình',
    hinhAnh: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  },
];

let mockTransactions: LandlordTransactionItem[] = [
  {
    id: 'GD01',
    maGiaoDich: 'GD2611170001',
    khachHangTen: 'Lê Hoàng Nam',
    phongTen: 'Phòng Studio Full Nội Thất View Đẹp',
    tienCoc: 200000,
    phiDichVu: 20000,
    thucNhan: 180000,
    trangThai: 'THANH_CONG',
    ngayGiaoDich: '17/11/2026 15:30',
    loaiGiaoDich: 'DA_THU',
  },
  {
    id: 'GD02',
    maGiaoDich: 'GD2611150002',
    khachHangTen: 'Phạm Minh Tuấn',
    phongTen: 'Phòng Cao Cấp Có Ban Công Liền Kề Q1',
    tienCoc: 200000,
    phiDichVu: 0,
    thucNhan: 200000,
    trangThai: 'HOAN_TIEN',
    ngayGiaoDich: '15/11/2026 11:00',
    loaiGiaoDich: 'HOAN_COC',
  },
  {
    id: 'GD03',
    maGiaoDich: 'GD2611120003',
    khachHangTen: 'Chủ trọ rút tiền',
    phongTen: 'Rút về MB Bank (0988776655)',
    tienCoc: 0,
    phiDichVu: 0,
    thucNhan: 1500000,
    trangThai: 'THANH_CONG',
    ngayGiaoDich: '12/11/2026 09:20',
    loaiGiaoDich: 'RUT_TIEN',
  },
  {
    id: 'GD04',
    maGiaoDich: 'GD2611100004',
    khachHangTen: 'Đặng Thanh Tâm',
    phongTen: 'Phòng Trọ Gác Cao Rộng Rãi',
    tienCoc: 200000,
    phiDichVu: 20000,
    thucNhan: 180000,
    trangThai: 'THANH_CONG',
    ngayGiaoDich: '10/11/2026 17:45',
    loaiGiaoDich: 'DA_THU',
  },
];

let mockWallet: LandlordWalletInfo = {
  soDu: 3860000,
  diemUyTin: 98,
  dsTaiKhoanNganHang: [
    { id: 1, soTaiKhoan: '0988776655', tenNganHang: 'MB Bank (Quân Đội)' },
    { id: 2, soTaiKhoan: '1029384756', tenNganHang: 'Vietcombank' },
  ],
  tongDaThu: 12450000,
  tongDaRut: 8590000,
};

let mockReviews: ReviewItem[] = [
  {
    id: 'RV01',
    khachHangTen: 'Lê Hoàng Nam',
    hinhDaiDien: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    phongTen: 'Phòng Studio Full Nội Thất View Đẹp',
    diem: 5,
    noiDung: 'Chủ trọ nhiệt tình, dẫn xem đúng giờ. Phòng thực tế đẹp và mới y như ảnh chụp, nội thất rất xịn xò!',
    thoiGian: '17/11/2026',
    phanHoi: 'Cảm ơn em nhiều nhé, cần hỗ trợ gì cứ nhắn chú nhé!',
  },
  {
    id: 'RV02',
    khachHangTen: 'Trần Thị Mai',
    hinhDaiDien: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    phongTen: 'Phòng Trọ Gác Cao Rộng Rãi',
    diem: 4,
    noiDung: 'Khu vực an ninh tốt, gần trường tiện đi lại, phòng thoáng mát.',
    thoiGian: '14/11/2026',
  },
];

let mockComplaints: ComplaintItem[] = [
  {
    id: 'KN01',
    maKhieuNai: 'KN2611140001',
    nguoiGuiTen: 'Nguyễn Văn Hoàng',
    doiTuongTen: 'Chủ trọ Trần Văn Khải',
    vanDe: 'Phản ánh tiếng ồn từ phòng bên cạnh vào ban đêm quá 23h nhiều lần.',
    trangThai: 'DA_XU_LI',
    mucDoViPham: 'NHE',
    ngayGui: '14/11/2026',
    ketQua: 'Chủ trọ đã nhắc nhở và cam kết giữ trật tự theo nội quy chung.',
  },
  {
    id: 'KN02',
    maKhieuNai: 'KN2611100002',
    nguoiGuiTen: 'Chủ trọ Trần Văn Khải',
    doiTuongTen: 'Khách thuê phòng 201',
    vanDe: 'Để xe sai vị trí trong bãi xe chung gây cản trở lối đi.',
    trangThai: 'DA_XU_LI',
    mucDoViPham: 'NHE',
    ngayGui: '10/11/2026',
    ketQua: 'Đã nhắc nhở trực tiếp và giải quyết êm đẹp.',
  },
];

export const landlordService = {
  // Upload hình ảnh lên Cloudinary qua Backend
  uploadImages: async (files: File[]): Promise<string[]> => {
    try {
      const urls = await uploadService.uploadMultipleImages(files, 'rooms');
      if (Array.isArray(urls) && urls.length > 0) {
        return urls;
      }
    } catch {
      // fallback nếu chưa bật backend: chuyển đổi files sang DataURL base64 để preview và lưu trữ
    }

    return Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    );
  },

  // Danh mục loại phòng và tiện ích
  getCategories: async (): Promise<CategoryItem[]> => {
    try {
      const res = await axiosClient.get('/api/room-types');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return MOCK_CATEGORIES;
  },

  getAmenities: async (): Promise<AmenityItem[]> => {
    try {
      const res = await axiosClient.get('/api/amenities');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return MOCK_AMENITIES;
  },

  // 1. Thống kê Dashboard
  getDashboardStats: async (): Promise<LandlordDashboardStats> => {
    try {
      const res = await axiosClient.get('/api/landlord/stats');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    const tongPhong = mockRooms.length;
    const phongChoDuyet = mockRooms.filter((r) => r.trangThai === 'CHO_DUYET').length;
    const dangTrong = mockRooms.filter((r) => r.trangThai === 'DA_DUYET' && !r.isRented).length;
    const dangThue = mockRooms.filter((r) => r.isRented || r.trangThai === 'HOAN_THANH').length;
    const yeuCauMoi = mockAppointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;

    return {
      tongPhong,
      phongChoDuyet,
      dangTrong,
      dangThue,
      tongDanhGia: mockReviews.length,
      diemDanhGia: '4.8',
      soDu: mockWallet.soDu,
      yeuCauMoi,
      tongPhongMoi: 2,
    };
  },

  // 2. Quản lý phòng trọ
  getMyRooms: async (): Promise<LandlordRoomItem[]> => {
    try {
      const res = await axiosClient.get('/api/landlord/rooms/my-rooms');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return [...mockRooms];
  },

  getRoomById: async (id: string): Promise<LandlordRoomItem | undefined> => {
    try {
      const res = await axiosClient.get(`/api/rooms/${id}`);
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return mockRooms.find((r) => r.id === id || r.maPhongTro === id);
  },

  createRoom: async (data: Partial<LandlordRoomItem>): Promise<LandlordRoomItem> => {
    try {
      const res = await axiosClient.post('/api/landlord/rooms', data);
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    const newRoom: LandlordRoomItem = {
      id: String(Date.now()),
      maPhongTro: `PT${Date.now().toString().slice(-8)}`,
      tenPhong: data.tenPhong || 'Phòng trọ mới',
      giaThue: Number(data.giaThue) || 3000000,
      cocPhong: Number(data.cocPhong) || Number(data.giaThue) || 3000000,
      dienTich: Number(data.dienTich) || 25,
      soNguoi: Number(data.soNguoi) || 2,
      trangThai: 'CHO_DUYET',
      isRented: false,
      hinhAnhUrl: data.hinhAnhUrl || '',
      danhSachAnh: data.danhSachAnh || (data.hinhAnhUrl ? [data.hinhAnhUrl] : []),
      diaChi: data.diaChi || 'TP. Hồ Chí Minh',
      kinhDo: data.kinhDo || 106.7,
      viDo: data.viDo || 10.8,
      moTa: data.moTa || '',
      loaiPhong: data.loaiPhong || 'Phòng trọ khép kín',
      maLpt: data.maLpt || 'LPT01',
      dsTienIch: data.dsTienIch || ['Máy lạnh', 'Wifi tốc độ cao'],
      thoiGianDang: new Date().toISOString().split('T')[0],
    };
    mockRooms.unshift(newRoom);
    return newRoom;
  },

  updateRoom: async (id: string, data: Partial<LandlordRoomItem>): Promise<LandlordRoomItem> => {
    try {
      const res = await axiosClient.put(`/api/landlord/rooms/${id}`, data);
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    const idx = mockRooms.findIndex((r) => r.id === id || r.maPhongTro === id);
    if (idx !== -1) {
      mockRooms[idx] = { ...mockRooms[idx], ...data };
      return mockRooms[idx];
    }
    throw new Error('Room not found');
  },

  deleteRoom: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/api/landlord/rooms/${id}`);
      return true;
    } catch {
      // fallback
    }
    mockRooms = mockRooms.filter((r) => r.id !== id && r.maPhongTro !== id);
    return true;
  },

  toggleRoomStatus: async (id: string): Promise<LandlordRoomItem> => {
    const room = mockRooms.find((r) => r.id === id || r.maPhongTro === id);
    if (!room) throw new Error('Not found');
    room.isRented = !room.isRented;
    return room;
  },

  // 3. Quản lý Lịch hẹn
  getAppointments: async (): Promise<LandlordAppointmentItem[]> => {
    try {
      const res = await axiosClient.get('/api/landlord/appointments');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return [...mockAppointments];
  },

  approveAppointment: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.put(`/api/landlord/appointments/${id}/confirm`);
      return true;
    } catch {
      // fallback
    }
    const item = mockAppointments.find((a) => a.id === id);
    if (item) {
      item.trangThai = 'XAC_NHAN';
      return true;
    }
    return false;
  },

  cancelAppointment: async (id: string, lyDoHuy: string): Promise<boolean> => {
    try {
      await axiosClient.put(`/api/landlord/appointments/${id}/cancel`, { lyDoHuy });
      return true;
    } catch {
      // fallback
    }
    const item = mockAppointments.find((a) => a.id === id);
    if (item) {
      item.trangThai = 'HUY';
      item.lyDoHuy = lyDoHuy;
      return true;
    }
    return false;
  },

  completeDeal: async (id: string, agreed: boolean): Promise<boolean> => {
    try {
      await axiosClient.put(`/api/landlord/appointments/${id}/deal`, { agreed });
      return true;
    } catch {
      // fallback
    }
    const item = mockAppointments.find((a) => a.id === id);
    if (item) {
      item.chuTroDongY = agreed;
      if (agreed && item.khachHangDongY) {
        item.trangThai = 'HOAN_THANH';
        mockWallet.soDu += (item.coc || 200000) - (item.phiThu || 20000);
      } else {
        item.trangThai = 'HUY';
        mockWallet.soDu += item.coc || 200000;
      }
      return true;
    }
    return false;
  },

  // 4. Quản lý Ví & Giao dịch
  getWalletInfo: async (): Promise<LandlordWalletInfo> => {
    try {
      const res = await axiosClient.get('/api/landlord/wallet');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return { ...mockWallet };
  },

  getTransactions: async (): Promise<LandlordTransactionItem[]> => {
    try {
      const res = await axiosClient.get('/api/landlord/transactions');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return [...mockTransactions];
  },

  requestWithdraw: async (soTien: number, soTaiKhoan: string, tenNganHang: string): Promise<boolean> => {
    try {
      await axiosClient.post('/api/landlord/wallet/withdraw', { soTien, soTaiKhoan, tenNganHang });
      return true;
    } catch {
      // fallback
    }
    if (soTien > mockWallet.soDu) throw new Error('Số dư không đủ để thực hiện giao dịch');
    mockWallet.soDu -= soTien;
    mockWallet.tongDaRut += soTien;
    mockTransactions.unshift({
      id: `GD${Date.now().toString().slice(-4)}`,
      maGiaoDich: `GD${Date.now().toString().slice(-10)}`,
      khachHangTen: 'Yêu cầu rút tiền',
      phongTen: `Rút về ${tenNganHang} (${soTaiKhoan})`,
      tienCoc: 0,
      phiDichVu: 0,
      thucNhan: soTien,
      trangThai: 'CHO_THANH_TOAN',
      ngayGiaoDich: 'Vừa xong',
      loaiGiaoDich: 'RUT_TIEN',
    });
    return true;
  },

  addBankAccount: async (soTaiKhoan: string, tenNganHang: string): Promise<BankAccountItem> => {
    const item: BankAccountItem = {
      id: Date.now(),
      soTaiKhoan,
      tenNganHang,
    };
    mockWallet.dsTaiKhoanNganHang.push(item);
    return item;
  },

  // 5. Đánh giá & Khiếu nại
  getReviews: async (): Promise<ReviewItem[]> => {
    try {
      const res = await axiosClient.get('/api/landlord/reviews');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return [...mockReviews];
  },

  replyReview: async (id: string, phanHoi: string): Promise<boolean> => {
    const r = mockReviews.find((item) => item.id === id);
    if (r) {
      r.phanHoi = phanHoi;
      return true;
    }
    return false;
  },

  getComplaints: async (): Promise<ComplaintItem[]> => {
    try {
      const res = await axiosClient.get('/api/landlord/complaints');
      if (res.data?.data) return res.data.data;
    } catch {
      // fallback
    }
    return [...mockComplaints];
  },
};
