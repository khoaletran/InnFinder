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

const EMPTY_STATS: AdminDashboardStats = {
  nguoiDung: { total: 0, label: 'Người dùng' },
  soTinDang: { total: 0, label: 'Số tin đăng' },
  doanhThu: { total: '0 đ', label: 'Doanh thu hoa hồng' },
  khieuNai: { total: 0, label: 'Khiếu nại', isAlert: false },
  hangDoi: {
    tinMoi: 0,
    xacMinhChuTro: 0,
    baoCaoViPham: 0,
  },
  tangTruongGiaoDich: [],
};

export const adminService = {
  // 1. Dashboard & Thống kê
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/statistics');
      const d = res?.data;
      if (d) {
        return {
          nguoiDung: {
            total: d.tongNguoiDung ?? 0,
            label: 'Người dùng',
          },
          soTinDang: {
            total: d.tongSoPhong ?? 0,
            label: 'Số tin đăng',
          },
          doanhThu: {
            total: (d.tongDoanhThu ?? 0).toLocaleString('vi-VN') + ' đ',
            label: 'Doanh thu hoa hồng',
          },
          khieuNai: {
            total: 0,
            label: 'Khiếu nại',
            isAlert: false,
          },
          hangDoi: {
            tinMoi: d.soPhongChoDuyet ?? 0,
            xacMinhChuTro: d.soChuTro ?? 0,
            baoCaoViPham: 0,
          },
          tangTruongGiaoDich: [],
        };
      }
      return EMPTY_STATS;
    } catch {
      return EMPTY_STATS;
    }
  },

  // 2. Quản lý Người dùng
  getUsers: async (role?: string): Promise<AdminUserItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/users', { params: { role } });
      const list = res?.data;
      if (Array.isArray(list)) {
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
      return [];
    } catch {
      return [];
    }
  },

  getUserById: async (id: string): Promise<AdminUserItem | null> => {
    const list = await adminService.getUsers();
    return list.find((u) => u.maNguoiDung === id) || null;
  },

  toggleUserLock: async (id: string, _lock: boolean): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/users/${id}/toggle-lock`);
      return true;
    } catch {
      return false;
    }
  },

  // 3. Quản lý Bài đăng
  getPosts: async (_status?: string): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/rooms/pending');
      const list = res?.data;
      if (Array.isArray(list)) {
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
      return [];
    } catch {
      return [];
    }
  },

  getPostById: async (id: string): Promise<AdminPostItem | null> => {
    const list = await adminService.getPosts();
    return list.find((p) => p.maPhongTro === id) || null;
  },

  approvePost: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/rooms/${id}/approve`);
      return true;
    } catch {
      return false;
    }
  },

  rejectPost: async (id: string, lyDo: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/rooms/${id}/reject`, { lyDo });
      return true;
    } catch {
      return false;
    }
  },

  // 4. Khiếu nại
  getComplaints: async (_status?: string): Promise<AdminComplaintItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/complaints');
      const list = res?.data;
      if (Array.isArray(list)) {
        return list.map((c: any) => ({
          maKhieuNai: c.maKhieuNai,
          nguoiKhieuNai: c.tenNguoiGui || 'Người dùng',
          doiTuongBiKhieuNai: c.tenDoiTuongKhieuNai || 'Đối tượng',
          vanDe: c.vanDe || '',
          thoiGian: c.ngayGui ? new Date(c.ngayGui).toLocaleString('vi-VN') : '',
          trangThai: c.trangThai || 'CHO_DUYET',
          hinhAnh: c.hinhAnh ? [c.hinhAnh] : [],
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getComplaintById: async (id: string): Promise<AdminComplaintItem | null> => {
    const list = await adminService.getComplaints();
    return list.find((c) => c.maKhieuNai === id) || null;
  },

  resolveComplaint: async (id: string, status: string, _ghiChu?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/complaints/${id}/resolve`, {
        trangThai: status,
        mucDoViPham: 'NHE',
      });
      return true;
    } catch {
      return false;
    }
  },

  // 5. Giao dịch
  getTransactions: async (): Promise<AdminTransactionItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/transactions/my-history');
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  getTransactionById: async (id: string): Promise<AdminTransactionItem | null> => {
    const list = await adminService.getTransactions();
    return list.find((t) => t.maGiaoDich === id) || null;
  },

  // 6. Đánh giá
  getReviews: async (): Promise<AdminReviewItem[]> => {
    return [];
  },

  getReviewsByRoom: async (roomId: string): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>(`/api/rooms/${roomId}/reviews`);
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  deleteReview: async (_id: string): Promise<boolean> => {
    return true;
  },

  // 7. Lịch hẹn xem phòng
  getAppointments: async (): Promise<AdminAppointmentItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/appointments/my-appointments');
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  getAppointmentById: async (id: string): Promise<AdminAppointmentItem | null> => {
    const list = await adminService.getAppointments();
    return list.find((a) => a.maDatLich === id) || null;
  },

  // 8. Danh mục
  getCategories: async (type?: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'): Promise<AdminCategoryItem[]> => {
    try {
      if (type === 'TIEN_ICH') {
        const res = await axiosClient.get<any, any>('/api/categories/amenities');
        if (Array.isArray(res?.data)) {
          return res.data.map((a: any) => ({
            ma: a.maTienIch,
            ten: a.tenTienIch,
            loai: 'TIEN_ICH',
            trangThai: true,
          }));
        }
      } else {
        const res = await axiosClient.get<any, any>('/api/categories/room-types');
        if (Array.isArray(res?.data)) {
          return res.data.map((c: any) => ({
            ma: c.maLpt || c.maLPT,
            ten: c.tenLoaiPhongTro,
            loai: 'LOAI_PHONG',
            moTa: c.moTa,
            trangThai: true,
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  },
};
