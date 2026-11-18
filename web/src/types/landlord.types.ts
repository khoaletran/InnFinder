export type TrangThaiPhongTro = 'CHO_DUYET' | 'DA_DUYET' | 'HOAN_THANH' | 'HUY';

export interface LandlordDashboardStats {
  tongPhong: number;
  phongChoDuyet: number;
  dangTrong: number;
  dangThue: number;
  tongDanhGia: number;
  diemDanhGia: number | string;
  soDu: number;
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
  thoiGianDang?: string;
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
  trangThai: 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY';
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
  trangThai: 'THANH_CONG' | 'HOAN_TIEN' | 'CHO_THANH_TOAN' | 'THAT_BAI';
  ngayGiaoDich: string;
  thoiGianTao?: string;
  loaiGiaoDich: 'DA_THU' | 'HOAN_COC' | 'RUT_TIEN';
}

export interface BankAccountItem {
  id?: number;
  soTaiKhoan: string;
  tenNganHang: string;
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
  trangThai: 'CHO_DUYET' | 'DANG_XU_LY' | 'DA_XU_LI' | 'DA_HUY';
  mucDoViPham: 'NHE' | 'TRUNG_BINH' | 'NANG';
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
