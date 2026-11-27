package com.innfinder.backend.controller;

import com.innfinder.backend.dto.landlord.LandlordAnalyticsResponseDTO;
import com.innfinder.backend.dto.landlord.LandlordReputationSummaryDTO;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.security.SecurityUtils;
import com.innfinder.backend.service.LandlordAnalyticsService;
import com.innfinder.backend.service.ReputationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/landlord")
@RequiredArgsConstructor
@Tag(name = "Chủ trọ - Thống kê & Tối ưu", description = "Thống kê dòng tiền ví, phễu hiệu quả từng phòng và đề xuất tối ưu cho Chủ trọ")
public class LandlordAnalyticsController {

    private final LandlordAnalyticsService landlordAnalyticsService;
    private final ReputationService reputationService;

    @Operation(summary = "Thống kê hiệu suất kinh doanh, phễu từng phòng và đề xuất tối ưu cho Chủ trọ")
    @GetMapping("/analytics")
    public ApiResponse<LandlordAnalyticsResponseDTO> getMyAnalytics(
            @RequestParam(defaultValue = "6") @Min(1) @Max(24) int months) {
        return ApiResponse.ok(
                landlordAnalyticsService.getAnalyticsForCurrentLandlord(months),
                "Lấy thống kê hiệu suất và đề xuất cho chủ trọ thành công"
        );
    }

    @Operation(summary = "Xem tổng quan uy tín, trạng thái tạm ẩn và lịch sử biến động điểm uy tín của Chủ trọ")
    @GetMapping("/reputation/history")
    public ApiResponse<LandlordReputationSummaryDTO> getMyReputationHistory() {
        String username = SecurityUtils.getCurrentUsername();
        return ApiResponse.ok(
                reputationService.getLandlordReputationSummary(username),
                "Lấy lịch sử điểm uy tín chủ trọ thành công"
        );
    }
}
