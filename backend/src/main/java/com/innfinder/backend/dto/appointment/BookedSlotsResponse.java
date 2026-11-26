package com.innfinder.backend.dto.appointment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Danh sách các khung giờ đang được giữ chỗ hợp lệ của một phòng trọ trong ngày
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookedSlotsResponse {
    private String maPhongTro;
    private String date;
    private int bufferMinutes;
    private List<String> bookedTimes;
    private List<LocalDateTime> bookedDateTimes;
}
