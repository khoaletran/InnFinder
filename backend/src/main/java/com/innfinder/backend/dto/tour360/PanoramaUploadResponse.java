package com.innfinder.backend.dto.tour360;

public record PanoramaUploadResponse(
        String url,
        int width,
        int height,
        boolean isPartialPano
) {
}
