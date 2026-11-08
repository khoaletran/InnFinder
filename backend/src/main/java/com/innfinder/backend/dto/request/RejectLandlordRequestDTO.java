package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectLandlordRequestDTO {

    @NotBlank(message = "Lý do từ chối không được để trống")
    private String lyDo;
}
