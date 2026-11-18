// DTO Đánh giá phòng (Tuân thủ Mục 5.3: Không truyền maNguoiDung trong Request Body)
export interface ReviewRequestDTO {
  diem: number; // 1 đến 5 sao
  noiDung: string;
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
  ngayDanhGia: string;
  diaChiPhong?: string;
  tieuDePhong?: string;
}
