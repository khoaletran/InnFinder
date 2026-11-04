package com.innfinder.backend.dto.appointment;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentCreateRequest {
    @NotBlank(message = "Mã phòng trọ không được để trống")
    private String maPhongTro;
    @NotNull(message = "Thời gian hẹn không được để trống")
    @Future(message = "Thời gian hẹn xem phòng phải sau thời điểm hiện tại")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayHen;

    private String ghiChu;
}
