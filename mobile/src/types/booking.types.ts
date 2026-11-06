// TrangThaiDatLich khong doi chieu voi backend enum
export type TrangThaiDatLich =
  | "CHO_XAC_NHAN"
  | "XAC_NHAN"
  | "HOAN_THANH"
  | "HUY";

// PhieuDatLich Response khop voi AppointmentResponse backend
export interface AppointmentResponse {
  maDatLich: string;
  ngayHen: string; // Dinh dang ISO: "2026-10-14T09:00:00"
  trangThai: TrangThaiDatLich;
  coc: number;
  phiThu: number;
  liDoHuy?: string;

  // Thong tin phong tro
  maPhongTro: string;
  diaChiPhong?: string;
  giaThue: number;
  tieuDePhong?: string;
  hinhAnh?: string;

  // Thong tin khach hang
  maKhachHang?: string;
  tenKhachHang?: string;
  sdtKhachHang?: string;

  // Thong tin chu tro
  maChuTro?: string;
  tenChuTro?: string;
  sdtChuTro?: string;
}

// Request tao lich hen xem phong
export interface AppointmentCreateRequest {
  maPhongTro: string;
  ngayHen: string; // ISO yyyy-MM-ddTHH:mm:ss
  ghiChu?: string;
}

// Request huy lich hen
export interface AppointmentCancelRequest {
  liDoHuy: string;
}
// Khớp 100% Enum TrangThaiGD.java
export type TrangThaiGD =
  | "CHO_THANH_TOAN"
  | "THANH_CONG"
  | "THAT_BAI"
  | "HOAN_TIEN";

// Khớp 100% TransactionResponse.java
export interface TransactionResponse {
  maGiaoDich: string;
  soTien: number;
  loaiGiaoDich: string; // COC_GIU_CHO, HOAN_COC, NAP_TIEN, RUT_TIEN...
  noiDung: string;
  ngayGiaoDich: string; // LocalDateTime ISO pattern yyyy-MM-dd'T'HH:mm:ss
  trangThai: TrangThaiGD;
}
// DTO Danh gia phong sau khi xem

// DTO Đánh giá phòng (Khớp 100% ReviewRequestDTO.java)
export interface ReviewRequestDTO {
  maNguoiDung: string;
  diem: number; // 1 đến 5 sao
  noiDung: string;
}
