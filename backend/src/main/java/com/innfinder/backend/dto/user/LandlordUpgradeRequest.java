package com.innfinder.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordUpgradeRequest {

    @NotBlank(message = "Vui lòng nhập số CCCD để xác thực danh tính")
    @Pattern(regexp = "^[0-9]{12}$", message = "Số CCCD phải đủ 12 chữ số hợp lệ")
    private String cccd;

    @NotBlank(message = "Ảnh mặt trước CCCD không được để trống")
    private String anhCccdTruoc;

    @NotBlank(message = "Ảnh mặt sau CCCD không được để trống")
    private String anhCccdSau;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    private String soTaiKhoan;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String tenNganHang;

    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    private String tenChuTaiKhoan;
}
