package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentDecisionRequest;
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
    @Operation(summary = "Khách đặt lịch xem phòng trọ (chờ chủ trọ xác nhận)")
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

    @PostMapping("/{id}/pay-deposit")
    @Operation(summary = "Khách hàng nộp tiền cọc giữ chân sau khi Chủ trọ đã xác nhận lịch hẹn")
    public ApiResponse<String> nopTienCoc(@PathVariable("id") String maDatLich) {
        String username = getCurrentUsername();
        appointmentService.nopTienCoc(maDatLich, username);
        return ApiResponse.ok(null, "Nộp tiền cọc giữ chân thành công");
    }

    @PatchMapping("/{id}/confirm-received-deposit")
    @Operation(summary = "Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực")
    public ApiResponse<AppointmentResponse> khachHangXacNhanDaNhanCoc(@PathVariable("id") String maDatLich) {
        String username = getCurrentUsername();
        AppointmentResponse res = appointmentService.khachHangXacNhanDaNhanCoc(maDatLich, username);
        return ApiResponse.ok(res, "Xác nhận đã nhận lại cọc thành công");
    }

    @PatchMapping("/{id}/decision")
    @Operation(summary = "Khách hàng đưa ra quyết định độc lập (Thuê / Không thuê)")
    public ApiResponse<AppointmentResponse> khachHangDuaRaQuyetDinh(
            @PathVariable("id") String maDatLich,
            @Valid @RequestBody AppointmentDecisionRequest request) {
        String username = getCurrentUsername();
        AppointmentResponse res = appointmentService.khachHangDuaRaQuyetDinh(maDatLich, username, request);
        return ApiResponse.ok(res, "Gửi quyết định thuê phòng thành công");
    }

    @PatchMapping("/{id}/confirm-rental")
    @Operation(summary = "Khách hàng xác nhận đồng ý thuê phòng sau khi xem thực tế (Legacy)")
    public ApiResponse<String> khachHangXacNhanThue(@PathVariable("id") String maDatLich) {
        String username = getCurrentUsername();
        appointmentService.khachHangXacNhanThue(maDatLich, username);
        return ApiResponse.ok(null, "Xác nhận thuê phòng thành công");
    }
}
