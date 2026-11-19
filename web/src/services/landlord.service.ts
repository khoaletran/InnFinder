import { axiosClient } from '@/api/axiosClient';
import { uploadService } from '@/services/upload.service';
import type { ComplaintResponseDTO } from '@/types/auth-user.types';
import type { AppointmentResponse } from '@/types/booking.types';
import type {
  AmenityItem,
  BankAccountItem,
  CategoryItem,
  ComplaintItem,
  LandlordAppointmentItem,
  LandlordDashboardStats,
  LandlordRoomItem,
  LandlordTransactionItem,
  LandlordWalletInfo,
  ReviewItem,
  RoomCreatePayload,
  TrangThaiPhongTro,
} from '@/types/landlord.types';
import type { ReviewResponseDTO } from '@/types/review.types';
import type {
  AmenityResponse,
  CategoryResponse,
  RoomDetailResponse,
  RoomSummaryResponse,
} from '@/types/room.types';
import type { TransactionResponse } from '@/types/transaction.types';

// Dữ liệu dự phòng chuẩn Regex (LPT\d{3}, TI\d{4}, PTDDMMYYHHmmSS) chỉ dùng khi chưa bật Backend
const FALLBACK_CATEGORIES: CategoryItem[] = [
  { maLpt: 'LPT001', tenLoaiPhongTro: 'Phòng trọ khép kín', soTienCoc: 200000, phiThu: 20000 },
  { maLpt: 'LPT002', tenLoaiPhongTro: 'Căn hộ mini / Studio', soTienCoc: 300000, phiThu: 30000 },
  { maLpt: 'LPT003', tenLoaiPhongTro: 'Phòng trọ chung chủ', soTienCoc: 150000, phiThu: 15000 },
  { maLpt: 'LPT004', tenLoaiPhongTro: 'Nhà nguyên căn', soTienCoc: 500000, phiThu: 50000 },
  { maLpt: 'LPT005', tenLoaiPhongTro: 'Ký túc xá / Sleepbox', soTienCoc: 100000, phiThu: 10000 },
];

const FALLBACK_AMENITIES: AmenityItem[] = [
  { maTienIch: 'TI0001', tenTienIch: 'Máy lạnh', bieuTuong: 'wind' },
  { maTienIch: 'TI0002', tenTienIch: 'Tủ lạnh', bieuTuong: 'refrigerator' },
  { maTienIch: 'TI0003', tenTienIch: 'Máy giặt', bieuTuong: 'shirt' },
  { maTienIch: 'TI0004', tenTienIch: 'Wifi tốc độ cao', bieuTuong: 'wifi' },
  { maTienIch: 'TI0005', tenTienIch: 'Gác lửng', bieuTuong: 'home' },
  { maTienIch: 'TI0006', tenTienIch: 'Ban công thoáng mát', bieuTuong: 'sun' },
  { maTienIch: 'TI0007', tenTienIch: 'Camera an ninh', bieuTuong: 'video' },
  { maTienIch: 'TI0008', tenTienIch: 'Khóa vân tay', bieuTuong: 'lock' },
  { maTienIch: 'TI0009', tenTienIch: 'Chỗ để xe miễn phí', bieuTuong: 'bike' },
  { maTienIch: 'TI0010', tenTienIch: 'Bếp nấu ăn riêng', bieuTuong: 'flame' },
];

function mapRoomSummaryToLandlordItem(r: RoomSummaryResponse): LandlordRoomItem {
  return {
    id: r.maPhongTro,
    maPhongTro: r.maPhongTro,
    tenPhong: r.tieuDe || `${r.tenLoaiPhong || 'Phòng trọ'} - ${r.diaChi.split(',')[0]}`,
    giaThue: r.giaThue,
    cocPhong: r.giaThue,
    dienTich: r.dienTich,
    soNguoi: r.soNguoi,
    trangThai: r.trangThai || 'CHO_DUYET',
    isRented: r.trangThai === 'HOAN_THANH',
    hinhAnhUrl: r.anhDaiDien || r.hinhAnh?.[0]?.duongDan || '',
    danhSachAnh: r.hinhAnh?.map((img) => img.duongDan) || (r.anhDaiDien ? [r.anhDaiDien] : []),
    diaChi: r.diaChi,
    kinhDo: r.kinhDo,
    viDo: r.viDo,
    loaiPhong: r.tenLoaiPhong,
    maLpt: r.maLpt,
    dsTienIch: r.dsTienIch || [],
    thoiGianDang: r.thoiGianDang,
  };
}

