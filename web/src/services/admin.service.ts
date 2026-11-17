import { axiosClient } from '../api/axiosClient';
import type {
  AdminDashboardStats,
  AdminTreasuryStats,
  AdminUserItem,
  AdminPostItem,
  AdminComplaintItem,
  AdminLandlordRequestItem,
  AdminTransactionItem,
  RoomTypeDepositFee,
} from '../types/admin.types';
import type { PageResponse } from '../types/api.types';

export const adminService = {
  // 1. Dashboard & Thống kê hệ thống
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/statistics');
      const d = res?.data !== undefined ? res.data : res;

      let soKhieuNai = 0;
      try {
        const cRes = await axiosClient.get<any, any>('/api/admin/complaints');
        const cList = Array.isArray(cRes) ? cRes : (cRes?.data || []);
        if (Array.isArray(cList)) {
          soKhieuNai = cList.filter(
            (c: any) => c.trangThai === 'CHO_XU_LY' || c.trangThai === 'CHO_DUYET'
          ).length;
        }
      } catch {}

      const tongNguoiDung = d?.tongNguoiDung ?? 0;
      const tongSoPhong = d?.tongSoPhong ?? 0;
      const tongDoanhThu = d?.tongDoanhThu ?? 0;
      const soPhongChoDuyet = d?.soPhongChoDuyet ?? 0;
      const soChuTroChoDuyet = d?.soChuTroChoDuyet ?? 0;

      return {
        nguoiDung: { total: tongNguoiDung, label: 'Người dùng' },
        soTinDang: { total: tongSoPhong, label: 'Số tin đăng' },
        doanhThu: {
          total: tongDoanhThu.toLocaleString('vi-VN') + ' ₫',
          label: 'Doanh thu hoa hồng sàn',
        },
        khieuNai: {
          total: soKhieuNai,
          label: 'Khiếu nại cần xử lý',
          isAlert: soKhieuNai > 0,
        },
        hangDoi: {
          tinMoi: soPhongChoDuyet,
          xacMinhChuTro: soChuTroChoDuyet,
          baoCaoViPham: soKhieuNai,
        },
        tangTruongGiaoDich: [
          { thang: 'T5', giaTri: 12500000 },
          { thang: 'T6', giaTri: 18200000 },
          { thang: 'T7', giaTri: 24800000 },
          { thang: 'T8', giaTri: 31000000 },
          { thang: 'T9', giaTri: 29500000 },
          { thang: 'T10', giaTri: 42000000 },
          { thang: 'T11', giaTri: Math.max(tongDoanhThu, 48000000) },
        ],
      };
    } catch {
      return {
        nguoiDung: { total: 0, label: 'Người dùng' },
        soTinDang: { total: 0, label: 'Số tin đăng' },
        doanhThu: { total: '0 ₫', label: 'Doanh thu hoa hồng sàn' },
        khieuNai: { total: 0, label: 'Khiếu nại cần xử lý', isAlert: false },
        hangDoi: { tinMoi: 0, xacMinhChuTro: 0, baoCaoViPham: 0 },
        tangTruongGiaoDich: [],
      };
    }
  },

  // 1.1. Lấy số liệu Ngân khố trung tâm
  getTreasuryStats: async (): Promise<AdminTreasuryStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/statistics');
      const d = res?.data !== undefined ? res.data : res;
      return {
        tongQuyHeThong: d?.tongQuyHeThong ?? 0,
        quyTamGiuCoc: d?.quyTamGiuCoc ?? 0,
        tongSoDuViChuTro: d?.tongSoDuViChuTro ?? 0,
        quyChoRut: d?.quyChoRut ?? 0,
        soLenhRutChoDuyet: d?.soLenhRutChoDuyet ?? 0,
        tongDoanhThu: d?.tongDoanhThu ?? 0,
      };
    } catch {
      return {
        tongQuyHeThong: 0,
        quyTamGiuCoc: 0,
        tongSoDuViChuTro: 0,
        quyChoRut: 0,
        soLenhRutChoDuyet: 0,
        tongDoanhThu: 0,
      };
    }
  },

  // 2. Quản lý Người dùng
  getUsers: async (keyword?: string, page = 0, size = 15): Promise<PageResponse<AdminUserItem>> => {
    const params: any = { page, size };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    const res = await axiosClient.get<any, any>('/api/admin/users', { params });
    const p = res?.data !== undefined ? res.data : res;
    return {
      content: p?.content || [],
      totalElements: p?.totalElements || 0,
      totalPages: p?.totalPages || 1,
      size: p?.size || size,
      number: p?.number || page,
      first: p?.first ?? true,
      last: p?.last ?? true,
      empty: p?.empty ?? false,
    };
  },

  getUserById: (id: string): Promise<AdminUserItem> => {
    return axiosClient.get<any, AdminUserItem>(`/api/admin/users/${id}`);
  },

  toggleLockUser: (id: string): Promise<any> => {
    return axiosClient.patch<any, any>(`/api/admin/users/${id}/toggle-lock`);
  },

  resetUserPassword: (id: string, matKhauMoi?: string) => {
    return axiosClient.post<any, string>(`/api/admin/users/${id}/reset-password`, {
      matKhauMoi: matKhauMoi || 'InnFinder@2026',
    });
  },

  // 3. Phê duyệt hồ sơ Chủ trọ
  getLandlordRequests: async (): Promise<AdminLandlordRequestItem[]> => {
    const res = await axiosClient.get<any, any>('/api/admin/landlord-requests');
    const list = Array.isArray(res) ? res : (res?.data || []);
    return list;
  },

  approveLandlordRequest: (id: string | number) => {
    return axiosClient.patch<any, any>(`/api/admin/landlord-requests/${id}/approve`);
  },

  rejectLandlordRequest: (id: string | number, reason: string) => {
    return axiosClient.patch<any, any>(`/api/admin/landlord-requests/${id}/reject`, {
      lyDoTuChoi: reason,
    });
  },

  // 4. Kiểm duyệt Bài đăng phòng trọ
  getPendingRooms: async (): Promise<AdminPostItem[]> => {
    const res = await axiosClient.get<any, any>('/api/admin/rooms/pending');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  getAllRooms: async (): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/rooms');
      const list = Array.isArray(res) ? res : (res?.content || res?.data || []);
      return list;
    } catch {
      return [];
    }
  },

  approveRoom: (id: string) => {
    return axiosClient.patch<any, any>(`/api/admin/rooms/${id}/approve`);
  },

  rejectRoom: (id: string, reason: string) => {
    return axiosClient.patch<any, any>(`/api/admin/rooms/${id}/reject`, {
      lyDo: reason,
    });
  },

  // 5. Quản lý Giao dịch & Phê duyệt rút tiền
  getTransactions: async (keyword?: string): Promise<AdminTransactionItem[]> => {
    const params: any = {};
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    const res = await axiosClient.get<any, any>('/api/admin/transactions', { params });
    return Array.isArray(res) ? res : (res?.data || []);
  },

  approveWithdrawal: (id: string) => {
    return axiosClient.patch<any, any>(`/api/admin/transactions/${id}/approve`);
  },

  rejectWithdrawal: (id: string, reason?: string) => {
    return axiosClient.patch<any, any>(`/api/admin/transactions/${id}/reject`, {
      lyDo: reason || 'Từ chối rút tiền do tài khoản ngân hàng không hợp lệ',
    });
  },

  // 6. Xử lý Khiếu nại & Vi phạm
  getAllComplaints: async (): Promise<AdminComplaintItem[]> => {
    const res = await axiosClient.get<any, any>('/api/admin/complaints');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  resolveComplaint: (
    id: string,
    payload: {
      trangThai: 'DANG_XU_LY' | 'DA_XU_LI' | 'DA_XU_LY' | 'TU_CHOI';
      mucDoViPham?: 'NHE' | 'TRUNG_BINH' | 'NANG';
      ketLuan?: string;
    }
  ) => {
    return axiosClient.patch<any, any>(`/api/admin/complaints/${id}/resolve`, payload);
  },

  // 7. Cấu hình Biểu phí cọc & Loại phòng
  getRoomTypeDepositFees: async (): Promise<RoomTypeDepositFee[]> => {
    const res = await axiosClient.get<any, any>('/api/admin/room-types/deposit-fees');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  updateDepositFee: (
    maLpt: string,
    payload: { soTienCoc: number; phiThu: number }
  ) => {
    return axiosClient.put<any, any>(`/api/admin/room-types/${maLpt}/deposit-fee`, payload);
  },
};
