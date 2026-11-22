import type {
  MucDoViPham,
  TrangThaiKhieuNai,
  TrangThaiYeuCauChuTro,
  VaiTro,
} from './auth-user.types';
import type { TrangThaiDatLich } from './booking.types';
import type { TrangThaiPhongTro } from './room.types';
import type { TrangThaiGD } from './transaction.types';

export interface AdminDashboardStats {
  nguoiDung: { total: number; label: string };
  soTinDang: { total: number; label: string };
  doanhThu: { total: string; label: string };
  khieuNai: { total: number; label: string; isAlert: boolean };
  hangDoi: {
    tinMoi: number;
    xacMinhChuTro: number;
    baoCaoViPham: number;
  };
  tangTruongGiaoDich: Array<{ thang: string; giaTri: number }>;
}

export interface AdminRevenuePoint {
  nhan: string;
  doanhThu: number;
  soLichHoanThanh: number;
}

export interface AdminRoomTypeStat {
  tenLoaiPhong: string;
  soLuong: number;
}

export interface AdminStatisticsFilter {
  day?: number | null;
  month?: number | null;
  year?: number | null;
}

export interface AdminStatisticsResponse {
  tongSoPhong: number;
  soPhongChoDuyet: number;
  soPhongDaDuyet: number;
  soPhongHoanThanh: number;
  soPhongHuy: number;
  tongNguoiDung: number;
  soKhachHang: number;
  soChuTro: number;
  soChuTroChoDuyet: number;
  tongDoanhThu: number;
  soLichHoanThanh: number;
  tongQuyHeThong: number;
  tongQuyThucTe: number;
  quyTamGiuCoc: number;
  tongSoDuViChuTro: number;
  quyChoRut: number;
  soLenhRutChoDuyet: number;
  bieuDoDoanhThu: AdminRevenuePoint[];
  coCauLoaiPhong: AdminRoomTypeStat[];
  cacNamCoDuLieu: number[];
}

export interface AdminRecommendedAction {
  tieuDe: string;
  moTa: string;
  mucDoUuTien: 'CAO' | 'TRUNG_BINH' | 'THEO_DOI';
  duongDan?: string;
}

export interface AdminRevenueInsightResponse {
  nguonPhanTich: 'AI' | 'RULE_BASED';
  tongQuan: string;
  danhGiaDoanhThu: string;
  danhGiaNganKho: string;
  danhGiaLoaiPhong: string;
  deXuatQuyetDinh: AdminRecommendedAction[];
}

export interface AdminTreasuryStats {
  tongQuyHeThong: number;
  tongQuyThucTe: number;
  quyTamGiuCoc: number;
  tongSoDuViChuTro: number;
  quyChoRut: number;
  soLenhRutChoDuyet: number;
  tongDoanhThu: number;
}

export interface AdminUserItem {
  maNguoiDung: string;
  tenDangNhap: string;
  hoVaTen?: string;
  email: string;
  sdt: string;
  cccd?: string;
  vaiTro: VaiTro;
  chuTro: boolean;
  trangThai: 'HOAT_DONG' | 'KHOA';
  trangThaiKhoa?: boolean;
  ngayTao: string;
  soTinDang?: number;
  soLichHen?: number;
  soGiaoDich?: number;
  avatarUrl?: string;
  hinhDaiDien?: string;
  diemUyTin?: number;
  soDu?: number;
  soTaiKhoan?: string;
  tenNganHang?: string;
}

export interface AdminPostItem {
  maPhongTro: string;
  tieuDe: string;
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  loaiPhong: string;
  trangThai: TrangThaiPhongTro;
  thoiGianDang: string;
  tenChuTro: string;
  sdtChuTro: string;
  maChuTro?: string;
  avatarChuTro?: string;
  hinhAnh: string[];
  moTa: string;
  tienIch: string[];
  cocPhong: number;
  kinhDo?: string;
  viDo?: string;
  lyDoTuChoi?: string;
  mucCocXemPhong?: number;
  phiHoaHong?: number;
}

export interface AdminComplaintRelatedAppointment {
  maDatLich: string;
  maPhongTro?: string;
  tenPhongTro: string;
  ngayHen: string;
  tienCoc: number;
  trangThai: TrangThaiDatLich;
  daNopCoc: boolean;
  daNhanLaiCoc: boolean;
  duDieuKienHoanCoc: boolean;
}

export interface AdminComplaintItem {
  maKhieuNai: string;
  nguoiKhieuNai: string;
  avatarNguoiKhieuNai?: string;
  doiTuongBiKhieuNai: string;
  avatarDoiTuong?: string;
  vanDe: string;
  thoiGian: string;
  trangThai: TrangThaiKhieuNai;
  hinhAnh: string[];
  mucDoViPham?: MucDoViPham;
  phongLienQuan?: {
    maPhong: string;
    tieuDe: string;
    chuTro: string;
    diaChi: string;
  };
  ghiChuXuLy?: string;
  lichHenLienQuan?: AdminComplaintRelatedAppointment[];
}

export interface AdminLandlordRequestItem {
  id: string | number;
  maYeuCau?: string;
  maNguoiDung: string;
  hoVaTen: string;
  email: string;
  sdt: string;
  cccd: string;
  anhCccdTruoc?: string;
  anhCccdSau?: string;
  tenNganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan?: string;
  ngayGui: string;
  trangThai: TrangThaiYeuCauChuTro;
  lyDoTuChoi?: string;
  avatarUrl?: string;
  diemUyTin?: number;
  ngayTaoTaiKhoan?: string;
}

export interface AdminTransactionItem {
  maGiaoDich: string;
  phongTro?: string;
  diaChiPhong?: string;
  soTien: number;
  loaiGiaoDich: string;
  trangThai: TrangThaiGD;
  thoiGian: string;
  nguoiThucHien: string;
  sdtNguoiThucHien?: string;
  chuTro?: string;
  tienCoc?: number;
  phiDichVu?: number;
  thucNhan?: number;
  tenNganHang?: string;
  soTaiKhoan?: string;
  ghiChu?: string;
  maDatLich?: string;
}

export interface AdminReviewItem {
  maDanhGia: string;
  phongTroId: string;
  tenPhongTro: string;
  diaChiPhong?: string;
  nguoiDanhGia: string;
  diem: number;
  noiDung: string;
  thoiGian: string;
  hinhAnh?: string[];
  trangThai: 'HIEN_THI' | 'AN';
  tongDanhGiaPhong?: number;
  diemTrungBinhPhong?: number;
}

export interface AdminAppointmentItem {
  maDatLich: string;
  tenKhachHang: string;
  sdtKhachHang: string;
  tenChuTro: string;
  sdtChuTro: string;
  tenPhongTro: string;
  diaChiPhong: string;
  ngayHen: string;
  trangThai: TrangThaiDatLich;
  phiThu?: number;
  ghiChu?: string;
  tienCoc?: number;
}

export interface RoomTypeDepositFee {
  maLoaiPhong: string;
  tenLoaiPhong: string;
  soTienCoc: number;
  phiThu: number;
  moTa?: string;
  ngayCapNhat?: string;
}

export interface AdminCategoryItem {
  ma: string;
  ten: string;
  loai: 'LOAI_PHONG' | 'TIEN_ICH';
  moTa?: string;
  trangThai?: boolean;
}
