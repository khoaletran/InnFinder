package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDepositFeeRequest {

    @NotNull(message = "Số tiền cọc không được để trống")
    @Min(value = 50000, message = "Số tiền cọc giữ chân tối thiểu là 50.000 VNĐ")
    @Max(value = 2000000, message = "Số tiền cọc giữ chân tối đa là 2.000.000 VNĐ")
    private Integer soTienCoc;

    @NotNull(message = "Mức phí thu sàn không được để trống")
    @Min(value = 0, message = "Mức phí thu sàn không được âm")
    @Max(value = 600000, message = "Mức phí thu sàn tối đa là 600.000 VNĐ")
    private Integer phiThu;

    @NotBlank(message = "Vui lòng nhập lý do thay đổi biểu phí")
    @Size(min = 5, max = 500, message = "Lý do thay đổi biểu phí phải từ 5 đến 500 ký tự")
    private String lyDo;

    @NotBlank(message = "Vui lòng nhập mật khẩu Quản trị viên để xác nhận")
    private String matKhauAdmin;
}
