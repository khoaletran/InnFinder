package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReputationAdjustRequest {

    @Min(value = 0, message = "Điểm uy tín tối thiểu là 0")
    @Max(value = 100, message = "Điểm uy tín tối đa là 100")
    private Integer diemMoi;

    private Integer bienDong;

    @NotBlank(message = "Vui lòng nhập lý do điều chỉnh điểm uy tín")
    private String lyDo;

    private Boolean goTamAn;
}
