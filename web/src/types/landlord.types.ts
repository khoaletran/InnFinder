import type { MucDoViPham, TrangThaiKhieuNai } from './auth-user.types';
import type { TrangThaiDatLich } from './booking.types';
import type { GiaNuoc, TrangThaiPhongTro } from './room.types';
import type { TransactionResponse } from './transaction.types';

export type { TrangThaiPhongTro };

export interface ReputationHistoryItem {
  id: number;
  bienDong: number;
  diemTruoc: number;
  diemSau: number;
  loaiSuKien: string;
  maThamChieu?: string | null;
  lyDo: string;
  thoiGian: string;
}

export interface LandlordReputationSummary {
  diemUyTin: number;
  phanHang: string;
  tamAnDen?: string | null;
  dangTamAn: boolean;
  gioiHanSoPhong?: number | null;
  chanDangTinMoi: boolean;
  lichSu: ReputationHistoryItem[];
}

export interface LandlordDashboardStats {
  tongPhong: number;
  phongChoDuyet: number;
  dangTrong: number;
  dangThue: number;
  tongDanhGia: number;
  diemDanhGia: number | string;
  soDu: number;
  diemUyTin?: number;
  tamAnDen?: string | null;
  yeuCauMoi: number;
  tongPhongMoi?: number;
}

export interface LandlordRoomItem {
  id: string;
  maPhongTro: string;
  tenPhong: string;
  giaThue: number;
  cocPhong?: number;
  giaDien?: number;
  giaNuoc?: GiaNuoc;
  dienTich: number;
  soNguoi?: number;
  trangThai: TrangThaiPhongTro;
  isRented?: boolean;
  tamAn?: boolean;
  hinhAnhUrl?: string;
  danhSachAnh?: string[];
  diaChi: string;
  kinhDo?: number | string;
  viDo?: number | string;
  moTa?: string;
  loaiPhong?: string;
  maLpt?: string;
  dsTienIch?: string[];
  dsMaTienIch?: string[];
  thoiGianDang?: string;
}

export interface RoomCreatePayload {
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  maLpt: string;
  moTa?: string;
  kinhDo: string;
  viDo: string;
  coc: number;
  giaDien: number;
  giaNuoc: GiaNuoc;
  dsTienIch: string[];
  hinhAnhUrls: string[];
}

export interface LandlordAppointmentItem {
  id: string;
  khachHangTen: string;
  sdt: string;
  emailKhachHang?: string;
  maKhachHang?: string;
  phongTen: string;
  thoiGian: string;
  ngayHen: string;
  rawNgayHen?: string;
  ghiChu?: string;
  trangThai: TrangThaiDatLich;
  maPhongTro?: string;
  diaChiPhong?: string;
  giaThue?: number;
  coc?: number;
  phiThu?: number;
  hinhAnh?: string;
  daNhanLaiCoc?: boolean;
  daNopCoc?: boolean;
  khachHangDongY?: boolean | null;
  chuTroDongY?: boolean | null;
  lyDoHuy?: string;
}

export interface LandlordTransactionItem extends TransactionResponse {
  maDatLich?: string;
  maPhongTro?: string;
  maThamChieuNganHang?: string;
  nganHangNhan?: string;
  taiKhoanNhan?: string;
  tenNguoiNhan?: string;
  cocGoc?: number;
  phiHoaHong?: number;
}

export interface BankAccountItem {
  id?: number;
  soTaiKhoan: string;
  tenNganHang: string;
  tenChuTaiKhoan?: string;
  macDinh?: boolean;
}

export interface LandlordWalletInfo {
  soDu: number;
  diemUyTin: number;
  tamAnDen?: string | null;
  dsTaiKhoanNganHang: BankAccountItem[];
  tongDaThu: number;
  tongDaRut: number;
  dangChoRut?: number;
}

export interface ReviewItem {
  id: string;
  maPhongTro?: string;
  khachHangTen: string;
  hinhDaiDien?: string;
  phongTen: string;
  diem: number;
  noiDung: string;
  thoiGian: string;
  phanHoi?: string;
}

