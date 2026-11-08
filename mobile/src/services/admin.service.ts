import { axiosClient } from '../api/axiosClient';
import {
  AdminDashboardStats,
  AdminUserItem,
  AdminLandlordRequestItem,
  AdminPostItem,
  AdminComplaintItem,
  AdminTransactionItem,
  AdminReviewItem,
  AdminAppointmentItem,
  AdminCategoryItem,
} from '../types/admin.types';

export const adminService = {
  // 1. Dashboard & Thống kê hệ thống
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/statistics');
      const d = res?.data !== undefined ? res.data : res;

      // Tra cứu số khiếu nại đang chờ xử lý từ API khiếu nại
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
      const soChuTro = d?.soChuTro ?? 0;

      return {
        nguoiDung: {
          total: tongNguoiDung,
          label: 'Người dùng',
        },
        soTinDang: {
          total: tongSoPhong,
          label: 'Số tin đăng',
        },
        doanhThu: {
          total: tongDoanhThu.toLocaleString('vi-VN') + ' đ',
          label: 'Doanh thu hoa hồng',
        },
        khieuNai: {
          total: soKhieuNai,
          label: 'Khiếu nại',
          isAlert: soKhieuNai > 0,
        },
        hangDoi: {
          tinMoi: soPhongChoDuyet,
          xacMinhChuTro: soChuTro,
          baoCaoViPham: soKhieuNai,
        },
        tangTruongGiaoDich: [],
      };
    } catch {
      return {
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
    }
  },

  // 2. Quản lý Người dùng
  getUsers: async (role?: string): Promise<AdminUserItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/users', { params: { role } });
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((u: any) => ({
          maNguoiDung: u.maNguoiDung || '',
          tenDangNhap: u.tenDangNhap || '',
          hoVaTen: u.hoVaTen || u.tenDangNhap || 'Người dùng',
          email: u.email || '',
          sdt: u.sdt || '',
          cccd: u.cccd,
          vaiTro: u.vaiTro || 'KHACH_HANG',
          chuTro: Boolean(u.chuTro),
          trangThai: u.trangThaiKhoa ? 'KHOA' : 'HOAT_DONG',
          ngayTao: u.thoiGianMoTaiKhoan
            ? new Date(u.thoiGianMoTaiKhoan).toLocaleDateString('vi-VN')
            : '',
          soTinDang: u.soTinDang || 0,
          soLichHen: u.soLichHen || 0,
          soGiaoDich: u.soGiaoDich || 0,
          avatarUrl: u.hinhDaiDien,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getUserById: async (id: string): Promise<AdminUserItem | null> => {
    try {
      const list = await adminService.getUsers();
      return list.find((u) => u.maNguoiDung === id) || null;
    } catch {
      return null;
    }
  },

  toggleUserLock: async (id: string, _lock: boolean): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/users/${id}/toggle-lock`);
      return true;
    } catch {
      return false;
    }
  },

  resetUserPassword: async (userId: string, newPassword?: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/api/admin/users/${userId}/reset-password`, {
        matKhauMoi: newPassword || 'InnFinder@2026',
      });
      return true;
    } catch {
      return false;
    }
  },

  // 3. Đơn đăng ký làm Chủ trọ
  getLandlordRequests: async (): Promise<AdminLandlordRequestItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/landlord-requests');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((r: any) => ({
          maYeuCau: r.maYeuCau || `YC${r.maNguoiDung || ''}`,
          maNguoiDung: r.maNguoiDung || '',
          hoVaTen: r.hoVaTen || r.tenDangNhap || 'Người dùng',
          email: r.email || '',
          sdt: r.sdt || '',
          cccd: r.cccd || '',
          tenNganHang: r.tenNganHang || '',
          soTaiKhoan: r.soTaiKhoan || '',
          ngayGui: r.ngayGui ? new Date(r.ngayGui).toLocaleString('vi-VN') : '',
          trangThai: r.trangThai || 'CHO_DUYET',
          avatarUrl: r.avatarUrl,
        }));
      }

      // Nếu backend chưa có endpoint riêng cho landlord-requests, lọc người dùng có CCCD nhưng chưa kích hoạt chuTro
      const users = await adminService.getUsers();
      return users
        .filter((u) => u.cccd && !u.chuTro && u.vaiTro !== 'QUAN_TRI')
        .map((u) => ({
          maYeuCau: `YC${u.maNguoiDung}`,
          maNguoiDung: u.maNguoiDung,
          hoVaTen: u.hoVaTen,
          email: u.email,
          sdt: u.sdt,
          cccd: u.cccd || '',
          tenNganHang: 'Chờ cập nhật',
          soTaiKhoan: 'Chờ cập nhật',
          ngayGui: u.ngayTao,
          trangThai: 'CHO_DUYET' as const,
          avatarUrl: u.avatarUrl,
        }));
    } catch {
      return [];
    }
  },

  getLandlordRequestById: async (id: string): Promise<AdminLandlordRequestItem | null> => {
    try {
      const list = await adminService.getLandlordRequests();
      return list.find((r) => r.maYeuCau === id || r.maNguoiDung === id) || null;
    } catch {
      return null;
    }
  },

  approveLandlordRequest: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/landlord-requests/${id}/approve`);
      return true;
    } catch {
      return false;
    }
  },

  rejectLandlordRequest: async (id: string, lyDo?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/landlord-requests/${id}/reject`, { lyDo });
      return true;
    } catch {
      return false;
    }
  },

  // 4. Quản lý Bài đăng (Chỉ Duyệt / Từ chối - Không có quyền xoá bài)
  getPosts: async (_status?: string): Promise<AdminPostItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/rooms/pending');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((r: any) => ({
          maPhongTro: r.maPhongTro || '',
          tieuDe: r.tieuDe || `${r.tenLoaiPhong || 'Phòng trọ'} - ${r.diaChi || 'Cho thuê'}`,
          diaChi: r.diaChi || '',
          giaThue: r.giaThue || 0,
          dienTich: r.dienTich || 0,
          soNguoi: r.soNguoi || 1,
          loaiPhong: r.tenLoaiPhong || 'Phòng trọ',
          trangThai: r.trangThai || 'CHO_DUYET',
          thoiGianDang: r.thoiGianDang
            ? new Date(r.thoiGianDang).toLocaleString('vi-VN')
            : '',
          tenChuTro: r.tenChuTro || 'Chủ trọ',
          sdtChuTro: r.sdtChuTro || '',
          hinhAnh:
            Array.isArray(r.hinhAnhUrls) && r.hinhAnhUrls.length > 0
              ? r.hinhAnhUrls
              : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
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
    try {
      // 1. Thử tìm trong danh sách bài chờ duyệt
      const list = await adminService.getPosts();
      const found = list.find((p) => p.maPhongTro === id);
      if (found) return found;

      // 2. Nếu không có trong pending, thử lấy chi tiết từ public room endpoint
      const res = await axiosClient.get<any, any>(`/api/rooms/${id}`);
      const r = res?.data !== undefined ? res.data : res;
      if (r && r.maPhongTro) {
        return {
          maPhongTro: r.maPhongTro || id,
          tieuDe: r.tieuDe || `${r.tenLoaiPhong || 'Phòng trọ'} - ${r.diaChi || 'Cho thuê'}`,
          diaChi: r.diaChi || '',
          giaThue: r.giaThue || 0,
          dienTich: r.dienTich || 0,
          soNguoi: r.soNguoi || 1,
          loaiPhong: r.tenLoaiPhong || 'Phòng trọ',
          trangThai: r.trangThai || 'DA_DUYET',
          thoiGianDang: r.thoiGianDang
            ? new Date(r.thoiGianDang).toLocaleString('vi-VN')
            : '',
          tenChuTro: r.tenChuTro || 'Chủ trọ',
          sdtChuTro: r.sdtChuTro || '',
          hinhAnh:
            Array.isArray(r.hinhAnhUrls) && r.hinhAnhUrls.length > 0
              ? r.hinhAnhUrls
              : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
          moTa: r.moTa || '',
          tienIch: [],
          cocPhong: r.coc || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
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

  // 5. Khiếu nại & Vi phạm
  getComplaints: async (_status?: string): Promise<AdminComplaintItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/admin/complaints');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((c: any) => ({
          maKhieuNai: c.maKhieuNai || '',
          nguoiKhieuNai: c.tenNguoiGui || 'Người dùng',
          doiTuongBiKhieuNai: c.tenDoiTuongKhieuNai || 'Đối tượng',
          vanDe: c.vanDe || '',
          thoiGian: c.ngayGui ? new Date(c.ngayGui).toLocaleString('vi-VN') : '',
          trangThai: c.trangThai || 'CHO_XU_LY',
          hinhAnh: c.hinhAnh ? [c.hinhAnh] : [],
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getComplaintById: async (id: string): Promise<AdminComplaintItem | null> => {
    try {
      const list = await adminService.getComplaints();
      return list.find((c) => c.maKhieuNai === id) || null;
    } catch {
      return null;
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
      return false;
    }
  },

  // 6. Giao dịch & Yêu cầu rút tiền của người dùng
  getTransactions: async (): Promise<AdminTransactionItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/transactions/my-history');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((t: any) => ({
          maGiaoDich: t.maGiaoDich || '',
          phongTro: t.noiDung || 'Giao dịch hệ thống',
          diaChiPhong: 'Hệ thống ví InnFinder',
          soTien: t.soTien || 0,
          loaiGiaoDich: t.loaiGiaoDich || 'GIAO_DICH',
          trangThai: t.trangThai || 'THANH_CONG',
          thoiGian: t.ngayGiaoDich ? new Date(t.ngayGiaoDich).toLocaleString('vi-VN') : '',
          nguoiThucHien: 'Người dùng',
          chuTro: 'Hệ thống',
          tienCoc: t.soTien || 0,
          phiDichVu: 0,
          thucNhan: t.soTien || 0,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getTransactionById: async (id: string): Promise<AdminTransactionItem | null> => {
    try {
      const list = await adminService.getTransactions();
      return list.find((t) => t.maGiaoDich === id) || null;
    } catch {
      return null;
    }
  },

  approveTransaction: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/transactions/${id}/approve`);
      return true;
    } catch {
      return false;
    }
  },

  rejectTransaction: async (id: string, lyDo?: string): Promise<boolean> => {
    try {
      await axiosClient.patch(`/api/admin/transactions/${id}/reject`, { lyDo });
      return true;
    } catch {
      return false;
    }
  },

  // 7. Đánh giá
  getReviews: async (): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/landlord/reviews');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((r: any) => ({
          maDanhGia: r.maDanhGia || String(r.id || ''),
          phongTroId: r.maPhongTro || '',
          tenPhongTro: r.tenPhongTro || 'Phòng trọ',
          diaChiPhong: r.diaChi || '',
          nguoiDanhGia: r.tenNguoiDanhGia || 'Khách thuê',
          diem: r.diem || 5,
          noiDung: r.noiDung || '',
          thoiGian: r.thoiGian ? new Date(r.thoiGian).toLocaleString('vi-VN') : '',
          trangThai: 'HIEN_THI' as const,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getReviewsByRoom: async (roomId: string): Promise<AdminReviewItem[]> => {
    try {
      const res = await axiosClient.get<any, any>(`/api/rooms/${roomId}/reviews`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((r: any) => ({
          maDanhGia: r.maDanhGia || String(r.id || ''),
          phongTroId: roomId,
          tenPhongTro: r.tenPhongTro || 'Phòng trọ',
          diaChiPhong: r.diaChi || '',
          nguoiDanhGia: r.tenNguoiDanhGia || 'Khách thuê',
          diem: r.diem || 5,
          noiDung: r.noiDung || '',
          thoiGian: r.thoiGian ? new Date(r.thoiGian).toLocaleString('vi-VN') : '',
          trangThai: 'HIEN_THI' as const,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  deleteReview: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/api/admin/reviews/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  // 8. Lịch hẹn xem phòng
  getAppointments: async (): Promise<AdminAppointmentItem[]> => {
    try {
      const res = await axiosClient.get<any, any>('/api/appointments/my-appointments');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(list)) {
        return list.map((a: any) => ({
          maDatLich: a.maDatLich || '',
          tenKhachHang: a.tenKhachHang || 'Khách hàng',
          sdtKhachHang: a.sdtKhachHang || '',
          tenChuTro: a.tenChuTro || 'Chủ trọ',
          sdtChuTro: a.sdtChuTro || '',
          tenPhongTro: a.tenPhongTro || 'Phòng trọ',
          diaChiPhong: a.diaChiPhong || '',
          ngayHen: a.ngayHen ? new Date(a.ngayHen).toLocaleString('vi-VN') : '',
          trangThai: a.trangThai || 'CHO_XAC_NHAN',
          tienCoc: a.tienCoc || 0,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getAppointmentById: async (id: string): Promise<AdminAppointmentItem | null> => {
    try {
      const list = await adminService.getAppointments();
      return list.find((a) => a.maDatLich === id) || null;
    } catch {
      return null;
    }
  },

  // 9. Danh mục
  getCategories: async (type?: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'): Promise<AdminCategoryItem[]> => {
    try {
      if (type === 'TIEN_ICH') {
        const res = await axiosClient.get<any, any>('/api/categories/amenities');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(list)) {
          return list.map((a: any) => ({
            ma: a.maTienIch,
            ten: a.tenTienIch,
            loai: 'TIEN_ICH',
            trangThai: true,
          }));
        }
      } else if (type === 'LOAI_PHONG') {
        const res = await axiosClient.get<any, any>('/api/categories/room-types');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(list)) {
          return list.map((c: any) => ({
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
