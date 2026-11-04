package com.innfinder.backend.controller;

import com.innfinder.backend.dto.request.ReviewRequestDTO;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.response.ReviewResponseDTO;
import com.innfinder.backend.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Tag(name = "Review Controller", description = "API đánh giá và xem đánh giá của phòng trọ")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/{roomId}/reviews")
    @Operation(summary = "Khách hàng gửi đánh giá và nhận xét cho phòng trọ")
    public ResponseEntity<ApiResponse<ReviewResponseDTO>> createReview(
            @PathVariable String roomId,
            @Valid @RequestBody ReviewRequestDTO request) {
        ReviewResponseDTO result = reviewService.createReview(roomId, request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(result, "Gửi đánh giá phòng trọ thành công"));
    }

    @GetMapping("/{roomId}/reviews")
    @Operation(summary = "Lấy danh sách đánh giá của một phòng trọ")
    public ResponseEntity<ApiResponse<List<ReviewResponseDTO>>> getReviewsByRoom(@PathVariable String roomId) {
        List<ReviewResponseDTO> result = reviewService.getReviewsByRoom(roomId);
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh sách đánh giá phòng trọ thành công"));
    }
}
