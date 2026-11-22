package com.innfinder.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBankAccountRequest {

    @NotBlank(message = "Số tài khoản không được để trống")
    @Pattern(regexp = "^\\d{6,20}$", message = "Số tài khoản ngân hàng phải từ 6 đến 20 chữ số")
    private String soTaiKhoan;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String tenNganHang;
    @jakarta.validation.constraints.Size(max = 100)
    private String tenChuTaiKhoan;
}
