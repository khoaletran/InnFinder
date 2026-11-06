package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.enums.VaiTro;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDTO {
    private String maNguoiDung;
    private String tenDangNhap;
    private String email;
    private String sdt;
    private String cccd;
    private VaiTro vaiTro;
    private String hinhDaiDien;
    private LocalDate thoiGianMoTaiKhoan;
    private Boolean chuTro;
    private Boolean trangThaiKhoa;
}
