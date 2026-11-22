import type { MucDoViPham, TrangThaiKhieuNai } from './auth-user.types';
import type { TrangThaiDatLich } from './booking.types';
import type { TrangThaiPhongTro } from './room.types';
import type { TransactionResponse } from './transaction.types';

export type { TrangThaiPhongTro };

export interface LandlordDashboardStats {
  tongPhong: number;
  phongChoDuyet: number;
  dangTrong: number;
  dangThue: number;
  tongDanhGia: number;
  diemDanhGia: number | string;
  soDu: number;
  diemUyTin?: number;
  yeuCauMoi: number;
  tongPhongMoi?: number;
}

export interface LandlordRoomItem {
  id: string;
  maPhongTro: string;
  tenPhong: string;
  giaThue: number;
  cocPhong?: number;
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
