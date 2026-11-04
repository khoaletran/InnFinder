package com.innfinder.backend.controller;

import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.request.RejectRoomRequestDTO;
import com.innfinder.backend.dto.response.*;
import com.innfinder.backend.service.AdminService;
import com.innfinder.backend.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Controller", description = "Các API quản trị hệ thống: duyệt bài, quản lý người dùng, xử lý khiếu nại và thống kê")
public class AdminController {

    private final AdminService adminService;
    private final ComplaintService complaintService;

    @GetMapping("/rooms/pending")
    @Operation(summary = "Lấy danh sách các bài đăng phòng trọ đang chờ kiểm duyệt")
    public ResponseEntity<ApiResponse<List<RoomResponseDTO>>> getPendingRooms() {
        List<RoomResponseDTO> result = adminService.getPendingRooms();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách phòng chờ duyệt thành công"));
    }

    @PatchMapping("/rooms/{id}/approve")
    @Operation(summary = "Phê duyệt bài đăng phòng trọ")
    public ResponseEntity<ApiResponse<RoomResponseDTO>> approveRoom(@PathVariable String id) {
        RoomResponseDTO result = adminService.approveRoom(id);
        return ResponseEntity.ok(ApiResponse.ok(result, "Phê duyệt bài đăng phòng trọ thành công"));
    }

    @PatchMapping("/rooms/{id}/reject")
    @Operation(summary = "Từ chối bài đăng phòng trọ kèm lý do")
    public ResponseEntity<ApiResponse<RoomResponseDTO>> rejectRoom(@PathVariable String id, @RequestBody(required = false) RejectRoomRequestDTO request) {
        RoomResponseDTO result = adminService.rejectRoom(id, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Từ chối duyệt bài đăng phòng trọ thành công"));
    }

    @GetMapping("/users")
    @Operation(summary = "Lấy danh sách tất cả tài khoản người dùng")
    public ResponseEntity<ApiResponse<List<UserResponseDTO>>> getAllUsers() {
        List<UserResponseDTO> result = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách người dùng thành công"));
    }

    @PatchMapping("/users/{id}/toggle-lock")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản người dùng")
    public ResponseEntity<ApiResponse<UserResponseDTO>> toggleLockUser(@PathVariable String id) {
        UserResponseDTO result = adminService.toggleLockUser(id);
        String msg = Boolean.TRUE.equals(result.getTrangThaiKhoa())
                ? "Khóa tài khoản người dùng thành công"
                : "Mở khóa tài khoản người dùng thành công";
        return ResponseEntity.ok(ApiResponse.ok(result, msg));
    }

    @GetMapping("/complaints")
    @Operation(summary = "Admin xem danh sách toàn bộ khiếu nại trong hệ thống")
    public ResponseEntity<ApiResponse<List<ComplaintResponseDTO>>> getAllComplaints() {
        List<ComplaintResponseDTO> result = complaintService.getAllComplaints();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách khiếu nại thành công"));
    }

    @PatchMapping("/complaints/{id}/resolve")
    @Operation(summary = "Admin cập nhật tiến trình hoặc giải quyết khiếu nại")
    public ResponseEntity<ApiResponse<ComplaintResponseDTO>> resolveComplaint(
            @PathVariable String id,
            @Valid @RequestBody ComplaintResolveDTO request) {
        ComplaintResponseDTO result = complaintService.resolveComplaint(id, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Cập nhật xử lý khiếu nại thành công"));
    }

    @GetMapping("/statistics")
    @Operation(summary = "Thống kê tổng quan số liệu hệ thống")
    public ResponseEntity<ApiResponse<AdminStatisticsResponseDTO>> getStatistics() {
        AdminStatisticsResponseDTO result = adminService.getStatistics();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy thống kê số liệu thành công"));
    }
}