function mapRoomDetailToLandlordItem(r: RoomDetailResponse): LandlordRoomItem {
  const images =
    r.dsHinhAnh?.map((i) => i.url) || r.hinhAnh?.map((i) => i.duongDan) || [];
  return {
    id: r.maPhongTro,
    maPhongTro: r.maPhongTro,
    tenPhong:
      r.tieuDe ||
      r.tenPhong ||
      `${r.loaiPhong?.tenLoaiPhongTro || r.loaiPhong?.tenLoaiPhong || 'Phòng trọ'} - ${r.diaChi.split(',')[0]}`,
    giaThue: r.giaThue,
    cocPhong: r.cocPhong ?? r.coc ?? r.giaThue,
    dienTich: r.dienTich,
    soNguoi: r.soNguoi,
    trangThai: r.trangThai || 'CHO_DUYET',
    isRented: r.trangThai === 'HOAN_THANH',
    hinhAnhUrl: images[0] || '',
    danhSachAnh: images,
    diaChi: r.diaChi,
    kinhDo: r.kinhDo,
    viDo: r.viDo,
    moTa: r.moTa,
    loaiPhong: r.loaiPhong?.tenLoaiPhongTro || r.loaiPhong?.tenLoaiPhong,
    maLpt: r.loaiPhong?.maLpt || r.loaiPhong?.maLoaiPhong,
    dsTienIch: r.dsTienIch?.map((a) => a.tenTienIch) || [],
    dsMaTienIch: r.dsTienIch?.map((a) => a.maTienIch) || [],
    thoiGianDang: r.thoiGianDang,
  };
}

function mapAppointmentToLandlordItem(a: AppointmentResponse): LandlordAppointmentItem {
  const [datePart, timePart] = (a.ngayHen || '').split('T');
  return {
    id: a.maDatLich,
    khachHangTen: a.tenKhachHang || 'Khách hàng',
    sdt: a.sdtKhachHang || '',
    maKhachHang: a.maKhachHang,
    phongTen: a.tieuDePhong || a.diaChiPhong || `Phòng #${a.maPhongTro}`,
    maPhongTro: a.maPhongTro,
    diaChiPhong: a.diaChiPhong,
    ngayHen: datePart || a.ngayHen,
    thoiGian: timePart ? timePart.slice(0, 5) : '09:00',
    rawNgayHen: a.ngayHen,
    trangThai: a.trangThai,
    coc: a.coc,
    phiThu: a.phiThu,
    giaThue: a.giaThue,
    hinhAnh: a.hinhAnh,
    daNhanLaiCoc: a.daNhanLaiCoc,
    daNopCoc: a.daNopCoc,
    khachHangDongY: a.khachHangDongY,
    chuTroDongY: a.chuTroDongY,
    lyDoHuy: a.liDoHuy,
  };
}

