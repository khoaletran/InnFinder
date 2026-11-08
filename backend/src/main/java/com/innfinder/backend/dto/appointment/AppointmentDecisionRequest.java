package com.innfinder.backend.dto.appointment;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentDecisionRequest {

    @NotNull(message = "Quyết định đồng ý hay từ chối không được để trống")
    private Boolean dongY;

    private String liDoTuChoi;
}
