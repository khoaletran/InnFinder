package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRoomPageResponseDTO {
    private List<RoomResponseDTO> content;
    private long totalElements;
    private int totalPages;
    private int size;
    private int number;
    private Map<TrangThaiPhongTro, Long> statusCounts;
}
