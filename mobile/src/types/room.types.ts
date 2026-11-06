// mobile/src/types/room.types.ts

// 1. Trạng thái phòng trọ (Khớp Enum TrangThaiPhongTro trong AGENTS.md)
export type TrangThaiPhongTro = "CHO_DUYET" | "DA_DUYET" | "HOAN_THANH" | "HUY";

// 2. DTO Danh mục Loại phòng trọ & Tiện ích
export interface CategoryResponse {
  maLpt: string;
  tenLoaiPhongTro: string;
  moTa?: string;
}

export interface AmenityResponse {
  maTienIch: string;
  tenTienIch: string;
  moTa?: string;
}

// 3. DTO Ảnh phòng trọ
export interface ImageResponse {
  maHinhAnh: string;
  url: string;
  thuTuAnh: number;
  laDaiDien: boolean;
}

// 4. DTO Tóm tắt chủ trọ trong chi tiết phòng
export interface LandlordSummaryResponse {
  maChuTro: string;
  hoTen: string;
  sdt: string;
  hinhDaiDien?: string;
  diemUyTin: number;
}

// 5. DTO Tóm tắt phòng trọ (Hiển thị thẻ danh sách, tìm kiếm, yêu thích)
export interface RoomSummaryResponse {
  maPhongTro: string;
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  maLpt: string;
  tenLoaiPhong: string;
  anhDaiDien: string;
  kinhDo: string;
  viDo: string;
  diemUyTinChuTro: number;
  thoiGianDang: string;
}

// 6. DTO Chi tiết phòng trọ
export interface RoomDetailResponse {
  maPhongTro: string;
  giaThue: number;
  dienTich: number;
  moTa?: string;
  soNguoi: number;
  thoiGianDang: string;
  trangThai: TrangThaiPhongTro;
  diaChi: string;
  kinhDo: string;
  viDo: string;
  coc: number; // Tiền cọc hợp đồng
  loaiPhong?: CategoryResponse;
  dsTienIch: AmenityResponse[];
  dsHinhAnh: ImageResponse[];
  chuTro: LandlordSummaryResponse;
  diemDanhGiaTrungBinh: number;
  tongSoDanhGia: number;
}

// 7. DTO Đánh giá phòng trọ
export interface ReviewResponseDTO {
  maDanhGia: string;
  maPhongTro: string;
  maNguoiDung: string;
  tenDangNhap: string;
  hinhDaiDien?: string;
  diem: number;
  noiDung?: string;
  ngayDanhGia: string;
}

// 8. DTO Tham số lọc phòng
export interface RoomFilterRequest {
  keyword?: string;
  minGia?: number;
  maxGia?: number;
  minDienTich?: number;
  maxDienTich?: number;
  soNguoi?: number;
  maLpt?: string;
  dsTienIch?: string[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}
