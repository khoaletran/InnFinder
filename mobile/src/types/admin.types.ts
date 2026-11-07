// ================= ADMIN TYPES =================

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

export interface AdminUserItem {
  maNguoiDung: string;
  tenDangNhap: string;
  hoVaTen: string;
  email: string;
  sdt: string;
  cccd?: string;
  vaiTro: 'QUAN_TRI' | 'KHACH_HANG';
  chuTro: boolean;
  trangThai: 'HOAT_DONG' | 'KHOA';
  ngayTao: string;
  soTinDang: number;
  soLichHen: number;
  soGiaoDich: number;
  avatarUrl?: string;
}

export interface AdminPostItem {
  maPhongTro: string;
  tieuDe: string;
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  loaiPhong: string;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'HOAN_THANH';
  thoiGianDang: string;
  tenChuTro: string;
  sdtChuTro: string;
  avatarChuTro?: string;
  hinhAnh: string[];
  moTa: string;
  tienIch: string[];
  cocPhong: number;
  kinhDo?: string;
  viDo?: string;
  lyDoTuChoi?: string;
}

export interface AdminComplaintItem {
  maKhieuNai: string;
  nguoiKhieuNai: string;
  avatarNguoiKhieuNai?: string;
  doiTuongBiKhieuNai: string;
  avatarDoiTuong?: string;
  vanDe: string;
  thoiGian: string;
  trangThai: 'CHO_XU_LY' | 'DANG_XU_LY' | 'DA_XU_LY' | 'TU_CHOI';
  hinhAnh: string[];
  phongLienQuan?: {
    maPhong: string;
    tieuDe: string;
    chuTro: string;
    diaChi: string;
  };
  ghiChuXuLy?: string;
}

export interface AdminLandlordRequestItem {
  maYeuCau: string;
  maNguoiDung: string;
  hoVaTen: string;
  email: string;
  sdt: string;
  cccd: string;
  tenNganHang: string;
  soTaiKhoan: string;
  ngayGui: string;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  lyDoTuChoi?: string;
  avatarUrl?: string;
}

export interface AdminTransactionItem {
  maGiaoDich: string;
  phongTro: string;
  diaChiPhong?: string;
  soTien: number;
  loaiGiaoDich: 'YEU_CAU_RUT_TIEN' | 'COC_GIU_CHO' | 'HOAN_COC' | 'THANH_TOAN_CHU_TRO' | string;
  trangThai: 'THANH_CONG' | 'DANG_XU_LY' | 'THAT_BAI';
  thoiGian: string;
  nguoiThucHien: string;
  chuTro: string;
  tienCoc: number;
  phiDichVu: number;
  thucNhan: number;
  tenNganHang?: string;
  soTaiKhoan?: string;
  ghiChu?: string;
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
  trangThai: 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY';
  ghiChu?: string;
  tienCoc?: number;
}

export interface AdminCategoryItem {
  ma: string;
  ten: string;
  loai: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC';
  moTa?: string;
  trangThai: boolean;
}
