import type { MucDoViPham, TrangThaiKhieuNai } from './auth-user.types';
import type { TrangThaiDatLich } from './booking.types';
import type { TrangThaiPhongTro } from './room.types';
import type { TrangThaiGD } from './transaction.types';

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
  dsMaTienIch: string[];
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

export interface LandlordTransactionItem {
  id: string;
  maGiaoDich: string;
  khachHangTen: string;
  phongTen: string;
  tienCoc: number;
  phiDichVu: number;
  thucNhan: number;
  trangThai: TrangThaiGD;
  ngayGiaoDich: string;
  thoiGianTao?: string;
  loaiGiaoDich: 'DA_THU' | 'HOAN_COC' | 'RUT_TIEN';
}

export interface BankAccountItem {
  id?: number;
  soTaiKhoan: string;
  tenNganHang: string;
  tenChuTaiKhoan?: string;
}

export interface LandlordWalletInfo {
  soDu: number;
  diemUyTin: number;
  dsTaiKhoanNganHang: BankAccountItem[];
  tongDaThu: number;
  tongDaRut: number;
}

export interface ReviewItem {
  id: string;
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
  mucDoViPham: MucDoViPham;
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
