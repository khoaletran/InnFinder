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
import com.innfinder.backend.service.SearchLocationService;
import com.innfinder.backend.service.CategoryService;
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
    private final SearchLocationService locations;
    private final CategoryService categories;

    public record SearchDetails(Page<RoomSummaryResponse> results, RoomFilterRequest criteria, RoomFilterRequest inferred, boolean fallback) {}

    @GetMapping("/ai-search/details")
    public ApiResponse<SearchDetails> searchDetails(@RequestParam String prompt,
            @ModelAttribute RoomFilterRequest filter) {
        boolean mappedArea = filter.getSouth() != null || filter.getRadiusKm() != null;
        var inferred = new RoomFilterRequest();
        locations.recognize(prompt).ifPresent(inferred::setLocation);
        if (!mappedArea && filter.getLocation() == null) filter.setLocation(inferred.getLocation());

        var price = java.util.regex.Pattern.compile(
                "(?iu)(dưới|tối đa|trên|tối thiểu)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|k)\\b")
                .matcher(prompt);
        boolean priceRecognized = false;
        if (price.find()) {
            double amount = Double.parseDouble(price.group(2).replace(',', '.'));
            long value = Math.round(amount * ("k".equalsIgnoreCase(price.group(3)) ? 1000 : 1000000));
            String direction = price.group(1).toLowerCase(java.util.Locale.ROOT);
            boolean lowerBound = direction.equals("trên") || direction.equals("tối thiểu");
            if (lowerBound) inferred.setMinGia(value);
            else inferred.setMaxGia(value);
            if (lowerBound && filter.getMinGia() == null) filter.setMinGia(value);
            if (!lowerBound && filter.getMaxGia() == null) filter.setMaxGia(value);
            priceRecognized = true;
        }

        String normalized = SearchLocationService.normalize(prompt);
        boolean categoryRecognized = false;
        for (var category : categories.getAllRoomTypes()) {
            if (!containsPhrase(normalized, category.getTenLoaiPhongTro())) continue;
            inferred.setMaLpt(category.getMaLpt());
            if (filter.getMaLpt() == null) filter.setMaLpt(category.getMaLpt());
            categoryRecognized = true;
            break;
        }
        var inferredAmenities = categories.getAllAmenities().stream()
                .filter(amenity -> containsPhrase(normalized, amenity.getTenTienIch()))
                .map(amenity -> amenity.getMaTienIch()).toList();
        inferred.setDsTienIch(inferredAmenities);
        if (filter.getDsTienIch() == null || filter.getDsTienIch().isEmpty()) {
            filter.setDsTienIch(inferredAmenities);
        }

        boolean needsSemanticSearch = filter.getLocation() == null && !mappedArea && !priceRecognized
                && !categoryRecognized && inferredAmenities.isEmpty() && !prompt.isBlank();
        List<String> rankedIds = needsSemanticSearch ? aiSearchService.rankedRoomIds(prompt) : List.of();
        boolean fallback = needsSemanticSearch && rankedIds.isEmpty();
        if (rankedIds.isEmpty() && "relevance".equals(filter.getSortBy())) {
            filter.setSortBy("thoiGianDang");
        }
        filter.setKeyword(fallback ? prompt.strip() : null);
        var results = roomService.searchRooms(filter, rankedIds);
        return ApiResponse.ok(new SearchDetails(results, filter, inferred, fallback), "Kết quả tìm kiếm");
    }

    private boolean containsPhrase(String normalized, String phrase) {
        return (" " + normalized + " ").contains(" " + SearchLocationService.normalize(phrase) + " ");
    }

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
