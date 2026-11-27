package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.AiTrackingSummaryResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.service.AiTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/ai-tracking")
@RequiredArgsConstructor
@Tag(name = "Admin - AI Tracking", description = "Giám sát lưu lượng, token, chi phí, độ trễ và sức khỏe AI")
public class AiTrackingController {

    private final AiTrackingService trackingService;

    @Operation(summary = "Tổng quan AI Tracking theo số ngày gần nhất")
    @GetMapping("/summary")
    public ApiResponse<AiTrackingSummaryResponse> getSummary(
            @RequestParam(value = "days", defaultValue = "7") int days) {
        return ApiResponse.ok(trackingService.getSummary(days), "Lấy thống kê giám sát AI thành công");
    }

    @Operation(summary = "Lịch sử chi tiết các lượt gọi AI / Recommendation")
    @GetMapping("/logs")
    public ApiResponse<Page<AiUsageLog>> getLogs(
            @RequestParam(value = "feature", required = false) String feature,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "days", defaultValue = "7") int days,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size) {
        return ApiResponse.ok(
                trackingService.getLogs(feature, status, model, days, page, size),
                "Lấy nhật ký sử dụng AI thành công"
        );
    }
}
