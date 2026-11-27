import { axiosClient } from '@/api/axiosClient';
import type {
  AdminAppointmentItem,
  AdminComplaintItem,
  AdminDashboardStats,
  AdminLandlordRequestItem,
  AdminPostItem,
  AdminReputationAdjustPayload,
  AdminReputationHistoryItem,
  AdminReviewItem,
  AdminRevenueInsightResponse,
  AdminStatisticsFilter,
  AdminStatisticsResponse,
  AdminTransactionItem,
  AdminTreasuryStats,
  AdminUserDetailResponse,
  AdminUserItem,
  DepositFeeHistoryItem,
  RoomTypeDepositFee,
  UpdateDepositFeePayload,
} from '@/types/admin.types';
import type { PageResponse } from '@/types/api.types';
import type { MucDoViPham, TrangThaiKhieuNai } from '@/types/auth-user.types';
import type { AmenityResponse, CategoryResponse, TrangThaiPhongTro } from '@/types/room.types';

function mapRoomToAdminPost(r: Record<string, unknown>): AdminPostItem {
  const hinhAnhUrls = Array.isArray(r.hinhAnhUrls)
    ? r.hinhAnhUrls.map(String)
    : Array.isArray(r.hinhAnh)
      ? r.hinhAnh.map(String)
      : r.anhDaiDien
        ? [String(r.anhDaiDien)]
        : [];
  const loaiPhong = String(r.tenLoaiPhong || r.loaiPhong || 'Phòng trọ');
  const diaChi = String(r.diaChi || '');
  const maPhongTro = String(r.maPhongTro || '');

  return {
    maPhongTro,
    tieuDe: String(r.tieuDe || `${loaiPhong}${diaChi ? ` - ${diaChi}` : ''}` || `Phòng #${maPhongTro}`),
    diaChi,
    giaThue: Number(r.giaThue ?? 0),
    dienTich: Number(r.dienTich ?? 0),
    soNguoi: Number(r.soNguoi ?? 1),
    loaiPhong,
    trangThai: (r.trangThai as TrangThaiPhongTro) || 'CHO_DUYET',
    thoiGianDang: String(r.thoiGianDang || ''),
    tenChuTro: String(r.tenChuTro || 'Chủ trọ'),
    sdtChuTro: String(r.sdtChuTro || ''),
    maChuTro: r.maChuTro as string | undefined,
    avatarChuTro: r.avatarChuTro as string | undefined,
    hinhAnh: hinhAnhUrls,
    moTa: String(r.moTa || ''),
    tienIch: Array.isArray(r.tienIch) ? r.tienIch.map(String) : [],
    cocPhong: Number(r.coc ?? r.cocPhong ?? 0),
    kinhDo: r.kinhDo as string | undefined,
    viDo: r.viDo as string | undefined,
    lyDoTuChoi: r.lyDoTuChoi as string | undefined,
  };
}

