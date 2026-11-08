package com.innfinder.backend.dto.landlord;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WithdrawRequest {

    @NotNull(message = "Số tiền rút không được để trống")
    @Min(value = 50000, message = "Số tiền rút tối thiểu là 50.000 VNĐ")
    private Long soTien;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    private String soTaiKhoan;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String tenNganHang;

    private String ghiChu;
}
