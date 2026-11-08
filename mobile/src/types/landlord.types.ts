export interface LandlordDashboardStats {
  tongPhong: number;
  phongChoDuyet: number;
  dangTrong: number;
  tongDanhGia: number;
  diemDanhGia: number | string;
  soDu: number;
  tongPhongMoi?: number;
  yeuCauMoi?: number;
  dangThue?: number;
}

export interface LandlordRoomItem {
  id: string;
  maPhongTro: string;
  tenPhong: string;
  giaThue: number;
  dienTich: number;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'HOAN_THANH' | 'HUY';
  isRented?: boolean;
  hinhAnhUrl?: string;
  diaChi: string;
  thoiGianDang?: string;
}

export interface LandlordPostItem {
  id: string;
  tenPhong: string;
  giaThue: number;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'HOAN_THANH' | 'HUY';
  hinhAnhUrl?: string;
  lyDoTuChoi?: string;
  ngayDang: string;
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
}

export interface LandlordRentalRequestItem {
  id: string;
  khachHangTen: string;
  sdt: string;
  phongTen: string;
  giaThue: number;
  ngayNhanPhong: string;
  thoiGianThue: string;
  soNguoi: number;
  ghiChu?: string;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
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

export interface WithdrawPayload {
  soTien: number;
  soTaiKhoan: string;
  tenNganHang: string;
  ghiChu?: string;
}

export interface CreateRoomStep1Data {
  tenPhong: string;
  maLPT: string;
  giaThue: number;
  cocPhong: number;
  dienTich: number;
  soNguoi: number;
  diaChi?: string;
}

export interface CreateRoomStep2Data {
  diaChi: string;
  kinhDo: string;
  viDo: string;
}

export interface CreateRoomStep3Data {
  tienIchIds: string[];
}

export interface CreateRoomStep4Data {
  moTa: string;
}

export interface RoomImageItem {
  uri: string;
  isCover: boolean;
  name?: string;
  type?: string;
}
