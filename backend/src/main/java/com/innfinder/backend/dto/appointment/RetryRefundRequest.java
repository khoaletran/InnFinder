package com.innfinder.backend.dto.appointment;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetryRefundRequest {

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String tenNganHang;

    @NotBlank(message = "Số tài khoản không được để trống")
    private String soTaiKhoan;

    private String tenChuTaiKhoan;
}
