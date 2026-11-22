package com.innfinder.backend.dto.appointment;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentCancelRequest {
    @NotBlank(message = "Lý do hủy hoặc từ chối lịch hẹn không được để trống")
    private String liDoHuy;

    // Thông tin tài khoản ngân hàng nhận hoàn cọc (nếu có)
    private String tenNganHang;
    private String soTaiKhoan;
    private String tenChuTaiKhoan;
}
