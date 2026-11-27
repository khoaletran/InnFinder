package com.innfinder.backend.dto.tour360;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.entity.PhongTroTour360;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record Tour360Response(
        String maTour,
        String maPhongTro,
        String maChuTro,
        String startNodeId,
        int nodeCount,
        List<Tour360NodeDto> nodes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static Tour360Response fromEntity(PhongTroTour360 entity, ObjectMapper objectMapper) {
        List<Tour360NodeDto> parsedNodes = Collections.emptyList();
        if (entity.getTourConfigJson() != null && !entity.getTourConfigJson().isBlank()) {
            try {
                parsedNodes = objectMapper.readValue(
                        entity.getTourConfigJson(),
                        new TypeReference<>() {
                        }
                );
            } catch (Exception ignored) {
                parsedNodes = Collections.emptyList();
            }
        }
        return new Tour360Response(
                entity.getMaTour(),
                entity.getPhongTro() != null ? entity.getPhongTro().getMaPhongTro() : null,
                entity.getChuTro() != null ? entity.getChuTro().getMaChuTro() : null,
                entity.getStartNodeId(),
                entity.getNodeCount() != null ? entity.getNodeCount() : parsedNodes.size(),
                parsedNodes,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
