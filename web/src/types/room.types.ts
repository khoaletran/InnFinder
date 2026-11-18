// web/src/types/room.types.ts

export type TrangThaiPhongTro = "CHO_DUYET" | "DA_DUYET" | "HOAN_THANH" | "HUY";

export interface CategoryResponse {
  maLpt?: string;
  maLoaiPhong?: string;
  tenLoaiPhong?: string;
  tenLoaiPhongTro?: string;
  moTa?: string;
}

export interface AmenityResponse {
  maTienIch: string;
  tenTienIch: string;
  moTa?: string;
}

export interface ImageResponse {
  maHinhAnh?: string;
  url: string;
  thuTuAnh?: number;
  laDaiDien?: boolean;
}

export interface LandlordSummaryResponse {
  maChuTro?: string;
  hoTen?: string;
  hoVaTen?: string;
  sdt?: string;
  hinhDaiDien?: string;
  diemUyTin?: number;
}

export interface ReviewResponseDTO {
  maDanhGia: string;
  maPhongTro: string;
  maNguoiDung: string;
  tenNguoiDung?: string;
  tenDangNhap?: string;
  hinhDaiDien?: string;
  diem: number;
  noiDung: string;
  ngayDanhGia?: string;
}

export interface RoomSummaryResponse {
  maPhongTro: string;
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  maLpt?: string;
  tenLoaiPhong?: string;
  anhDaiDien?: string;
  kinhDo: string;
  viDo: string;
  diemUyTinChuTro?: number;
  thoiGianDang?: string;
  trangThai?: TrangThaiPhongTro;
  tieuDe?: string;
  dsTienIch?: string[];
  hinhAnh?: { duongDan: string }[];
}

export interface RoomDetailResponse {
  maPhongTro: string;
  diaChi: string;
  giaThue: number;
  dienTich: number;
  soNguoi: number;
  moTa?: string;
  kinhDo: string;
  viDo: string;
  coc?: number;
  thoiGianDang?: string;
  trangThai?: TrangThaiPhongTro;
  tieuDe?: string;
  loaiPhong?: CategoryResponse;
  dsTienIch?: AmenityResponse[];
  dsHinhAnh?: ImageResponse[];
  chuTro?: LandlordSummaryResponse;
  diemDanhGiaTrungBinh?: number;
  tongSoDanhGia?: number;
  hinhAnh?: { duongDan: string }[];
}

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
