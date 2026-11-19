import { uploadService } from './upload.service';
import { axiosClient, tokenStorage, BASE_URL } from '../api/axiosClient';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  LandlordDashboardStats,
  LandlordRoomItem,
  LandlordPostItem,
  LandlordAppointmentItem,
  LandlordRentalRequestItem,
  LandlordTransactionItem,
  LandlordWalletInfo,
  WithdrawPayload,
  BankAccountItem,
} from '../types/landlord.types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30s cache bộ nhớ
let myRoomsCache: CacheEntry<LandlordRoomItem[]> | null = null;
let appointmentsCache: CacheEntry<LandlordAppointmentItem[]> | null = null;

const filterRooms = (
  list: LandlordRoomItem[],
  filter?: 'ALL' | 'DA_DUYET' | 'CHO_DUYET' | 'HUY' | 'HOAN_THANH' | 'AVAILABLE' | 'RENTED'
) => {
  if (filter === 'DA_DUYET' || filter === 'AVAILABLE') return list.filter((r) => r.trangThai === 'DA_DUYET');
  if (filter === 'CHO_DUYET') return list.filter((r) => r.trangThai === 'CHO_DUYET');
  if (filter === 'HUY') return list.filter((r) => r.trangThai === 'HUY');
  if (filter === 'HOAN_THANH' || filter === 'RENTED') return list.filter((r) => r.trangThai === 'HOAN_THANH');
  return list;
};

