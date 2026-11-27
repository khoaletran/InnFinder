package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.roommate.RoommateDtos.*;
import com.innfinder.backend.service.RoommateService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@RestController
@RequestMapping("/api/roommates")
@RequiredArgsConstructor
public class RoommateController {
    private static final String DOCUMENT_ID = "[A-Za-z0-9_-]{6,64}";
    private static final String BOOKING_ID = "[A-Za-z0-9_-]{1,64}";
    private final RoommateService service;

    @ExceptionHandler({HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiResponse<Void>> invalidInput() {
        return ResponseEntity.badRequest().body(ApiResponse.error("Dữ liệu bài ở ghép không hợp lệ"));
    }

    @GetMapping
    public ApiResponse<Page<Post>> list(@RequestParam(required = false) @Size(max = 100) String area,
                                        @RequestParam(required = false) @Min(0) @Max(100000000) Long maxPrice,
                                        @RequestParam(required = false) @Pattern(regexp = "NAM|NU|KHONG_YEU_CAU") String gender,
                                        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
                                        @RequestParam(required = false) @Pattern(regexp = DOCUMENT_ID) String cursor) {
        return ApiResponse.ok(service.list(area, maxPrice, gender, limit, cursor), "Danh sách bài ở ghép");
    }

    @GetMapping("/{id}")
    public ApiResponse<Post> detail(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id) {
        return ApiResponse.ok(service.detail(id), "Chi tiết bài ở ghép");
    }

    @GetMapping("/mine")
    public ApiResponse<Page<Post>> mine(@RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
                                        @RequestParam(required = false) @Pattern(regexp = DOCUMENT_ID) String cursor) {
        return ApiResponse.ok(service.mine(limit, cursor), "Bài ở ghép của tôi");
    }

    @GetMapping("/my-applications")
    public ApiResponse<List<MyApplication>> myApplications() {
        return ApiResponse.ok(service.myApplications(), "Đơn đăng ký ở ghép của tôi");
    }

    @GetMapping("/{id}/my-application")
    public ApiResponse<Application> myApplicationForPost(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id) {
        return ApiResponse.ok(service.myApplicationForPost(id), "Trạng thái đơn đăng ký ở ghép");
    }

    @GetMapping("/{id}/comments")
    public ApiResponse<Page<Comment>> comments(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
                                               @RequestParam(required = false) @Pattern(regexp = DOCUMENT_ID) String cursor) {
        return ApiResponse.ok(service.comments(id, limit, cursor), "Hỏi đáp dưới bài");
    }

    @GetMapping("/booking/{bookingId}")
    public ApiResponse<Booking> booking(@PathVariable @Pattern(regexp = BOOKING_ID) String bookingId) {
        return ApiResponse.ok(service.booking(bookingId), "Thông tin đăng bài ở ghép");
    }

    @PostMapping("/booking/{bookingId}")
    public ApiResponse<String> create(@PathVariable @Pattern(regexp = BOOKING_ID) String bookingId,
                                      @Valid @RequestBody Input input) {
        return ApiResponse.ok(service.create(bookingId, input), "Đã đăng bài ở ghép");
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> edit(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                  @Valid @RequestBody Input input) {
        service.edit(id, input);
        return ApiResponse.ok(null, "Đã cập nhật bài ở ghép");
    }

    @PatchMapping("/{id}/close")
    public ApiResponse<Void> close(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id) {
        service.close(id);
        return ApiResponse.ok(null, "Đã đóng bài ở ghép");
    }

    @PostMapping("/{id}/comments")
    public ApiResponse<Void> comment(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                     @Valid @RequestBody CommentInput input) {
        service.comment(id, input);
        return ApiResponse.ok(null, "Đã gửi bình luận");
    }

    @PostMapping("/{id}/apply")
    public ApiResponse<Application> apply(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                          @Valid @RequestBody ApplyInput input) {
        return ApiResponse.ok(service.apply(id, input), "Đã gửi đơn đăng ký ở ghép");
    }

    @GetMapping("/{id}/applications")
    public ApiResponse<List<Application>> applications(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id) {
        return ApiResponse.ok(service.applications(id), "Danh sách đơn đăng ký ở ghép");
    }

    @PatchMapping("/{id}/applications/{appId}/approve")
    public ApiResponse<Application> approveApplication(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                                       @PathVariable @Pattern(regexp = DOCUMENT_ID) String appId) {
        return ApiResponse.ok(service.approveApplication(id, appId), "Đã duyệt người ở ghép");
    }

    @PatchMapping("/{id}/applications/{appId}/reject")
    public ApiResponse<Application> rejectApplication(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                                      @PathVariable @Pattern(regexp = DOCUMENT_ID) String appId,
                                                      @Valid @RequestBody(required = false) ApplicationDecisionInput input) {
        return ApiResponse.ok(service.rejectApplication(id, appId, input), "Đã từ chối đơn đăng ký");
    }

    @PatchMapping("/{id}/applications/{appId}/cancel")
    public ApiResponse<Void> cancelApplication(@PathVariable @Pattern(regexp = DOCUMENT_ID) String id,
                                               @PathVariable @Pattern(regexp = DOCUMENT_ID) String appId) {
        service.cancelApplication(id, appId);
        return ApiResponse.ok(null, "Đã hủy đơn đăng ký ở ghép");
    }
}
