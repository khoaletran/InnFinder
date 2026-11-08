package com.innfinder.backend.controller;

import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.request.RejectLandlordRequestDTO;
import com.innfinder.backend.dto.request.RejectRoomRequestDTO;
import com.innfinder.backend.dto.response.*;
import com.innfinder.backend.security.SecurityUtils;
import com.innfinder.backend.service.AdminService;
import com.innfinder.backend.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Controller", description = "Các API quản trị hệ thống: duyệt bài, quản lý người dùng, xử lý khiếu nại, thống kê và ngân khố")
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
    @Operation(summary = "Thống kê tổng quan số liệu hệ thống & Ngân khố trung tâm")
    public ResponseEntity<ApiResponse<AdminStatisticsResponseDTO>> getStatistics() {
        AdminStatisticsResponseDTO result = adminService.getStatistics();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy thống kê số liệu thành công"));
    }

    // ==========================================
    // QUẢN LÝ GIAO DỊCH & DUYỆT RÚT TIỀN (NGÂN KHỐ)
    // ==========================================

    @GetMapping("/transactions")
    @Operation(summary = "Lấy danh sách toàn bộ giao dịch trên hệ thống")
    public ResponseEntity<ApiResponse<List<AdminTransactionResponseDTO>>> getAllTransactions() {
        List<AdminTransactionResponseDTO> result = adminService.getAllTransactions();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách giao dịch thành công"));
    }

    @GetMapping("/transactions/{id}")
    @Operation(summary = "Xem chi tiết một giao dịch theo mã")
    public ResponseEntity<ApiResponse<AdminTransactionResponseDTO>> getTransactionById(@PathVariable String id) {
        AdminTransactionResponseDTO result = adminService.getTransactionById(id);
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy chi tiết giao dịch thành công"));
    }

    @PatchMapping("/transactions/{id}/approve")
    @Operation(summary = "Admin duyệt chuyển tiền cho yêu cầu rút tiền")
    public ResponseEntity<ApiResponse<AdminTransactionResponseDTO>> approveTransaction(@PathVariable String id) {
        String adminUsername = SecurityUtils.getCurrentUsername();
        AdminTransactionResponseDTO result = adminService.approveTransaction(id, adminUsername);
        return ResponseEntity.ok(ApiResponse.ok(result, "Duyệt yêu cầu rút tiền thành công"));
    }

    @PatchMapping("/transactions/{id}/reject")
    @Operation(summary = "Admin từ chối yêu cầu rút tiền (hoàn lại số dư ví cho Chủ trọ)")
    public ResponseEntity<ApiResponse<AdminTransactionResponseDTO>> rejectTransaction(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String adminUsername = SecurityUtils.getCurrentUsername();
        String lyDo = body != null ? body.get("lyDo") : null;
        AdminTransactionResponseDTO result = adminService.rejectTransaction(id, adminUsername, lyDo);
        return ResponseEntity.ok(ApiResponse.ok(result, "Từ chối yêu cầu rút tiền thành công"));
    }

    // ==========================================
    // QUẢN LÝ ĐƠN ĐĂNG KÝ LÀM CHỦ TRỌ
    // ==========================================

    @GetMapping("/landlord-requests")
    @Operation(summary = "Lấy danh sách các đơn đăng ký/nâng cấp lên Chủ trọ")
    public ResponseEntity<ApiResponse<List<LandlordRequestResponseDTO>>> getLandlordRequests() {
        List<LandlordRequestResponseDTO> result = adminService.getLandlordRequests();
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách đơn đăng ký chủ trọ thành công"));
    }

    @GetMapping("/landlord-requests/{id}")
    @Operation(summary = "Xem chi tiết một đơn đăng ký làm Chủ trọ")
    public ResponseEntity<ApiResponse<LandlordRequestResponseDTO>> getLandlordRequestById(@PathVariable String id) {
        LandlordRequestResponseDTO result = adminService.getLandlordRequestById(id);
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy thông tin chi tiết đơn đăng ký thành công"));
    }

    @PatchMapping("/landlord-requests/{id}/approve")
    @Operation(summary = "Phê duyệt đơn đăng ký làm Chủ trọ")
    public ResponseEntity<ApiResponse<LandlordRequestResponseDTO>> approveLandlordRequest(@PathVariable String id) {
        LandlordRequestResponseDTO result = adminService.approveLandlordRequest(id);
        return ResponseEntity.ok(ApiResponse.ok(result, "Duyệt đơn đăng ký chủ trọ thành công"));
    }

    @PatchMapping("/landlord-requests/{id}/reject")
    @Operation(summary = "Từ chối đơn đăng ký làm Chủ trọ kèm lý do")
    public ResponseEntity<ApiResponse<LandlordRequestResponseDTO>> rejectLandlordRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectLandlordRequestDTO request) {
        LandlordRequestResponseDTO result = adminService.rejectLandlordRequest(id, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Từ chối đơn đăng ký chủ trọ thành công"));
    }
}