export const landlordService = {
  // Xóa cache khi có cập nhật mới
  clearCache: () => {
    myRoomsCache = null;
    appointmentsCache = null;
  },
  // 1. Thống kê Dashboard (tính toán từ dữ liệu phòng và lịch hẹn thực tế trong DB)
  getDashboardStats: async (): Promise<LandlordDashboardStats> => {
    try {
      const [rooms, appointments, reviews, wallet] = await Promise.all([
        landlordService.getMyRooms(),
        landlordService.getAppointments(),
        landlordService.getLandlordReviews(),
        landlordService.getWalletInfo(),
      ]);

      const tongPhong = rooms.length;
      const phongChoDuyet = rooms.filter((r) => r.trangThai === 'CHO_DUYET').length;
      const dangTrong = rooms.filter((r) => r.trangThai === 'DA_DUYET' && !r.isRented).length;
      const dangThue = rooms.filter((r) => r.isRented || r.trangThai === 'HOAN_THANH').length;
      const yeuCauMoi = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;

      const tongDanhGia = Array.isArray(reviews) ? reviews.length : 0;
      let diemDanhGia: number | string = '5.0';
      if (tongDanhGia > 0) {
        const sum = reviews.reduce((acc: number, cur: any) => acc + (Number(cur.diem) || 5), 0);
        diemDanhGia = (sum / tongDanhGia).toFixed(1);
      }

      const soDu = wallet?.soDu ?? 0;

      return {
        tongPhong,
        phongChoDuyet,
        dangTrong,
        tongDanhGia,
        diemDanhGia,
        soDu,
        tongPhongMoi: Math.min(rooms.length, 2),
        yeuCauMoi,
        dangThue,
      };
    } catch {
      return {
        tongPhong: 0,
        phongChoDuyet: 0,
        dangTrong: 0,
        tongDanhGia: 0,
        diemDanhGia: '5.0',
        soDu: 0,
        tongPhongMoi: 0,
        yeuCauMoi: 0,
        dangThue: 0,
      };
    }
  },

  // 2. Danh sách Phòng của tôi (gọi GET /api/landlord/rooms/my-rooms)
  getMyRooms: async (
    filter?: 'ALL' | 'DA_DUYET' | 'CHO_DUYET' | 'HUY' | 'HOAN_THANH' | 'AVAILABLE' | 'RENTED',
    forceRefresh = false
  ): Promise<LandlordRoomItem[]> => {
    try {
      const now = Date.now();
      if (!forceRefresh && myRoomsCache && now - myRoomsCache.timestamp < CACHE_TTL) {
        return filterRooms(myRoomsCache.data, filter);
      }
      const res: any = await axiosClient.get('/api/landlord/rooms/my-rooms');
      const list: LandlordRoomItem[] = Array.isArray(res)
        ? res.map((r: any) => ({
            id: r.maPhongTro,
            maPhongTro: r.maPhongTro,
            tenPhong: r.tenLoaiPhong ? `${r.tenLoaiPhong} - ${r.diaChi}` : r.diaChi,
            giaThue: Number(r.giaThue) || 0,
            dienTich: Number(r.dienTich) || 0,
            trangThai: r.trangThai || 'DA_DUYET',
            isRented: r.trangThai === 'HOAN_THANH',
            hinhAnhUrl:
              r.anhDaiDien ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
            diaChi: r.diaChi || 'TP. Hồ Chí Minh',
            thoiGianDang: r.thoiGianDang,
          }))
        : [];

      myRoomsCache = { data: list, timestamp: now };
      return filterRooms(list, filter);




    } catch {
      return [];
    }
  },

  // 3. Quản lý Bài đăng của tôi (gọi GET /api/landlord/rooms/my-rooms)
  getMyPosts: async (filter?: 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED', forceRefresh = false): Promise<LandlordPostItem[]> => {
    try {
      const rooms = await landlordService.getMyRooms('ALL', forceRefresh);
      const list: LandlordPostItem[] = rooms.map((r) => ({
        id: r.id,
        tenPhong: r.tenPhong,
        giaThue: r.giaThue,
        trangThai: r.trangThai,
        hinhAnhUrl: r.hinhAnhUrl,
        lyDoTuChoi:
          r.trangThai === 'HUY'
            ? 'Thông tin chưa đạt yêu cầu kiểm duyệt, vui lòng cập nhật lại.'
            : undefined,
        ngayDang: r.thoiGianDang
          ? r.thoiGianDang.substring(0, 10)
          : new Date().toISOString().substring(0, 10),
      }));

      if (filter === 'ACTIVE') return list.filter((p) => p.trangThai === 'DA_DUYET');
      if (filter === 'PENDING') return list.filter((p) => p.trangThai === 'CHO_DUYET');
      if (filter === 'REJECTED') return list.filter((p) => p.trangThai === 'HUY');
      return list;
    } catch {
      return [];
    }
  },
  // 4. Lịch xem phòng của khách (gọi GET /api/landlord/appointments kèm cache)
  getAppointments: async (date?: string, forceRefresh = false): Promise<LandlordAppointmentItem[]> => {
    try {
      const now = Date.now();
      if (!forceRefresh && appointmentsCache && now - appointmentsCache.timestamp < CACHE_TTL) {
        return date ? appointmentsCache.data.filter((a) => a.ngayHen === date) : appointmentsCache.data;
      }
      const res: any = await axiosClient.get('/api/landlord/appointments');
      const list: LandlordAppointmentItem[] = Array.isArray(res)
        ? res.map((a: any) => ({
            id: a.maDatLich,
            khachHangTen: a.tenKhachHang || 'Khách xem phòng',
            sdt: a.sdtKhachHang || '0901234567',
            emailKhachHang: a.emailKhachHang,
            maKhachHang: a.maKhachHang,
            phongTen: a.tieuDePhong || `Phòng ${a.maPhongTro} - ${a.diaChiPhong || ''}`,
            thoiGian: a.ngayHen
              ? new Date(a.ngayHen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 - 10:30',
            ngayHen: a.ngayHen ? a.ngayHen.substring(0, 10) : '2026-11-07',
            rawNgayHen: a.ngayHen,
            ghiChu: a.liDoHuy || undefined,
            trangThai: a.trangThai || 'CHO_XAC_NHAN',
            maPhongTro: a.maPhongTro,
            diaChiPhong: a.diaChiPhong,
            giaThue: Number(a.giaThue) || 0,
            coc: Number(a.coc) || 0,
            phiThu: Number(a.phiThu) || 0,
            hinhAnh: a.hinhAnh,
            daNhanLaiCoc: !!a.daNhanLaiCoc,
            daNopCoc: !!a.daNopCoc,
            khachHangDongY: a.khachHangDongY,
            chuTroDongY: a.chuTroDongY,
          }))
        : [];

      appointmentsCache = { data: list, timestamp: now };
      if (date) {
        return list.filter((a) => a.ngayHen === date);
      }
      return list;
    } catch {
      return [];
    }
  },

  // Chủ trọ bấm xác nhận lịch hẹn xem phòng
  confirmAppointment: async (id: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/confirm`);
    landlordService.clearCache();
  },

  // Chủ trọ từ chối lịch hẹn (hoàn cọc cho khách)
  rejectAppointment: async (id: string, reason?: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/reject`, {
      liDoHuy: reason || 'Chủ trọ bận lịch vào khung giờ này',
    });
    landlordService.clearCache();
  },

  // Chủ trọ đưa ra quyết định độc lập (Cho thuê / Từ chối cho thuê)
  submitLandlordDecision: async (id: string, dongY: boolean, reason?: string): Promise<any> => {
    const res = await axiosClient.patch(`/api/landlord/appointments/${id}/decision`, {
      dongY,
      liDoTuChoi: reason,
    });
    landlordService.clearCache();
    return res;
  },

  // Chủ trọ chốt cho thuê phòng thành công sau khi xem (hoàn cọc khách, cộng tiền chủ trọ, đóng phòng)
  completeAppointment: async (id: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/complete`);
    landlordService.clearCache();
  },

  // Chủ trọ hủy hoặc xác nhận khách không thuê sau khi xem (hoàn cọc cho khách, giữ lại phòng)
  cancelAppointmentByLandlord: async (id: string, reason?: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/cancel`, {
      liDoHuy: reason || 'Không thuê sau khi xem phòng',
    });
    landlordService.clearCache();
  },

  // 5. Yêu cầu thuê phòng (Tái sử dụng getAppointments, không bắn request trùng)
  getRentalRequests: async (forceRefresh = false): Promise<LandlordRentalRequestItem[]> => {
    try {
      const appointments = await landlordService.getAppointments(undefined, forceRefresh);
      return appointments
        .filter((a: any) => a.trangThai === 'XAC_NHAN' || a.trangThai === 'CHO_XAC_NHAN')
        .map((a: any) => ({
          id: a.id,
          khachHangTen: a.khachHangTen || 'Khách hàng',
          sdt: a.sdt || '0901 234 567',
          phongTen: a.phongTen,
          giaThue: Number(a.giaThue) || 3500000,
          ngayNhanPhong: a.ngayHen || '01/12/2026',
          thoiGianThue: '12 tháng',
          soNguoi: 2,
          ghiChu: a.ghiChu || 'Muốn thuê dài hạn',
          trangThai: a.trangThai === 'XAC_NHAN' ? 'DA_DUYET' : 'CHO_DUYET',
        }));
    } catch {
      return [];
    }
  },

  completeRentalRequest: async (id: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/complete`);
  },

  // 6. Giao dịch / Doanh thu ví (gọi GET /api/transactions/my-history)
  getTransactions: async (filter?: 'DA_THU' | 'HOAN_COC' | 'RUT_TIEN'): Promise<LandlordTransactionItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/transactions/my-history');
      const list: LandlordTransactionItem[] = Array.isArray(res)
        ? res.map((t: any) => {
            const isWithdraw = t.loaiGiaoDich === 'RUT_TIEN';
            const isRefund = t.loaiGiaoDich === 'HOAN_TIEN' || t.loaiGiaoDich === 'HOAN_COC';
            return {
              id: t.maGiaoDich || String(Math.random()),
              maGiaoDich: t.maGiaoDich || 'GD20261106',
              khachHangTen: isWithdraw ? 'Rút về tài khoản ngân hàng' : (t.tenDoiTac || 'Khách hàng'),
              phongTen: t.noiDung || (isWithdraw ? 'Yêu cầu rút tiền' : 'Giao dịch cọc phòng'),
              tienCoc: Number(t.soTien) || 0,
              phiDichVu: Number(t.phiDichVu) || 0,
              thucNhan: Number(t.thucNhan) || Number(t.soTien) || 0,
              trangThai: t.trangThai || 'THANH_CONG',
              ngayGiaoDich: t.ngayGiaoDich ? t.ngayGiaoDich.substring(0, 10) : (t.thoiGianTao ? t.thoiGianTao.substring(0, 10) : '06/11/2026'),
              thoiGianTao: t.ngayGiaoDich || t.thoiGianTao,
              loaiGiaoDich: isWithdraw ? 'RUT_TIEN' : (isRefund ? 'HOAN_COC' : 'DA_THU'),
            };
          })
        : [];

      if (filter) return list.filter((item) => item.loaiGiaoDich === filter);
      return list;

    } catch {
      return [];
    }
  },

  // 6.1. Thông tin ví chủ trọ (GET /api/landlord/wallet)
  getWalletInfo: async (): Promise<LandlordWalletInfo | null> => {
    try {
      const res: any = await axiosClient.get('/api/landlord/wallet');
      return res || null;
    } catch {
      return null;
    }
  },

  // 6.2. Yêu cầu rút tiền về ngân hàng (POST /api/landlord/wallet/withdraw)
  withdrawMoney: async (payload: WithdrawPayload): Promise<any> => {
    return await axiosClient.post('/api/landlord/wallet/withdraw', payload);
  },

  // 6.3. Lấy danh sách tài khoản ngân hàng của tôi (GET /api/users/bank-accounts)
  getMyBankAccounts: async (): Promise<BankAccountItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/users/bank-accounts');
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },

  // 6.4. Thêm mới tài khoản ngân hàng liên kết (POST /api/users/bank-accounts)
  addBankAccount: async (payload: { soTaiKhoan: string; tenNganHang: string }): Promise<any> => {
    return await axiosClient.post('/api/users/bank-accounts', payload);
  },

  // 6.5. Hủy liên kết tài khoản ngân hàng (DELETE /api/users/bank-accounts/{id})
  deleteBankAccount: async (id: number | string): Promise<any> => {
    return await axiosClient.delete(`/api/users/bank-accounts/${id}`);
  },

  // 7. Lấy danh mục Loại phòng & Tiện ích từ Backend
  getRoomTypes: async (): Promise<any[]> => {
    try {
      const res: any = await axiosClient.get('/api/categories/room-types');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getAmenities: async (): Promise<any[]> => {
    try {
      const res: any = await axiosClient.get('/api/categories/amenities');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  // 8. Đăng tin phòng trọ mới (POST /api/landlord/rooms)
  createRoom: async (payload: any): Promise<any> => {
    return await axiosClient.post('/api/landlord/rooms', payload);
  },

  // 8.0. Cập nhật thông tin phòng trọ (PUT /api/landlord/rooms/{id})
  updateRoom: async (id: string, payload: any): Promise<any> => {
    return await axiosClient.put(`/api/landlord/rooms/${id}`, payload);
  },

  // 8.0.1. Cập nhật trạng thái phòng trọ (PATCH /api/landlord/rooms/{id}/status)
  updateRoomStatus: async (id: string, trangThai: 'DA_DUYET' | 'HOAN_THANH'): Promise<any> => {
    return await axiosClient.patch(`/api/landlord/rooms/${id}/status`, { trangThai });
  },

  // 8.1. Upload danh sách ảnh lên Cloudinary qua API Backend (POST /api/upload/images)
  uploadImages: async (imageUris: string[]): Promise<string[]> => {
    return uploadService.uploadMultipleImages(imageUris, 'rooms');
  },

  // 9. Quản lý khiếu nại (GET /api/complaints/my-complaints)
  getMyComplaints: async (type: 'RECEIVED' | 'SENT' = 'RECEIVED'): Promise<any[]> => {
    try {
      const res: any = await axiosClient.get(`/api/complaints/my-complaints?type=${type}`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },

  // 10. Xem tất cả đánh giá của khách thuê dành cho chủ trọ (GET /api/landlord/reviews)
  getLandlordReviews: async (): Promise<any[]> => {
    try {
      const res: any = await axiosClient.get('/api/landlord/reviews');
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },
};
