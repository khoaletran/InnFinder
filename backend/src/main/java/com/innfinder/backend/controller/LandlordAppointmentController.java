package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
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
@RequestMapping("/api/landlord/appointments")
@RequiredArgsConstructor
@Tag(name = "Appointment - Landlord", description = "APIs quản lý lịch hẹn dành riêng cho Chủ trọ")
public class LandlordAppointmentController {

    private final AppointmentService appointmentService;

    private String getCurrentUsername() {
        return SecurityUtils.getCurrentUsername();
    }

    @GetMapping
    @Operation(summary = "Chủ trọ xem danh sách khách hẹn xem các phòng của mình")
    public ApiResponse<List<AppointmentResponse>> layLichHenChoChuTro() {
        String username = getCurrentUsername();
        List<AppointmentResponse> response = appointmentService.layLichHenChoChuTro(username);
        return ApiResponse.ok(response, "Lấy danh sách lịch hẹn của chủ trọ thành công");
    }

    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Chủ trọ xác nhận đồng ý lịch hẹn")
    public ApiResponse<String> xacNhanLichHen(@PathVariable("id") String maDatLich) {
        String username = getCurrentUsername();
        appointmentService.xacNhanLichHen(maDatLich, username);
        return ApiResponse.ok(null, "Xác nhận lịch hẹn thành công");
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Chủ trọ từ chối lịch hẹn (kèm lý do và hoàn cọc cho khách)")
    public ApiResponse<String> tuChoiLichHen(
            @PathVariable("id") String maDatLich,
            @Valid @RequestBody AppointmentCancelRequest request) {
        String username = getCurrentUsername();
        appointmentService.tuChoiLichHen(maDatLich, username, request);
        return ApiResponse.ok(null, "Từ chối lịch hẹn thành công");
    }

    @PatchMapping("/{id}/complete")
    @Operation(summary = "Chủ trọ xác nhận khách đã đến xem xong (hoàn cọc cho khách)")
    public ApiResponse<String> hoanThanhLichHen(@PathVariable("id") String maDatLich) {
        String username = getCurrentUsername();
        appointmentService.hoanThanhLichHen(maDatLich, username);
        return ApiResponse.ok(null, "Xác nhận hoàn tất xem phòng thành công");
    }
}