export const adminService = {
  // 1. Dashboard & Thống kê hệ thống (Doanh thu sàn = SUM(phiThu) từ PhieuDatLich HOAN_THANH)
  getStatistics: async (filters?: AdminStatisticsFilter): Promise<AdminStatisticsResponse> => {
    const params: Record<string, number> = {};
    if (filters?.day !== null && filters?.day !== undefined) params.day = filters.day;
    if (filters?.month !== null && filters?.month !== undefined) params.month = filters.month;
    if (filters?.year !== null && filters?.year !== undefined) params.year = filters.year;

    const d = await axiosClient.get<
      unknown,
      Partial<AdminStatisticsResponse> & { tongQuyThucTe?: number }
    >('/api/admin/statistics', { params });

    const tongDoanhThu = Number(d?.tongDoanhThu ?? 0);
    const tongQuyHeThong = Number(d?.tongQuyHeThong ?? 0);

    return {
      tongSoPhong: Number(d?.tongSoPhong ?? 0),
      soPhongChoDuyet: Number(d?.soPhongChoDuyet ?? 0),
      soPhongDaDuyet: Number(d?.soPhongDaDuyet ?? 0),
      soPhongHoanThanh: Number(d?.soPhongHoanThanh ?? 0),
      soPhongHuy: Number(d?.soPhongHuy ?? 0),
      tongNguoiDung: Number(d?.tongNguoiDung ?? 0),
      soKhachHang: Number(d?.soKhachHang ?? 0),
      soChuTro: Number(d?.soChuTro ?? 0),
      soChuTroChoDuyet: Number(d?.soChuTroChoDuyet ?? 0),
      tongDoanhThu,
      soLichHoanThanh: Number(d?.soLichHoanThanh ?? 0),
      tongQuyHeThong,
      tongQuyThucTe: Number(d?.tongQuyThucTe ?? tongQuyHeThong + tongDoanhThu),
      quyTamGiuCoc: Number(d?.quyTamGiuCoc ?? 0),
      tongSoDuViChuTro: Number(d?.tongSoDuViChuTro ?? 0),
      quyChoRut: Number(d?.quyChoRut ?? 0),
      soLenhRutChoDuyet: Number(d?.soLenhRutChoDuyet ?? 0),
      bieuDoDoanhThu: Array.isArray(d?.bieuDoDoanhThu)
        ? d.bieuDoDoanhThu.map((p) => ({
            nhan: String(p?.nhan ?? '').replace(/^T(?=\d{2}\/\d{4}$)/, ''),
            doanhThu: Number(p?.doanhThu ?? 0),
            soLichHoanThanh: Number(p?.soLichHoanThanh ?? 0),
            soLichDat: Number(p?.soLichDat ?? 0),
          }))
        : d?.bieuDoDoanhThu === undefined
          ? [
              {
                nhan: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
                doanhThu: tongDoanhThu,
                soLichHoanThanh: 0,
                soLichDat: 0,
              },
            ]
          : [],
      coCauLoaiPhong: Array.isArray(d?.coCauLoaiPhong)
        ? d.coCauLoaiPhong.map((r) => ({
            maLoaiPhong: r?.maLoaiPhong ? String(r.maLoaiPhong) : undefined,
            tenLoaiPhong: String(r?.tenLoaiPhong ?? 'Khác'),
            soLuong: Number(r?.soLuong ?? 0),
            soPhongDangHienThi: Number(r?.soPhongDangHienThi ?? 0),
            luotXem: Number(r?.luotXem ?? 0),
            luotClickGoiY: Number(r?.luotClickGoiY ?? 0),
            soLichDat: Number(r?.soLichDat ?? 0),
            soLichHoanThanh: Number(r?.soLichHoanThanh ?? 0),
            doanhThuHoaHong: Number(r?.doanhThuHoaHong ?? 0),
            tyLeChot: Number(r?.tyLeChot ?? 0),
          }))
        : [],
      cacNamCoDuLieu: Array.isArray(d?.cacNamCoDuLieu)
        ? d.cacNamCoDuLieu.map(Number).filter((n) => Number.isFinite(n))
        : [],
      soSanhKyTruoc: d?.soSanhKyTruoc,
      pheuChuyenDoi: d?.pheuChuyenDoi,
      tongQuanAiTracking: d?.tongQuanAiTracking ?? null,
    };
  },

  generateRevenueInsights: async (
    filters?: AdminStatisticsFilter,
  ): Promise<AdminRevenueInsightResponse> => {
    const params: Record<string, number> = {};
    if (filters?.day !== null && filters?.day !== undefined) params.day = filters.day;
    if (filters?.month !== null && filters?.month !== undefined) params.month = filters.month;
    if (filters?.year !== null && filters?.year !== undefined) params.year = filters.year;

    return axiosClient.post<unknown, AdminRevenueInsightResponse>(
      '/api/admin/statistics/insights',
      null,
      // Two provider attempts, each bounded at 40s, plus connection and server processing.
      { params, timeout: 100_000 },
    );
  },

  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const d = await adminService.getStatistics();

    let soKhieuNai = 0;
    try {
      const cList = await axiosClient.get<unknown, AdminComplaintItem[]>('/api/admin/complaints');
      if (Array.isArray(cList)) {
        soKhieuNai = cList.filter((c) => c.trangThai === 'CHO_DUYET').length;
      }
    } catch {
      // ignore secondary counter failure
    }

    const currentMonth = new Date().getMonth() + 1;
    const tangTruongGiaoDich =
      d.bieuDoDoanhThu.length > 0
        ? d.bieuDoDoanhThu.map((p) => ({
            thang: p.nhan,
            giaTri: p.doanhThu,
          }))
        : [
            {
              thang: `Tháng ${currentMonth}`,
              giaTri: d.tongDoanhThu,
            },
          ];

    return {
      nguoiDung: { total: d.tongNguoiDung, label: 'Người dùng hệ thống' },
      soTinDang: { total: d.tongSoPhong, label: 'Tổng số phòng trọ' },
      doanhThu: {
        total: d.tongDoanhThu.toLocaleString('vi-VN') + ' ₫',
        label: 'Doanh thu hoa hồng sàn',
      },
      khieuNai: {
        total: soKhieuNai,
        label: 'Khiếu nại chờ duyệt',
        isAlert: soKhieuNai > 0,
      },
      hangDoi: {
        tinMoi: d.soPhongChoDuyet,
        xacMinhChuTro: d.soChuTroChoDuyet,
        baoCaoViPham: soKhieuNai,
      },
      tangTruongGiaoDich,
    };
  },

  getTreasuryStats: async (): Promise<AdminTreasuryStats> => {
    const d = await adminService.getStatistics();
    return {
      tongQuyHeThong: d.tongQuyHeThong,
      tongQuyThucTe: d.tongQuyThucTe,
      quyTamGiuCoc: d.quyTamGiuCoc,
      tongSoDuViChuTro: d.tongSoDuViChuTro,
      quyChoRut: d.quyChoRut,
      soLenhRutChoDuyet: d.soLenhRutChoDuyet,
      tongDoanhThu: d.tongDoanhThu,
    };
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

  getUserDetail: async (id: string): Promise<AdminUserDetailResponse> => {
    const raw = await axiosClient.get<unknown, {
      user: AdminUserItem & { thoiGianMoTaiKhoan?: string };
      soDu?: number;
      diemUyTin?: number | null;
      tamAnDen?: string | null;
      lichSuDiemUyTin?: AdminReputationHistoryItem[];
      taiKhoanNganHang?: AdminUserDetailResponse['taiKhoanNganHang'];
      giaoDich?: Array<AdminTransactionItem & { ngayGiaoDich?: string; moTa?: string }>;
      lichXemPhong?: Array<Record<string, unknown>>;
      phongChoThue?: Array<Record<string, unknown>>;
    }>(`/api/admin/users/${encodeURIComponent(id)}/detail`);

    return {
      user: {
        ...raw.user,
        ngayTao: raw.user.ngayTao || raw.user.thoiGianMoTaiKhoan || '',
      },
      soDu: Number(raw.soDu ?? 0),
      diemUyTin: raw.diemUyTin ?? raw.user.diemUyTin ?? null,
      tamAnDen: raw.tamAnDen ?? null,
      lichSuDiemUyTin: Array.isArray(raw.lichSuDiemUyTin) ? raw.lichSuDiemUyTin : [],
      taiKhoanNganHang: Array.isArray(raw.taiKhoanNganHang) ? raw.taiKhoanNganHang : [],
      giaoDich: Array.isArray(raw.giaoDich)
        ? raw.giaoDich.map((gd) => ({
            ...gd,
            thoiGian: gd.thoiGian || gd.ngayGiaoDich || '',
            ghiChu: gd.ghiChu || gd.moTa || '',
          }))
        : [],
      lichXemPhong: Array.isArray(raw.lichXemPhong)
        ? raw.lichXemPhong.map((a) => ({
            maDatLich: String(a.maDatLich ?? ''),
            maPhongTro: a.maPhongTro ? String(a.maPhongTro) : undefined,
            maKhachHang: a.maKhachHang ? String(a.maKhachHang) : undefined,
            tenKhachHang: String(a.tenKhachHang || 'Khách hàng'),
            sdtKhachHang: String(a.sdtKhachHang || '---'),
            maChuTro: a.maChuTro ? String(a.maChuTro) : undefined,
            tenChuTro: String(a.tenChuTro || 'Chủ trọ'),
            sdtChuTro: String(a.sdtChuTro || '---'),
            tenPhongTro: String(a.tenPhongTro || 'Phòng trọ'),
            diaChiPhong: String(a.diaChiPhong || '---'),
            ngayHen: String(a.ngayHen || a.thoiGianDat || ''),
            trangThai: (a.trangThai as AdminAppointmentItem['trangThai']) || 'CHO_XAC_NHAN',
            tienCoc: Number(a.tienCoc ?? 0),
            phiThu: Number(a.phiThu ?? 0),
            ghiChu: a.liDoHuy ? String(a.liDoHuy) : undefined,
          }))
        : [],
      phongChoThue: Array.isArray(raw.phongChoThue)
        ? raw.phongChoThue.map(mapRoomToAdminPost)
        : [],
    };
  },

  toggleLockUser: (id: string) => {
    return axiosClient.patch<unknown, AdminUserItem>(`/api/admin/users/${id}/toggle-lock`);
  },

  adjustLandlordReputation: (id: string, payload: AdminReputationAdjustPayload) => {
    return axiosClient.post<unknown, unknown>(`/api/admin/users/${encodeURIComponent(id)}/reputation`, payload);
  },

  resetUserPassword: (id: string, matKhauMoi?: string) => {
    return axiosClient.post<unknown, string>(`/api/admin/users/${id}/reset-password`, {
      matKhauMoi: matKhauMoi || 'InnFinder@2026',
    });
  },

  createAdmin: (payload: {
    tenDangNhap: string;
    hoVaTen: string;
    email: string;
    sdt: string;
    matKhau: string;
    matKhauAdminHienTai: string;
  }): Promise<AdminUserItem> => {
    return axiosClient.post<unknown, AdminUserItem>('/api/admin/admins', payload);
  },

  getLandlordRequests: async (): Promise<AdminLandlordRequestItem[]> => {
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/landlord-requests',
    );
    if (!Array.isArray(res)) return [];
    return res.map((r) => ({
      id: (r.maYeuCau as string | number) ?? (r.id as string | number) ?? '',
      maYeuCau: r.maYeuCau as string | undefined,
      maNguoiDung: String(r.maNguoiDung ?? ''),
      hoVaTen: String(r.hoVaTen || r.tenDangNhap || 'Người dùng'),
      email: String(r.email ?? ''),
      sdt: String(r.sdt ?? ''),
      cccd: String(r.cccd ?? ''),
      anhCccdTruoc: r.anhCccdTruoc as string | undefined,
      anhCccdSau: r.anhCccdSau as string | undefined,
      tenNganHang: String(r.tenNganHang ?? ''),
      soTaiKhoan: String(r.soTaiKhoan ?? ''),
      tenChuTaiKhoan: (r.tenChuTaiKhoan as string | undefined) || String(r.hoVaTen ?? ''),
      ngayGui: String(r.ngayGui ?? ''),
      trangThai: (r.trangThai as AdminLandlordRequestItem['trangThai']) || 'CHO_DUYET',
      lyDoTuChoi: r.lyDoTuChoi as string | undefined,
      avatarUrl: r.avatarUrl as string | undefined,
      diemUyTin: typeof r.diemUyTin === 'number' ? r.diemUyTin : 100,
    }));
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
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/rooms/pending',
    );
    if (!Array.isArray(res)) return [];
    return res.map(mapRoomToAdminPost);
  },

  getAllRooms: async (): Promise<AdminPostItem[]> => {
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>('/api/admin/rooms');
    if (!Array.isArray(res)) return [];
    return res.map(mapRoomToAdminPost);
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
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/transactions',
      { params },
    );
    if (!Array.isArray(res)) return [];
    return res.map((t) => ({
      maGiaoDich: String(t.maGiaoDich ?? ''),
      maDatLich: t.maDatLich as string | undefined,
      phongTro: String(t.noiDung || t.phongTro || 'Giao dịch hệ thống'),
      diaChiPhong: String(t.diaChiPhong || 'Hệ thống ví InnFinder'),
      soTien: Number(t.soTien ?? 0),
      loaiGiaoDich: String(t.loaiGiaoDich || 'GIAO_DICH'),
      trangThai: (t.trangThai as AdminTransactionItem['trangThai']) || 'CHO_THANH_TOAN',
      thoiGian: String(t.ngayGiaoDich || t.thoiGian || ''),
      nguoiThucHien: String(t.hoVaTen || t.tenNguoiDung || t.nguoiThucHien || 'Người dùng'),
      sdtNguoiThucHien: String(t.sdt || t.sdtNguoiThucHien || ''),
      chuTro: String(t.tenNguoiDung || t.chuTro || 'Hệ thống'),
      tienCoc: Number(t.tienCoc ?? t.soTien ?? 0),
      phiDichVu: Number(t.phiDichVu ?? 0),
      thucNhan: Number(t.thucNhan ?? t.soTien ?? 0),
      tenNganHang: t.tenNganHang as string | undefined,
      soTaiKhoan: t.soTaiKhoan as string | undefined,
      tenChuTaiKhoan: (t.tenChuTaiKhoan as string | undefined) || (t.hoVaTen as string | undefined),
      ghiChu: (t.noiDung as string | undefined) || (t.ghiChu as string | undefined),
    }));
  },

  approveWithdrawal: (id: string, maThamChieu?: string) => {
    return axiosClient.patch<unknown, AdminTransactionItem>(
      `/api/admin/transactions/${id}/approve`,
      maThamChieu ? { maThamChieu } : {},
    );
  },

  rejectWithdrawal: (id: string, reason?: string) => {
    return axiosClient.patch<unknown, AdminTransactionItem>(
      `/api/admin/transactions/${id}/reject`,
      { lyDo: reason || 'Từ chối rút tiền do thông tin tài khoản không khớp' },
    );
  },

  getAllComplaints: async (): Promise<AdminComplaintItem[]> => {
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/complaints',
    );
    if (!Array.isArray(res)) return [];
    return res.map((c) => {
      const rawImages = c.hinhAnh;
      const hinhAnh = Array.isArray(rawImages)
        ? rawImages.map(String)
        : rawImages
          ? [String(rawImages)]
          : [];
      return {
        maKhieuNai: String(c.maKhieuNai ?? ''),
        nguoiKhieuNai: String(c.tenNguoiGui || c.nguoiKhieuNai || c.maNguoiGui || 'Người dùng'),
        doiTuongBiKhieuNai: String(
          c.tenDoiTuongKhieuNai || c.doiTuongBiKhieuNai || c.doiTuongKhieuNai || 'Đối tượng',
        ),
        vanDe: String(c.vanDe ?? ''),
        thoiGian: String(c.ngayGui || c.thoiGian || ''),
        trangThai: (c.trangThai as TrangThaiKhieuNai) || 'CHO_DUYET',
        hinhAnh,
        mucDoViPham: c.mucDoViPham as MucDoViPham | undefined,
        ghiChuXuLy: (c.ketQua as string | undefined) || (c.ghiChuXuLy as string | undefined),
        lichHenLienQuan: Array.isArray(c.lichHenLienQuan)
          ? (c.lichHenLienQuan as Array<Record<string, unknown>>).map((b) => ({
              maDatLich: String(b.maDatLich ?? ''),
              maPhongTro: b.maPhongTro ? String(b.maPhongTro) : undefined,
              tenPhongTro: String(b.tenPhongTro || 'Phòng trọ'),
              ngayHen: String(b.ngayHen ?? ''),
              tienCoc: Number(b.tienCoc ?? 0),
              trangThai: (b.trangThai as AdminComplaintItem['lichHenLienQuan'] extends Array<infer T> ? T extends { trangThai: infer S } ? S : never : never) || 'CHO_XAC_NHAN',
              daNopCoc: Boolean(b.daNopCoc),
              daNhanLaiCoc: Boolean(b.daNhanLaiCoc),
              duDieuKienHoanCoc: Boolean(b.duDieuKienHoanCoc),
            }))
          : [],
      };
    });
  },

  resolveComplaint: (
    id: string,
    payload: {
      trangThai: TrangThaiKhieuNai;
      mucDoViPham?: MucDoViPham;
      ketQua?: string;
      ketLuan?: string;
      hoanCoc?: boolean;
      maDatLichHoanCoc?: string;
    },
  ) => {
    return axiosClient.patch<unknown, AdminComplaintItem>(
      `/api/admin/complaints/${id}/resolve`,
      {
        trangThai: payload.trangThai,
        mucDoViPham: payload.mucDoViPham,
        ketQua: payload.ketQua || payload.ketLuan,
        hoanCoc: payload.hoanCoc,
        maDatLichHoanCoc: payload.maDatLichHoanCoc,
      },
    );
  },

  getRoomTypeDepositFees: async (): Promise<RoomTypeDepositFee[]> => {
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/room-types/deposit-fees',
    );
    if (!Array.isArray(res)) return [];
    return res.map((r) => ({
      maLoaiPhong: String(r.maLpt || r.maLoaiPhong || ''),
      tenLoaiPhong: String(r.tenLoaiPhongTro || r.tenLoaiPhong || ''),
      soTienCoc: Number(r.soTienCoc ?? 0),
      phiThu: Number(r.phiThu ?? 0),
      tyLePhiPercent: r.tyLePhiPercent !== undefined ? Number(r.tyLePhiPercent) : undefined,
      moTa: r.moTa ? String(r.moTa) : undefined,
    }));
  },

  getDepositFeeHistory: async (maLpt?: string): Promise<DepositFeeHistoryItem[]> => {
    const res = await axiosClient.get<unknown, DepositFeeHistoryItem[]>(
      '/api/admin/room-types/deposit-fees/history',
      { params: maLpt ? { maLpt } : undefined },
    );
    return Array.isArray(res) ? res : [];
  },

  updateDepositFee: (maLpt: string, payload: UpdateDepositFeePayload) => {
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
    const roomsPage = await axiosClient.get<
      unknown,
      PageResponse<{ maPhongTro: string; diaChi: string; tieuDe?: string }>
    >('/api/rooms', {
      params: { page: 0, size: 30 },
    });
    const rooms = roomsPage?.content || [];
    const results = await Promise.all(
      rooms.map(async (room) => {
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
      }),
    );
    return results.flat();
  },

  // Tra cứu lịch xem phòng theo mã hẹn, mã phòng, mã người thuê, mã chủ trọ hoặc SĐT 2 bên
  getMonitoredViewings: async (keyword?: string): Promise<AdminAppointmentItem[]> => {
    const trimmed = keyword?.trim() || '';
    if (!trimmed) return [];
    const res = await axiosClient.get<unknown, Array<Record<string, unknown>>>(
      '/api/admin/appointments',
      { params: { keyword: trimmed } },
    );
    if (!Array.isArray(res)) return [];
    return res.map((a) => ({
      maDatLich: String(a.maDatLich ?? ''),
      maPhongTro: a.maPhongTro ? String(a.maPhongTro) : undefined,
      maKhachHang: a.maKhachHang ? String(a.maKhachHang) : undefined,
      tenKhachHang: String(a.tenKhachHang || 'Khách hàng'),
      sdtKhachHang: String(a.sdtKhachHang || '---'),
      maChuTro: a.maChuTro ? String(a.maChuTro) : undefined,
      tenChuTro: String(a.tenChuTro || 'Chủ trọ'),
      sdtChuTro: String(a.sdtChuTro || '---'),
      tenPhongTro: String(a.tenPhongTro || 'Phòng trọ'),
      diaChiPhong: String(a.diaChiPhong || '---'),
      ngayHen: String(a.ngayHen || a.thoiGianDat || ''),
      trangThai: (a.trangThai as AdminAppointmentItem['trangThai']) || 'CHO_XAC_NHAN',
      tienCoc: Number(a.tienCoc ?? 0),
      phiThu: Number(a.phiThu ?? 0),
      ghiChu: a.liDoHuy ? String(a.liDoHuy) : undefined,
    }));
  },
};
