// web/src/types/room.types.ts

export type TrangThaiPhongTro = "CHO_DUYET" | "DA_DUYET" | "HOAN_THANH" | "HUY";

export interface CategoryResponse {
  maLpt: string;
  tenLoaiPhongTro: string;
  moTa?: string;
  soTienCoc?: number; // Mức cọc xem phòng quy định theo loại phòng
  phiThu?: number; // Mức phí hoa hồng sàn trích lại khi thuê thành công
}

export interface AmenityResponse {
  maTienIch: string;
  tenTienIch: string;
  moTa?: string;
}

export interface ImageResponse {
  maHinhAnh: string;
  url: string;
  thuTuAnh: number;
  laDaiDien: boolean;
}

export interface LandlordSummaryResponse {
  maChuTro: string;
  hoTen: string;
  sdt: string;
  hinhDaiDien?: string;
  diemUyTin: number;
}

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
  liDoHuy?: string;
  tenPhong?: string;
}
