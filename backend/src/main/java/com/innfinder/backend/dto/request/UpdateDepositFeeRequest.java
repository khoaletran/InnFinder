package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDepositFeeRequest {

    @NotNull(message = "Số tiền cọc không được để trống")
    @Min(value = 1000, message = "Số tiền cọc tối thiểu là 1.000 VNĐ")
    private Integer soTienCoc;

    @NotNull(message = "Mức phí thu sàn không được để trống")
    @Min(value = 0, message = "Mức phí thu sàn không được âm")
    private Integer phiThu;
}