export interface ComplaintItem {
  id: string;
  maKhieuNai: string;
  nguoiGuiTen: string;
  doiTuongTen: string;
  vanDe: string;
  hinhAnh?: string;
  trangThai: TrangThaiKhieuNai;
  mucDoViPham?: MucDoViPham;
  ngayGui: string;
  ketQua?: string;
}

export interface AmenityItem {
  maTienIch: string;
  tenTienIch: string;
  bieuTuong?: string;
}

export interface CategoryItem {
  maLpt: string;
  tenLoaiPhongTro: string;
  soTienCoc?: number;
  phiThu?: number;
}

export interface LandlordAnalyticsSummary {
  soDuHienTai: number;
  diemUyTin: number;
  tongPhong: number;
  phongDangMo: number;
  phongDaThue: number;
  phongChoDuyet: number;
  tongTienCocThucNhan: number;
  tongPhiHoaHongDaTra: number;
  tongBoiThuongNoShow: number;
  tongLuotHienThi: number;
  tongLuotClick: number;
  ctrPercent: number;
  tongLuotXemPhong: number;
  tongLuotXemTour360: number;
  tongYeuThich: number;
  tongLichHen: number;
  lichChoDuyet: number;
  lichDaXem: number;
  lichHoanThanh: number;
  lichHuy: number;
  tyLeChotPercent: number;
  diemDanhGiaTrungBinh: number;
  tongDanhGia: number;
}

export interface LandlordMonthlyCashflowPoint {
  thang: string;
  tienThucNhan: number;
  phiHoaHong: number;
  soLichHoanThanh: number;
  soLichDat: number;
}

export interface LandlordFunnelStats {
  luotHienThi: number;
  luotClick: number;
  luotXem: number;
  luotXemTour360: number;
  luotYeuThich: number;
  lichDatXem: number;
  daXemThucTe: number;
  chotThue: number;
}

export type LandlordRoomHealth =
  | 'HUT_KHACH'
  | 'XEM_NHIEU_IT_COC'
  | 'CTR_THAP'
  | 'DA_THUE'
  | 'CHO_DUYET'
  | 'ON_DINH';

export interface LandlordRoomPerformance {
  maPhongTro: string;
  tenPhong: string;
  diaChi: string;
  tenLoaiPhong: string;
  hinhAnhUrl?: string;
  trangThai: TrangThaiPhongTro;
  tamAn: boolean;
  giaThue: number;
  giaTrungBinhCungLoai: number;
  chenhLechGiaPercent: number;
  coTour360: boolean;
  soAnh: number;
  luotHienThi: number;
  luotClick: number;
  ctrPercent: number;
  luotXem: number;
  luotXemTour360: number;
  luotYeuThich: number;
  soLichHen: number;
  soLichHoanThanh: number;
  soLichKhachTuChoi: number;
  tyLeChotPercent: number;
  diemDanhGiaTrungBinh: number;
  soDanhGia: number;
  nhanSucKhoe: LandlordRoomHealth;
}

export interface LandlordRecommendationItem {
  id: string;
  maPhongTro?: string;
  tenPhong?: string;
  mucDoUuTien: 'CAO' | 'TRUNG_BINH' | 'GOI_Y';
  nhom: 'LICH_HEN' | 'GIA_THUE' | 'NOI_DUNG_360' | 'CHAT_LUONG';
  tieuDe: string;
  moTa: string;
  hanhDongLabel: string;
  duongDan: string;
}

export interface LandlordAnalyticsResponse {
  months: number;
  tongQuan: LandlordAnalyticsSummary;
  bieuDoDongTien: LandlordMonthlyCashflowPoint[];
  pheuKhachHang: LandlordFunnelStats;
  hieuQuaTungPhong: LandlordRoomPerformance[];
  deXuatCaiThien: LandlordRecommendationItem[];
}
