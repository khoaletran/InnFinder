package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.enums.TrangThaiGD;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminTransactionPageResponseDTO {
    private List<AdminTransactionResponseDTO> content;
    private long totalElements;
    private int totalPages;
    private int size;
    private int number;
    private Map<TrangThaiGD, Long> statusCounts;
}
