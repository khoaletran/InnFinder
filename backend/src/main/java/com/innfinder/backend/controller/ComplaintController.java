package com.innfinder.backend.controller;

import com.innfinder.backend.dto.request.ComplaintRequestDTO;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.response.ComplaintResponseDTO;
import com.innfinder.backend.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
@Tag(name = "Complaint Controller", description = "API tiếp nhận khiếu nại từ người dùng")
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    @Operation(summary = "Người dùng gửi phiếu khiếu nại (kèm hình ảnh minh chứng)")
    public ResponseEntity<ApiResponse<ComplaintResponseDTO>> createComplaint(@Valid @RequestBody ComplaintRequestDTO request) {
        ComplaintResponseDTO result = complaintService.createComplaint(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(result, "Gửi khiếu nại thành công, vui lòng chờ Quản trị viên xử lý"));
    }
}
