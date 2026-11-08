/*
 * @ (#) RoomController.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.room.RoomDetailResponse;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.service.AiSearchService;
import com.innfinder.backend.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Tag(name = "Phòng trọ", description = "APIs Công khai tìm kiếm và xem chi tiết phòng trọ")
public class RoomController {

    private final RoomService roomService;
    private final AiSearchService aiSearchService;

    @Operation(summary = "Tìm kiếm phòng trọ bằng AI (Vector Embedding)", description = "Tìm kiếm ngữ nghĩa bằng ngôn ngữ tự nhiên sử dụng vector embeddings")
    @GetMapping("/ai-search")
    public ApiResponse<List<RoomSummaryResponse>> searchByAi(@RequestParam("prompt") String prompt) {
        List<RoomSummaryResponse> data = aiSearchService.searchByNaturalLanguage(prompt);
        return ApiResponse.ok(data, "Tìm kiếm bằng AI thành công");
    }

    @Operation(summary = "Tìm kiếm & Lọc phòng trọ phân trang", description = "Lọc đa tiêu chí theo khoảng giá, diện tích, vị trí, tiện ích. Chỉ trả về phòng ĐÃ DUYỆT.")
    @GetMapping
    public ApiResponse<Page<RoomSummaryResponse>> searchRooms(@ParameterObject @ModelAttribute RoomFilterRequest filter) {
        Page<RoomSummaryResponse> data = roomService.searchRooms(filter);
        return ApiResponse.ok(data, "Lấy danh sách phòng trọ thành công");
    }

    @Operation(summary = "Xem chi tiết một phòng trọ", description = "Lấy đầy đủ hình ảnh thực tế, tiện ích, vị trí tọa độ bản đồ, thông tin chủ trọ và đánh giá.")
    @GetMapping("/{id}")
    public ApiResponse<RoomDetailResponse> getRoomDetail(@PathVariable("id") String id) {
        RoomDetailResponse data = roomService.getRoomDetail(id);
        return ApiResponse.ok(data, "Lấy thông tin chi tiết phòng trọ thành công");
    }
}
