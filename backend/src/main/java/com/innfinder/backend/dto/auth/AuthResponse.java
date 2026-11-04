package com.innfinder.backend.dto.auth;

import com.innfinder.backend.entity.enums.VaiTro;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private String maNguoiDung;
    private String tenDangNhap;
    private String email;
    private String sdt;
    private VaiTro vaiTro;
    private Boolean chuTro;
}