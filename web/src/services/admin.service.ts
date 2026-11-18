import { axiosClient } from '@/api/axiosClient';
import type {
  AdminAppointmentItem,
  AdminComplaintItem,
  AdminDashboardStats,
  AdminLandlordRequestItem,
  AdminPostItem,
  AdminReviewItem,
  AdminTransactionItem,
  AdminTreasuryStats,
  AdminUserItem,
  RoomTypeDepositFee,
} from '@/types/admin.types';
import type { PageResponse } from '@/types/api.types';
import type { MucDoViPham, TrangThaiKhieuNai } from '@/types/auth-user.types';
import type { AmenityResponse, CategoryResponse } from '@/types/room.types';

export const adminService = {
  // 1. Dashboard & Thống kê hệ thống (Doanh thu sàn = SUM(phiThu) từ PhieuDatLich HOAN_THANH)
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const d = await axiosClient.get<unknown, Record<string, number>>('/api/admin/statistics');

      let soKhieuNai = 0;
      try {
        const cList = await axiosClient.get<unknown, AdminComplaintItem[]>(
          '/api/admin/complaints',
        );
        if (Array.isArray(cList)) {
          soKhieuNai = cList.filter((c) => c.trangThai === 'CHO_DUYET').length;
        }
      } catch {
        // ignore secondary counter failure
      }

      const tongNguoiDung = Number(d?.tongNguoiDung ?? 0);
      const tongSoPhong = Number(d?.tongSoPhong ?? 0);
      const tongDoanhThu = Number(d?.tongDoanhThu ?? 0);
      const soPhongChoDuyet = Number(d?.soPhongChoDuyet ?? 0);
      const soChuTroChoDuyet = Number(d?.soChuTroChoDuyet ?? 0);

      // Phân bổ biểu đồ tăng trưởng hoa hồng sàn dựa trên doanh thu thực tế (phiThu HOAN_THANH)
      const currentMonth = new Date().getMonth() + 1;
      const tangTruongGiaoDich = Array.from({ length: 6 }, (_, idx) => {
        const m = ((currentMonth - 6 + idx + 12) % 12) + 1;
        const isCurrent = idx === 5;
        return {
          thang: `T${m}`,
          giaTri: isCurrent ? tongDoanhThu : 0,
        };
      });

      return {
        nguoiDung: { total: tongNguoiDung, label: 'Người dùng hệ thống' },
        soTinDang: { total: tongSoPhong, label: 'Tổng số phòng trọ' },
        doanhThu: {
          total: tongDoanhThu.toLocaleString('vi-VN') + ' ₫',
          label: 'Doanh thu hoa hồng sàn (phiThu HOAN_THANH)',
        },
        khieuNai: {
          total: soKhieuNai,
          label: 'Khiếu nại chờ duyệt',
          isAlert: soKhieuNai > 0,
        },
        hangDoi: {
          tinMoi: soPhongChoDuyet,
          xacMinhChuTro: soChuTroChoDuyet,
          baoCaoViPham: soKhieuNai,
        },
        tangTruongGiaoDich,
      };
    } catch {
      return {
        nguoiDung: { total: 0, label: 'Người dùng hệ thống' },
        soTinDang: { total: 0, label: 'Tổng số phòng trọ' },
        doanhThu: { total: '0 ₫', label: 'Doanh thu hoa hồng sàn (phiThu HOAN_THANH)' },
        khieuNai: { total: 0, label: 'Khiếu nại chờ duyệt', isAlert: false },
        hangDoi: { tinMoi: 0, xacMinhChuTro: 0, baoCaoViPham: 0 },
        tangTruongGiaoDich: [],
      };
    }
  },

  getTreasuryStats: async (): Promise<AdminTreasuryStats> => {
    try {
      const d = await axiosClient.get<unknown, Record<string, number>>('/api/admin/statistics');
      return {
        tongQuyHeThong: Number(d?.tongQuyHeThong ?? 0),
        quyTamGiuCoc: Number(d?.quyTamGiuCoc ?? 0),
        tongSoDuViChuTro: Number(d?.tongSoDuViChuTro ?? 0),
        quyChoRut: Number(d?.quyChoRut ?? 0),
        soLenhRutChoDuyet: Number(d?.soLenhRutChoDuyet ?? 0),
        tongDoanhThu: Number(d?.tongDoanhThu ?? 0),
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

  getUsers: async (
    keyword?: string,
    page = 0,
    size = 15,
  ): Promise<PageResponse<AdminUserItem>> => {
    const params: Record<string, string | number> = { page, size };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    const p = await axiosClient.get<unknown, PageResponse<AdminUserItem>>('/api/admin/users', {
      params,
    });
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
    return axiosClient.get<unknown, AdminUserItem>(`/api/admin/users/${id}`);
  },

  toggleLockUser: (id: string) => {
    return axiosClient.patch<unknown, AdminUserItem>(`/api/admin/users/${id}/toggle-lock`);
  },

  resetUserPassword: (id: string, matKhauMoi?: string) => {
    return axiosClient.post<unknown, string>(`/api/admin/users/${id}/reset-password`, {
      matKhauMoi: matKhauMoi || 'InnFinder@2026',
    });
  },

  getLandlordRequests: async (): Promise<AdminLandlordRequestItem[]> => {
    const res = await axiosClient.get<unknown, AdminLandlordRequestItem[]>(
      '/api/admin/landlord-requests',
    );
    return Array.isArray(res) ? res : [];
  },

  approveLandlordRequest: (id: string | number) => {
    return axiosClient.patch<unknown, AdminLandlordRequestItem>(
      `/api/admin/landlord-requests/${id}/approve`,
    );
  },

  rejectLandlordRequest: (id: string | number, reason: string) => {
    return axiosClient.patch<unknown, AdminLandlordRequestItem>(
      `/api/admin/landlord-requests/${id}/reject`,
      { lyDoTuChoi: reason },
    );
  },

  getPendingRooms: async (): Promise<AdminPostItem[]> => {
    const res = await axiosClient.get<unknown, AdminPostItem[]>('/api/admin/rooms/pending');
    return Array.isArray(res) ? res : [];
  },

  getAllRooms: async (): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<unknown, PageResponse<AdminPostItem> | AdminPostItem[]>(
        '/api/rooms',
      );
      if (Array.isArray(res)) return res;
      return res?.content || [];
    } catch {
      return [];
    }
  },

  approveRoom: (id: string) => {
    return axiosClient.patch<unknown, AdminPostItem>(`/api/admin/rooms/${id}/approve`);
  },

  rejectRoom: (id: string, reason: string) => {
    return axiosClient.patch<unknown, AdminPostItem>(`/api/admin/rooms/${id}/reject`, {
      lyDo: reason,
    });
  },

  getTransactions: async (keyword?: string): Promise<AdminTransactionItem[]> => {
    const params: Record<string, string> = {};
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    const res = await axiosClient.get<unknown, AdminTransactionItem[]>('/api/admin/transactions', {
      params,
    });
    return Array.isArray(res) ? res : [];
  },

  approveWithdrawal: (id: string) => {
    return axiosClient.patch<unknown, AdminTransactionItem>(
      `/api/admin/transactions/${id}/approve`,
    );
  },

  rejectWithdrawal: (id: string, reason?: string) => {
    return axiosClient.patch<unknown, AdminTransactionItem>(
      `/api/admin/transactions/${id}/reject`,
      { lyDo: reason || 'Từ chối rút tiền do thông tin tài khoản không khớp' },
    );
  },

  getAllComplaints: async (): Promise<AdminComplaintItem[]> => {
    const res = await axiosClient.get<unknown, AdminComplaintItem[]>('/api/admin/complaints');
    return Array.isArray(res) ? res : [];
  },

  resolveComplaint: (
    id: string,
    payload: {
      trangThai: TrangThaiKhieuNai;
      mucDoViPham?: MucDoViPham;
      ketQua?: string;
      ketLuan?: string;
    },
  ) => {
    return axiosClient.patch<unknown, AdminComplaintItem>(
      `/api/admin/complaints/${id}/resolve`,
      {
        trangThai: payload.trangThai,
        mucDoViPham: payload.mucDoViPham,
        ketQua: payload.ketQua || payload.ketLuan,
      },
    );
  },

  getRoomTypeDepositFees: async (): Promise<RoomTypeDepositFee[]> => {
    const res = await axiosClient.get<unknown, RoomTypeDepositFee[]>(
      '/api/admin/room-types/deposit-fees',
    );
    return Array.isArray(res) ? res : [];
  },

  updateDepositFee: (maLpt: string, payload: { soTienCoc: number; phiThu: number }) => {
    return axiosClient.put<unknown, RoomTypeDepositFee>(
      `/api/admin/room-types/${maLpt}/deposit-fee`,
      payload,
    );
  },

  updateRoomType: (maLpt: string, payload: { ten: string; moTa?: string }) => {
    return axiosClient.put<unknown, CategoryResponse>(`/api/admin/room-types/${maLpt}`, payload);
  },

  updateAmenity: (maTienIch: string, payload: { ten: string; moTa?: string }) => {
    return axiosClient.put<unknown, AmenityResponse>(
      `/api/admin/amenities/${maTienIch}`,
      payload,
    );
  },

  deleteReview: (reviewId: string) => {
    return axiosClient.delete<unknown, string>(`/api/admin/reviews/${reviewId}`);
  },

  // Tổng hợp đánh giá của toàn bộ phòng đã duyệt cho Admin kiểm duyệt
  getAllRoomReviews: async (): Promise<AdminReviewItem[]> => {
    try {
      const roomsPage = await axiosClient.get<unknown, PageResponse<{ maPhongTro: string; diaChi: string; tieuDe?: string }>>('/api/rooms', {
        params: { page: 0, size: 30 },
      });
      const rooms = roomsPage?.content || [];
      const results = await Promise.all(
        rooms.map(async (room) => {
          try {
            const revs = await axiosClient.get<
              unknown,
              Array<{
                maDanhGia: string;
                maPhongTro: string;
                tenNguoiDung?: string;
                tenDangNhap?: string;
                diem: number;
                noiDung: string;
                ngayDanhGia: string;
              }>
            >(`/api/rooms/${room.maPhongTro}/reviews`);
            return (revs || []).map((rv) => ({
              maDanhGia: rv.maDanhGia,
              phongTroId: room.maPhongTro,
              tenPhongTro: room.tieuDe || `Phòng #${room.maPhongTro}`,
              diaChiPhong: room.diaChi,
              nguoiDanhGia: rv.tenNguoiDung || rv.tenDangNhap || 'Khách thuê',
              diem: rv.diem,
              noiDung: rv.noiDung,
              thoiGian: rv.ngayDanhGia,
              trangThai: 'HIEN_THI' as const,
            }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    } catch {
      return [];
    }
  },

  // Suy xuất lịch xem phòng qua sổ cái giao dịch cọc đối soát (nếu chưa có endpoint riêng)
  getMonitoredViewings: async (): Promise<AdminAppointmentItem[]> => {
    try {
      const txList = await axiosClient.get<unknown, AdminTransactionItem[]>(
        '/api/admin/transactions',
        { params: { keyword: 'PT' } },
      );
      if (!Array.isArray(txList)) return [];
      return txList
        .filter((tx) => tx.maDatLich || tx.loaiGiaoDich?.includes('COC'))
        .map((tx, idx) => ({
          maDatLich: tx.maDatLich || `DL-${idx + 1}`,
          tenKhachHang: tx.nguoiThucHien || 'Khách hàng',
          sdtKhachHang: tx.sdtNguoiThucHien || '---',
          tenChuTro: tx.chuTro || 'Chủ trọ hệ thống',
          sdtChuTro: '---',
          tenPhongTro: tx.phongTro || 'Phòng trọ trên sàn',
          diaChiPhong: tx.diaChiPhong || tx.ghiChu || '---',
          ngayHen: tx.thoiGian,
          trangThai:
            tx.loaiGiaoDich === 'CONG_TIEN_COC'
              ? 'HOAN_THANH'
              : tx.trangThai === 'HOAN_TIEN'
                ? 'HUY'
                : 'XAC_NHAN',
          tienCoc: tx.tienCoc || tx.soTien,
          phiThu: tx.phiDichVu,
          ghiChu: tx.ghiChu,
        }));
    } catch {
      return [];
    }
  },
};
