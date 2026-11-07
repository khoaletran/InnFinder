package com.innfinder.backend.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponseDTO {
    private String maDanhGia;
    private String maPhongTro;
    private String maNguoiDung;
    private String tenDangNhap;
    private String hinhDaiDien;
    private Integer diem;
    private String noiDung;
    private LocalDateTime ngayDanhGia;

    // Thông tin phòng trọ để hiển thị tiện lợi cho chủ trọ
    private String diaChiPhong;
    private String tieuDePhong;
}
