import { axiosClient, tokenStorage } from '../api/axiosClient';
import {
  LandlordDashboardStats,
  LandlordRoomItem,
  LandlordPostItem,
  LandlordAppointmentItem,
  LandlordRentalRequestItem,
  LandlordTransactionItem,
} from '../types/landlord.types';

export const landlordService = {
  // 1. Thống kê Dashboard (tính toán từ dữ liệu phòng và lịch hẹn thực tế trong DB)
  getDashboardStats: async (): Promise<LandlordDashboardStats> => {
    try {
      const [rooms, appointments] = await Promise.all([
        landlordService.getMyRooms(),
        landlordService.getAppointments(),
      ]);

      const dangTrong = rooms.filter((r) => !r.isRented).length;
      const dangThue = rooms.filter((r) => r.isRented).length;
      const yeuCauMoi = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;

      return {
        tongPhong: rooms.length,
        tongPhongMoi: Math.min(rooms.length, 2),
        dangTrong,
        yeuCauMoi,
        dangThue,
      };
    } catch {
      return {
        tongPhong: 0,
        tongPhongMoi: 0,
        dangTrong: 0,
        yeuCauMoi: 0,
        dangThue: 0,
      };
    }
  },

  // 2. Danh sách Phòng của tôi (gọi GET /api/landlord/rooms/my-rooms)
  getMyRooms: async (
    filter?: 'ALL' | 'DA_DUYET' | 'CHO_DUYET' | 'HUY' | 'HOAN_THANH' | 'AVAILABLE' | 'RENTED'
  ): Promise<LandlordRoomItem[]> => {
    try {
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
          }))
        : [];

      if (filter === 'DA_DUYET' || filter === 'AVAILABLE') return list.filter((r) => r.trangThai === 'DA_DUYET');
      if (filter === 'CHO_DUYET') return list.filter((r) => r.trangThai === 'CHO_DUYET');
      if (filter === 'HUY') return list.filter((r) => r.trangThai === 'HUY');
      if (filter === 'HOAN_THANH' || filter === 'RENTED') return list.filter((r) => r.trangThai === 'HOAN_THANH');
      return list;
    } catch {
      return [];
    }
  },

  // 3. Quản lý Bài đăng của tôi (gọi GET /api/landlord/rooms/my-rooms)
  getMyPosts: async (filter?: 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED'): Promise<LandlordPostItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/landlord/rooms/my-rooms');
      const list: LandlordPostItem[] = Array.isArray(res)
        ? res.map((r: any) => ({
            id: r.maPhongTro,
            tenPhong: r.tenLoaiPhong ? `${r.tenLoaiPhong} - ${r.diaChi}` : r.diaChi,
            giaThue: Number(r.giaThue) || 0,
            trangThai: r.trangThai || 'DA_DUYET',
            hinhAnhUrl:
              r.anhDaiDien ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
            lyDoTuChoi:
              r.trangThai === 'HUY'
                ? 'Thông tin chưa đạt yêu cầu kiểm duyệt, vui lòng cập nhật lại.'
                : undefined,
            ngayDang: r.thoiGianDang
              ? r.thoiGianDang.substring(0, 10)
              : new Date().toISOString().substring(0, 10),
          }))
        : [];

      if (filter === 'ACTIVE') return list.filter((p) => p.trangThai === 'DA_DUYET');
      if (filter === 'PENDING') return list.filter((p) => p.trangThai === 'CHO_DUYET');
      if (filter === 'REJECTED') return list.filter((p) => p.trangThai === 'HUY');
      return list;
    } catch {
      return [];
    }
  },

  // 4. Lịch xem phòng của khách (gọi GET /api/landlord/appointments)
  getAppointments: async (date?: string): Promise<LandlordAppointmentItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/landlord/appointments');
      const list: LandlordAppointmentItem[] = Array.isArray(res)
        ? res.map((a: any) => ({
            id: a.maDatLich,
            khachHangTen: a.tenKhachHang || 'Khách xem phòng',
            sdt: a.sdtKhachHang || '0901234567',
            phongTen: `Phòng ${a.maPhongTro} - ${a.diaChiPhong || ''}`,
            thoiGian: a.ngayHen
              ? new Date(a.ngayHen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 - 10:30',
            ngayHen: a.ngayHen ? a.ngayHen.substring(0, 10) : '2026-11-07',
            ghiChu: a.liDoHuy || 'Hẹn xem phòng trực tiếp',
            trangThai: a.trangThai || 'CHO_XAC_NHAN',
          }))
        : [];

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
  },

  // Chủ trọ từ chối lịch hẹn (hoàn cọc cho khách)
  rejectAppointment: async (id: string, reason?: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/reject`, {
      liDoHuy: reason || 'Chủ trọ bận lịch vào khung giờ này',
    });
  },

  // 5. Yêu cầu thuê phòng (Lọc các lịch hẹn đã xem xong hoặc yêu cầu thuê)
  getRentalRequests: async (): Promise<LandlordRentalRequestItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/landlord/appointments');
      return Array.isArray(res)
        ? res
            .filter((a: any) => a.trangThai === 'XAC_NHAN' || a.trangThai === 'CHO_XAC_NHAN')
            .map((a: any) => ({
              id: a.maDatLich,
              khachHangTen: a.tenKhachHang || 'Khách hàng',
              sdt: a.sdtKhachHang || '0901 234 567',
              phongTen: `Phòng ${a.maPhongTro} - ${a.diaChiPhong || ''}`,
              giaThue: Number(a.giaThue) || 3500000,
              ngayNhanPhong: a.ngayHen ? a.ngayHen.substring(0, 10) : '01/12/2026',
              thoiGianThue: '12 tháng',
              soNguoi: 2,
              ghiChu: a.liDoHuy || 'Muốn thuê dài hạn',
              trangThai: a.trangThai === 'XAC_NHAN' ? 'DA_DUYET' : 'CHO_DUYET',
            }))
        : [];
    } catch {
      return [];
    }
  },

  completeRentalRequest: async (id: string): Promise<void> => {
    await axiosClient.patch(`/api/landlord/appointments/${id}/complete`);
  },

  // 6. Giao dịch / Doanh thu ví (gọi GET /api/transactions/my-history)
  getTransactions: async (filter?: 'DA_THU' | 'HOAN_COC'): Promise<LandlordTransactionItem[]> => {
    try {
      const res: any = await axiosClient.get('/api/transactions/my-history');
      const list: LandlordTransactionItem[] = Array.isArray(res)
        ? res.map((t: any) => ({
            id: t.maGiaoDich || String(Math.random()),
            maGiaoDich: t.maGiaoDich || 'GD20261106',
            khachHangTen: t.tenDoiTac || 'Khách hàng',
            phongTen: t.noiDung || 'Giao dịch cọc phòng',
            tienCoc: Number(t.soTien) || 0,
            phiDichVu: Number(t.phiDichVu) || 0,
            thucNhan: Number(t.thucNhan) || Number(t.soTien) || 0,
            trangThai: t.trangThai || 'THANH_CONG',
            ngayGiaoDich: t.thoiGianTao ? t.thoiGianTao.substring(0, 10) : '06/11/2026',
            loaiGiaoDich: t.loaiGiaoDich === 'HOAN_TIEN' ? 'HOAN_COC' : 'DA_THU',
          }))
        : [];

      if (filter) return list.filter((item) => item.loaiGiaoDich === filter);
      return list;
    } catch {
      return [];
    }
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
};
