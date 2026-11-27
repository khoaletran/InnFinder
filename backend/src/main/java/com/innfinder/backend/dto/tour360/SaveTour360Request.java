package com.innfinder.backend.dto.tour360;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SaveTour360Request(
        String maPhongTro,
        String startNodeId,
        @NotEmpty(message = "Tour 360° cần ít nhất 1 điểm góc nhìn")
        @Size(max = 10, message = "Mỗi phòng tối đa 10 điểm 360°")
        @Valid
        List<Tour360NodeDto> nodes
) {
}
