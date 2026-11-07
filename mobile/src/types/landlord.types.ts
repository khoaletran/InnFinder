export interface LandlordDashboardStats {
  tongPhong: number;
  tongPhongMoi: number;
  dangTrong: number;
  yeuCauMoi: number;
  dangThue: number;
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
  phongTen: string;
  thoiGian: string;
  ngayHen: string;
  ghiChu?: string;
  trangThai: 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY';
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
  loaiGiaoDich: 'DA_THU' | 'HOAN_COC';
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
