import { axiosClient } from '@/api/axiosClient';
import { matchesTransactionType, TRANSACTION_TYPES } from '@/components/landlord/walletTransactions';
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

function mapRoomSummaryToLandlordItem(r: RoomSummaryResponse & { cocPhong?: number; tamAn?: boolean }): LandlordRoomItem {
  return {
    id: r.maPhongTro,
    maPhongTro: r.maPhongTro,
    tenPhong: r.tieuDe || `${r.tenLoaiPhong || 'Phòng trọ'} - ${r.diaChi.split(',')[0]}`,
    giaThue: r.giaThue,
    cocPhong: r.cocPhong,
    giaDien: r.giaDien,
    giaNuoc: r.giaNuoc,
    dienTich: r.dienTich,
    soNguoi: r.soNguoi,
    trangThai: r.trangThai || 'CHO_DUYET',
    isRented: r.trangThai === 'HOAN_THANH',
    tamAn: (r as typeof r & { tamAn?: boolean }).tamAn,
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
    giaDien: r.giaDien ?? 0,
    giaNuoc: r.giaNuoc ?? { gia: 0, theoNguoi: false },
    dienTich: r.dienTich,
    soNguoi: r.soNguoi,
    trangThai: r.trangThai || 'CHO_DUYET',
    isRented: r.trangThai === 'HOAN_THANH',
    tamAn: (r as typeof r & { tamAn?: boolean }).tamAn,
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

  getCategories: async (): Promise<CategoryItem[]> => {
    const list = await axiosClient.get<unknown, CategoryResponse[]>('/api/categories/room-types');
    return list.map((c) => ({
      maLpt: c.maLpt || c.maLoaiPhong || '',
      tenLoaiPhongTro: c.tenLoaiPhongTro || c.tenLoaiPhong || 'Phòng trọ',
      soTienCoc: c.soTienCoc,
      phiThu: c.phiThu,
    }));
  },

  getAmenities: async (): Promise<AmenityItem[]> => {
    return axiosClient.get<unknown, AmenityResponse[]>('/api/categories/amenities');
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
        : 'Chưa có';

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
    const list = await axiosClient.get<unknown, (RoomSummaryResponse & { cocPhong?: number; tamAn?: boolean })[]>('/api/landlord/rooms/my-rooms');
    return list.map(mapRoomSummaryToLandlordItem);
  },

  getRoomById: async (id: string): Promise<LandlordRoomItem | undefined> => {
    try {
      const detail = await axiosClient.get<unknown, RoomDetailResponse>(`/api/landlord/rooms/${id}`);
      return detail ? mapRoomDetailToLandlordItem(detail) : undefined;
    } catch {
      try {
        const publicDetail = await axiosClient.get<unknown, RoomDetailResponse>(`/api/rooms/${id}`);
        return publicDetail ? mapRoomDetailToLandlordItem(publicDetail) : undefined;
      } catch {
        return undefined;
      }
    }
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

  setRoomVisibility: async (id: string, tamAn: boolean): Promise<void> => {
    await axiosClient.patch(`/api/landlord/rooms/${id}/visibility`, { tamAn });
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
    const list = await axiosClient.get<unknown, AppointmentResponse[]>('/api/landlord/appointments');
    return list.map(mapAppointmentToLandlordItem);
  },

  approveAppointment: async (id: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/appointments/${id}/confirm`);
    return true;
  },

  cancelAppointment: async (id: string, liDoHuy: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/appointments/${id}/cancel`, {
      liDoHuy,
    });
    return true;
  },

  reportNoShow: async (id: string): Promise<boolean> => {
    await axiosClient.patch<unknown, string>(`/api/landlord/appointments/${id}/no-show`);
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
    return axiosClient.get<unknown, LandlordWalletInfo>('/api/landlord/wallet');
  },

  getTransactionsPage: async (params: {
    search: string;
    type: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page: number;
    size: number;
  }): Promise<{
    content: LandlordTransactionItem[];
    totalElements: number;
    totalPages: number;
    number: number;
  }> => {
    try {
      const cleanParams: Record<string, unknown> = {
        page: params.page,
        size: params.size,
      };
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.type?.trim()) cleanParams.type = params.type.trim();
      if (params.status?.trim()) cleanParams.status = params.status.trim();
      if (params.fromDate?.trim()) cleanParams.fromDate = params.fromDate.trim();
      if (params.toDate?.trim()) cleanParams.toDate = params.toDate.trim();

      const res = await axiosClient.get<
        unknown,
        {
          content: LandlordTransactionItem[];
          totalElements: number;
          totalPages: number;
          number: number;
        }
      >('/api/landlord/transactions', { params: cleanParams });

      if (res && Array.isArray(res.content)) {
        return res;
      }
    } catch {
      // Fallback về endpoint chính thức /api/transactions/my-history khi server chưa triển khai phân trang
    }

    try {
      const all = await landlordService.getTransactions();
      const keyword = (params.search || '').trim().toLocaleLowerCase('vi-VN');
      const filtered = (all || []).filter((tx) => {
        const date = tx.ngayGiaoDich ? tx.ngayGiaoDich.slice(0, 10) : '';
        const typeLabel = TRANSACTION_TYPES[tx.loaiGiaoDich] || '';
        const searchable = [
          tx.maGiaoDich,
          tx.noiDung,
          tx.maDatLich,
          tx.maPhongTro,
          tx.maThamChieuNganHang,
          typeLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('vi-VN');
        const matchesSearch = !keyword || searchable.includes(keyword);
        const matchesType = matchesTransactionType(tx, params.type);
        const matchesStatus = !params.status || tx.trangThai === params.status;
        const matchesFromDate = !params.fromDate || date >= params.fromDate;
        const matchesToDate = !params.toDate || date <= params.toDate;
        return matchesSearch && matchesType && matchesStatus && matchesFromDate && matchesToDate;
      });

      const pageSize = Math.max(1, params.size || 10);
      const totalElements = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
      const pageIndex = Math.min(Math.max(0, params.page), totalPages - 1);
      const content = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

      return {
        content,
        totalElements,
        totalPages,
        number: pageIndex,
      };
    } catch {
      return { content: [], totalElements: 0, totalPages: 1, number: 0 };
    }
  },

  getReceipt: async (id: string): Promise<LandlordTransactionItem> => {
    try {
      const res = await axiosClient.get<unknown, LandlordTransactionItem>(`/api/landlord/transactions/${id}`);
      if (res && res.maGiaoDich) return res;
    } catch {
      // fallback
    }
    const all = await landlordService.getTransactions();
    const found = all.find((t) => t.maGiaoDich === id);
    if (!found) throw new Error('Không tìm thấy giao dịch');
    return found;
  },

  getTransactions: async (): Promise<LandlordTransactionItem[]> => {
    return axiosClient.get<unknown, LandlordTransactionItem[]>('/api/transactions/my-history');
  },

  requestWithdraw: async (soTien: number, bankAccountId: number): Promise<TransactionResponse> => {
    return axiosClient.post<unknown, TransactionResponse>('/api/landlord/wallet/withdraw', {
      soTien,
      bankAccountId,
    });
  },

  deleteBankAccount: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/users/bank-accounts/${id}`);
  },

  setDefaultBankAccount: async (id: number): Promise<void> => {
    await axiosClient.patch(`/api/users/bank-accounts/${id}/default`);
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
      const list = await axiosClient.get<unknown, ReviewResponseDTO[]>('/api/landlord/reviews');
      if (Array.isArray(list)) {
        return list.map((r) => ({
          id: r.maDanhGia,
          maPhongTro: r.maPhongTro,
          khachHangTen: r.tenNguoiDung || r.tenDangNhap || 'Khách thuê',
          hinhDaiDien: r.hinhDaiDien,
          phongTen: r.tieuDePhong || r.diaChiPhong || `Phòng #${r.maPhongTro}`,
          diem: r.diem,
          noiDung: r.noiDung,
          thoiGian: r.ngayDanhGia,
        }));
      }
    throw new Error('Dữ liệu phản hồi không hợp lệ');
  },

  getComplaints: async (): Promise<ComplaintItem[]> => {
      const list = await axiosClient.get<unknown, ComplaintResponseDTO[]>(
        '/api/complaints/my-complaints',
        { params: { type: 'RECEIVED' } },
      );
      if (Array.isArray(list)) {
        return list.map((c) => ({
          id: String(c.id || c.maKhieuNai),
          maKhieuNai: c.maKhieuNai,
          nguoiGuiTen: c.tenNguoiGui || c.maNguoiGui || 'Người dùng',
          doiTuongTen: c.tenDoiTuongKhieuNai || c.tenDoiTuong || c.doiTuongKhieuNai,
          vanDe: c.vanDe,
          hinhAnh: c.hinhAnh,
          trangThai: c.trangThai,
          mucDoViPham: c.mucDoViPham,
          ngayGui: c.ngayGui || c.createdAt || c.ngayTao || '',
          ketQua: c.ketQua || c.ketLuan,
        }));
      }
    throw new Error('Dữ liệu phản hồi không hợp lệ');
  },
};