export const landlordService = {
  uploadImages: async (files: File[]): Promise<string[]> => {
    const urls = await uploadService.uploadMultipleImages(files, 'rooms');
    return Array.isArray(urls) ? urls : [];
  },

  // GET /api/categories/room-types (axiosClient đã unwrap trực tiếp data)
  getCategories: async (): Promise<CategoryItem[]> => {
    try {
      const list = await axiosClient.get<unknown, CategoryResponse[]>('/api/categories/room-types');
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c) => ({
          maLpt: c.maLpt || c.maLoaiPhong || 'LPT001',
          tenLoaiPhongTro: c.tenLoaiPhongTro || c.tenLoaiPhong || 'Phòng trọ',
          soTienCoc: c.soTienCoc,
          phiThu: c.phiThu,
        }));
      }
    } catch {
      // fallback offline
    }
    return FALLBACK_CATEGORIES;
  },

  // GET /api/categories/amenities
  getAmenities: async (): Promise<AmenityItem[]> => {
    try {
      const list = await axiosClient.get<unknown, AmenityResponse[]>('/api/categories/amenities');
      if (Array.isArray(list) && list.length > 0) {
        return list.map((a) => ({
          maTienIch: a.maTienIch,
          tenTienIch: a.tenTienIch,
        }));
      }
    } catch {
      // fallback offline
    }
    return FALLBACK_AMENITIES;
  },

  // 1. Tổng hợp thống kê Dashboard từ API thực tế
  getDashboardStats: async (): Promise<LandlordDashboardStats> => {
    const [rooms, appointments, wallet, reviews] = await Promise.all([
      landlordService.getMyRooms(),
      landlordService.getAppointments(),
      landlordService.getWalletInfo(),
      landlordService.getReviews(),
    ]);

    const tongPhong = rooms.length;
    const phongChoDuyet = rooms.filter((r) => r.trangThai === 'CHO_DUYET').length;
    const dangTrong = rooms.filter((r) => r.trangThai === 'DA_DUYET').length;
    const dangThue = rooms.filter((r) => r.trangThai === 'HOAN_THANH').length;
    const yeuCauMoi = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;
    const avgScore =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.diem, 0) / reviews.length).toFixed(1)
        : '5.0';

    return {
      tongPhong,
      phongChoDuyet,
      dangTrong,
      dangThue,
      tongDanhGia: reviews.length,
      diemDanhGia: avgScore,
      soDu: wallet.soDu,
      diemUyTin: wallet.diemUyTin,
      yeuCauMoi,
      tongPhongMoi: phongChoDuyet,
    };
  },

  // 2. Quản lý phòng trọ (LandlordRoomController)
  getMyRooms: async (): Promise<LandlordRoomItem[]> => {
    try {
      const list = await axiosClient.get<unknown, RoomSummaryResponse[]>(
        '/api/landlord/rooms/my-rooms',
      );
      if (Array.isArray(list)) {
        return list.map(mapRoomSummaryToLandlordItem);
      }
    } catch {
      // return empty if unauthenticated/offline
    }
    return [];
  },

  getRoomById: async (id: string): Promise<LandlordRoomItem | undefined> => {
    const detail = await axiosClient.get<unknown, RoomDetailResponse>(`/api/rooms/${id}`);
    return detail ? mapRoomDetailToLandlordItem(detail) : undefined;
  },

  createRoom: async (payload: RoomCreatePayload): Promise<LandlordRoomItem> => {
    const created = await axiosClient.post<unknown, RoomDetailResponse>(
      '/api/landlord/rooms',
      payload,
    );
    return mapRoomDetailToLandlordItem(created);
  },

  updateRoom: async (id: string, payload: Partial<RoomCreatePayload>): Promise<LandlordRoomItem> => {
    const updated = await axiosClient.put<unknown, RoomDetailResponse>(
      `/api/landlord/rooms/${id}`,
      payload,
    );
    return mapRoomDetailToLandlordItem(updated);
  },

  updateRoomStatus: async (id: string, trangThai: TrangThaiPhongTro): Promise<void> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/rooms/${id}/status`, { trangThai });
  },

  deleteRoom: async (id: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/rooms/${id}/status`, {
      trangThai: 'HUY',
    });
    return true;
  },

  toggleRoomStatus: async (id: string, currentStatus: TrangThaiPhongTro): Promise<TrangThaiPhongTro> => {
    const nextStatus: TrangThaiPhongTro =
      currentStatus === 'HOAN_THANH' ? 'DA_DUYET' : 'HOAN_THANH';
    await axiosClient.patch<unknown, string>(`/api/landlord/rooms/${id}/status`, {
      trangThai: nextStatus,
    });
    return nextStatus;
  },

  // 3. Quản lý lịch hẹn xem phòng (LandlordAppointmentController)
  getAppointments: async (): Promise<LandlordAppointmentItem[]> => {
    try {
      const list = await axiosClient.get<unknown, AppointmentResponse[]>(
        '/api/landlord/appointments',
      );
      if (Array.isArray(list)) {
        return list.map(mapAppointmentToLandlordItem);
      }
    } catch {
      // offline
    }
    return [];
  },

  approveAppointment: async (id: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/appointments/${id}/confirm`);
    return true;
  },

  cancelAppointment: async (id: string, liDoHuy: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/appointments/${id}/reject`, {
      liDoHuy,
    });
    return true;
  },

  submitDecision: async (
    id: string,
    dongY: boolean,
    liDoTuChoi?: string,
  ): Promise<LandlordAppointmentItem> => {
    const res = await axiosClient.patch<unknown, AppointmentResponse>(
      `/api/landlord/appointments/${id}/decision`,
      { dongY, liDoTuChoi },
    );
    return mapAppointmentToLandlordItem(res);
  },

  // 4. Quản lý Ví & Giao dịch (TransactionController & UserController)
  getWalletInfo: async (): Promise<LandlordWalletInfo> => {
    try {
      const info = await axiosClient.get<unknown, LandlordWalletInfo>('/api/landlord/wallet');
      if (info) {
        return {
          soDu: info.soDu ?? 0,
          diemUyTin: info.diemUyTin ?? 100,
          dsTaiKhoanNganHang: info.dsTaiKhoanNganHang || [],
          tongDaThu: info.tongDaThu ?? 0,
          tongDaRut: info.tongDaRut ?? 0,
        };
      }
    } catch {
      // fallback
    }
    return {
      soDu: 0,
      diemUyTin: 100,
      dsTaiKhoanNganHang: [],
      tongDaThu: 0,
      tongDaRut: 0,
    };
  },

  getTransactions: async (): Promise<LandlordTransactionItem[]> => {
    try {
      const list = await axiosClient.get<unknown, TransactionResponse[]>(
        '/api/transactions/my-history',
      );
      if (Array.isArray(list)) {
        return list.map((tx) => {
          const isWithdraw =
            tx.loaiGiaoDich === 'RUT_TIEN' || tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN';
          const isRefund = tx.loaiGiaoDich === 'HOAN_COC' || tx.trangThai === 'HOAN_TIEN';
          return {
            id: tx.maGiaoDich,
            maGiaoDich: tx.maGiaoDich,
            khachHangTen: isWithdraw ? 'Rút tiền về ngân hàng' : 'Đối soát cọc lịch xem',
            phongTen: tx.noiDung,
            tienCoc: isWithdraw ? 0 : tx.soTien,
            phiDichVu: 0,
            thucNhan: tx.soTien,
            trangThai: tx.trangThai,
            ngayGiaoDich: tx.ngayGiaoDich,
            loaiGiaoDich: isWithdraw ? 'RUT_TIEN' : isRefund ? 'HOAN_COC' : 'DA_THU',
          };
        });
      }
    } catch {
      // fallback
    }
    return [];
  },

  requestWithdraw: async (
    soTien: number,
    soTaiKhoan: string,
    tenNganHang: string,
  ): Promise<boolean> => {
    await axiosClient.post<unknown, TransactionResponse>('/api/landlord/wallet/withdraw', {
      soTien,
      soTaiKhoan,
      tenNganHang,
    });
    return true;
  },

  addBankAccount: async (
    soTaiKhoan: string,
    tenNganHang: string,
    tenChuTaiKhoan?: string,
  ): Promise<BankAccountItem> => {
    return axiosClient.post<unknown, BankAccountItem>('/api/users/bank-accounts', {
      soTaiKhoan,
      tenNganHang,
      tenChuTaiKhoan,
    });
  },

  // 5. Đánh giá & Khiếu nại (ReviewController & ComplaintController)
  getReviews: async (): Promise<ReviewItem[]> => {
    try {
      const list = await axiosClient.get<unknown, ReviewResponseDTO[]>('/api/landlord/reviews');
      if (Array.isArray(list)) {
        return list.map((r) => ({
          id: r.maDanhGia,
          khachHangTen: r.tenNguoiDung || r.tenDangNhap || 'Khách thuê',
          hinhDaiDien: r.hinhDaiDien,
          phongTen: r.tieuDePhong || r.diaChiPhong || `Phòng #${r.maPhongTro}`,
          diem: r.diem,
          noiDung: r.noiDung,
          thoiGian: r.ngayDanhGia,
        }));
      }
    } catch {
      // fallback
    }
    return [];
  },

  getComplaints: async (): Promise<ComplaintItem[]> => {
    try {
      const list = await axiosClient.get<unknown, ComplaintResponseDTO[]>(
        '/api/complaints/my-complaints',
        { params: { type: 'RECEIVED' } },
      );
      if (Array.isArray(list)) {
        return list.map((c) => ({
          id: String(c.id || c.maKhieuNai),
          maKhieuNai: c.maKhieuNai,
          nguoiGuiTen: c.tenNguoiGui || c.maNguoiGui || 'Người dùng',
          doiTuongTen: c.tenDoiTuong || c.doiTuongKhieuNai,
          vanDe: c.vanDe,
          hinhAnh: c.hinhAnh,
          trangThai: c.trangThai,
          mucDoViPham: c.mucDoViPham || 'NHE',
          ngayGui: c.ngayGui || c.createdAt || c.ngayTao || '',
          ketQua: c.ketQua || c.ketLuan,
        }));
      }
    } catch {
      // fallback
    }
    return [];
  },
};
