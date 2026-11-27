package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.service.RoomRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Tag(name = "Phòng trọ - Gợi ý", description = "APIs gợi ý phòng trọ cá nhân hóa và phòng tương tự (Hybrid Vector)")
public class RoomRecommendationController {

    private final RoomRecommendationService recommendationService;
    private final com.innfinder.backend.service.RecommendationInteractionService interactions;

    @Operation(summary = "Gợi ý phòng dành riêng cho bạn (dựa trên yêu thích, lịch hẹn, lịch sử xem & Vector)")
    @GetMapping("/recommendations")
    public ApiResponse<List<RoomSummaryResponse>> getPersonalized(
            @RequestParam(value = "recentIds", required = false) List<String> recentIds,
            @RequestParam(value = "limit", defaultValue = "8") @Min(1) @Max(24) int limit) {
        return ApiResponse.ok(
                recommendationService.getPersonalizedRecommendations(recentIds, limit),
                "Lấy danh sách phòng gợi ý thành công"
        );
    }

    @Operation(summary = "Gợi ý các phòng tương tự phòng đang xem")
    @GetMapping("/{id}/recommendations")
    public ApiResponse<List<RoomSummaryResponse>> getSimilar(
            @PathVariable("id") String id,
            @RequestParam(value = "limit", defaultValue = "6") @Min(1) @Max(20) int limit) {
        return ApiResponse.ok(
                recommendationService.getSimilarRooms(id, limit),
                "Lấy danh sách phòng tương tự thành công"
        );
    }

    @Operation(summary = "Ghi nhận lượt click vào phòng gợi ý phục vụ AI Tracking CTR")
    @GetMapping("/recommendations/click")
    public ApiResponse<Void> trackClick(
            @RequestParam("roomId") String roomId,
            @RequestParam(value = "source", defaultValue = "home") String source) {
        // Legacy GET is intentionally read-only. New clients use impression-bound POST events.
        return ApiResponse.ok(null, "Đã ghi nhận tương tác gợi ý");
    }
    public record ImpressionRequest(List<String> roomIds, String source) {}
    public record ClickRequest(String impressionId, String roomId) {}
    @PostMapping("/recommendations/impressions")
    public ApiResponse<String> impression(@RequestBody ImpressionRequest request, jakarta.servlet.http.HttpServletRequest http) {
        return ApiResponse.ok(interactions.impression(request.roomIds(), request.source(), http.getRemoteAddr()), "Đã ghi nhận hiển thị");
    }
    @PostMapping("/recommendations/click")
    public ApiResponse<Void> click(@RequestBody ClickRequest request) {
        interactions.click(request.impressionId(), request.roomId());
        return ApiResponse.ok(null, "Đã ghi nhận tương tác");
    }
}
