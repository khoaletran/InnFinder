package com.innfinder.backend.dto.appointment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepositStatusResponse {
    private String maDatLich;
    private boolean daNopCoc;
    private Long soTienCoc;
    private String trangThaiLich;
    private LocalDateTime hanDuyet;
    private boolean conHieuLuc;
}
