package com.innfinder.backend.dto.bank;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankLookupRequest {

    @NotBlank(message = "Mã BIN ngân hàng không được để trống")
    private String bin;

    @NotBlank(message = "Số tài khoản không được để trống")
    @Pattern(regexp = "^\\d{6,20}$", message = "Số tài khoản phải gồm từ 6 đến 20 chữ số")
    private String soTaiKhoan;
}
