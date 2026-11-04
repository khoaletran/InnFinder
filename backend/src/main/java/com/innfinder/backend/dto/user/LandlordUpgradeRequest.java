package com.innfinder.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LandlordUpgradeRequest {

    @NotBlank(message = "Vui lòng nhập số CCCD để xác thực danh tính")
    @Pattern(regexp = "^[0-9]{12}$", message = "Số CCCD phải đủ 12 chữ số hợp lệ")
    private String cccd;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    private String soTaiKhoan;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String tenNganHang;
}