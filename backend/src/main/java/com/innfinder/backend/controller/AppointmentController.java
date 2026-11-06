package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.security.SecurityUtils;
import com.innfinder.backend.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@Tag(name = "Appointment - Customer", description = "APIs đặt lịch và quản lý lịch hẹn dành cho Khách hàng")
public class AppointmentController {

    private final AppointmentService appointmentService;

    private String getCurrentUsername() {
        return SecurityUtils.getCurrentUsername();
    }

    @PostMapping
    @Operation(summary = "Khách đặt lịch xem phòng trọ (tính và tạm giữ cọc nếu có)")
    public ApiResponse<AppointmentResponse> taoDatLich(@Valid @RequestBody AppointmentCreateRequest request) {
        String username = getCurrentUsername();
        AppointmentResponse response = appointmentService.taoDatLich(username, request);
        return ApiResponse.ok(response, "Đặt lịch xem phòng thành công");
    }

    @GetMapping("/my-appointments")
    @Operation(summary = "Khách hàng xem danh sách các lịch hẹn của mình")
    public ApiResponse<List<AppointmentResponse>> layLichHenCuaToi() {
        String username = getCurrentUsername();
        List<AppointmentResponse> response = appointmentService.layLichHenCuaToi(username);
        return ApiResponse.ok(response, "Lấy danh sách lịch hẹn thành công");
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Hủy lịch hẹn xem phòng (kèm lý do hủy)")
    public ApiResponse<String> huyLichHen(
            @PathVariable("id") String maDatLich,
            @Valid @RequestBody AppointmentCancelRequest request) {
        String username = getCurrentUsername();
        appointmentService.huyLichHen(maDatLich, username, request);
        return ApiResponse.ok(null, "Hủy lịch hẹn thành công");
    }
}