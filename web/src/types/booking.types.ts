// TrangThaiDatLich khớp với backend enum
export type TrangThaiDatLich =
  | "CHO_XAC_NHAN"
  | "XAC_NHAN"
  | "HOAN_THANH"
  | "HUY";

// PhieuDatLich Response khớp với AppointmentResponse backend
export interface AppointmentResponse {
  maDatLich: string;
  ngayHen: string; // Định dạng ISO: "2026-10-14T09:00:00"
  thoiGianDat?: string; // Thời gian gửi yêu cầu đặt lịch ISO: "2026-10-14T08:30:00"
  trangThai: TrangThaiDatLich;
  coc: number;
  phiThu: number;
  daNhanLaiCoc?: boolean; // Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực
  khachHangDongY?: boolean | null; // Quyết định thuê của khách hàng (true: thuê, false: không thuê)
  chuTroDongY?: boolean | null; // Quyết định cho thuê của chủ trọ (true: đồng ý, false: từ chối)
  liDoHuy?: string;
  daNopCoc?: boolean; // Cờ xác định khách đã nộp tiền cọc xem phòng hay chưa

  // Thông tin phòng trọ
  maPhongTro: string;
  diaChiPhong?: string;
  giaThue: number;
  tieuDePhong?: string;
  hinhAnh?: string;

  // Thông tin khách hàng
  maKhachHang?: string;
  tenKhachHang?: string;
  sdtKhachHang?: string;

  // Thông tin chủ trọ
  maChuTro?: string;
  tenChuTro?: string;
  sdtChuTro?: string;
}

// Request tạo lịch hẹn xem phòng
export interface AppointmentCreateRequest {
  maPhongTro: string;
  ngayHen: string; // ISO yyyy-MM-ddTHH:mm:ss
  ghiChu?: string;
}

// Request hủy lịch hẹn
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
  loaiGiaoDich: string; // COC_XEM_PHONG, HOAN_COC, CONG_TIEN_COC...
  noiDung: string;
  ngayGiaoDich: string; // LocalDateTime ISO pattern yyyy-MM-dd'T'HH:mm:ss
  trangThai: TrangThaiGD;
}

// DTO Đánh giá phòng (Khớp 100% ReviewRequestDTO.java)
export interface ReviewRequestDTO {
  maNguoiDung?: string;
  diem: number; // 1 đến 5 sao
  noiDung: string;
}

// Response Đánh giá phòng (Khớp 100% ReviewResponseDTO.java)
export interface ReviewResponseDTO {
  maDanhGia: string;
  maPhongTro: string;
  maNguoiDung: string;
  tenDangNhap?: string;
  hinhDaiDien?: string;
  diem: number;
  noiDung: string;
  ngayDanhGia: string;
  diaChiPhong?: string;
  tieuDePhong?: string;
}
