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
}
