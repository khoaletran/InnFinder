package com.innfinder.backend.dto.user;

import com.innfinder.backend.entity.enums.VaiTro;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private String maNguoiDung;
    private String tenDangNhap;
    private String email;
    private String sdt;
    private String cccd;
    private String hinhDaiDien;
    private VaiTro vaiTro;
    private Boolean chuTro;
    private LocalDate thoiGianMoTaiKhoan;
}