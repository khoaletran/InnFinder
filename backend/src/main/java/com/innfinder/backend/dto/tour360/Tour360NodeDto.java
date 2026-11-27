package com.innfinder.backend.dto.tour360;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record Tour360NodeDto(
        @NotBlank String id,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 500) String imageUrl,
        Integer width,
        Integer height,
        Boolean isPartialPano,
        Double defaultYaw,
        Double defaultPitch,
        @Valid List<Tour360LinkDto> links,
        @Valid List<Tour360MarkerDto> markers
) {
    public record Tour360LinkDto(
            @NotBlank String targetNodeId,
            double yaw,
            double pitch,
            @Size(max = 100) String label
    ) {
    }

    public record Tour360MarkerDto(
            @NotBlank String id,
            @NotBlank @Size(max = 120) String label,
            double yaw,
            double pitch
    ) {
    }
}
