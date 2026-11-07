/*
 * @ (#) LandlordRoomController.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:34 PM
 */
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.room.RoomCreateRequest;
import com.innfinder.backend.dto.room.RoomDetailResponse;
import com.innfinder.backend.dto.room.RoomStatusUpdateRequest;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.dto.room.RoomUpdateRequest;
import com.innfinder.backend.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
@RestController
@RequestMapping("/api/landlord/rooms")
@RequiredArgsConstructor
@Tag(name = "Chủ trọ - Quản lý phòng", description = "APIs dành riêng cho Chủ trọ quản lý các phòng trọ của mình")
public class LandlordRoomController {
    private final RoomService roomService;
    @Operation(summary = "Đăng tin phòng trọ mới (Multipart)", description = "Chủ trọ gửi form thông tin phòng và tải lên danh sách ảnh (tối thiểu 1 ảnh). Tự động upload lên Cloudinary.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<RoomDetailResponse> createRoom(
            @RequestPart("data") @Valid RoomCreateRequest request,
            @RequestPart("images") List<MultipartFile> images
    ) {
        RoomDetailResponse data = roomService.createRoom(request, images);
        return ApiResponse.ok(data, "Đăng tin phòng trọ mới thành công, đang chờ Admin kiểm duyệt");
    }

    @Operation(summary = "Đăng tin phòng trọ mới (JSON)", description = "Chủ trọ gửi form thông tin phòng dạng JSON kèm danh sách URL hình ảnh")
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<RoomDetailResponse> createRoomJson(
            @RequestBody @Valid RoomCreateRequest request
    ) {
        RoomDetailResponse data = roomService.createRoomFromJson(request);
        return ApiResponse.ok(data, "Đăng tin phòng trọ mới thành công, đang chờ Admin kiểm duyệt");
    }
    @Operation(summary = "Chỉnh sửa thông tin phòng trọ", description = "Chủ trọ cập nhật giá, diện tích, tiện ích, mô tả của phòng trọ do mình sở hữu.")
    @PutMapping("/{id}")
    public ApiResponse<RoomDetailResponse> updateRoom(
            @PathVariable("id") String id,
            @RequestBody @Valid RoomUpdateRequest request
    ) {
        RoomDetailResponse data = roomService.updateRoom(id, request);
        return ApiResponse.ok(data, "Cập nhật thông tin phòng trọ thành công");
    }
    @Operation(summary = "Cập nhật trạng thái phòng trọ", description = "Chủ trọ đổi trạng thái (ví dụ: HOAN_THANH khi phòng đã được thuê).")
    @PatchMapping("/{id}/status")
    public ApiResponse<String> updateRoomStatus(
            @PathVariable("id") String id,
            @RequestBody @Valid RoomStatusUpdateRequest request
    ) {
        roomService.updateRoomStatus(id, request.getTrangThai());
        return ApiResponse.ok(null, "Cập nhật trạng thái phòng trọ thành công");
    }
    @Operation(summary = "Lấy danh sách các phòng trọ của tôi", description = "Lấy toàn bộ các bài đăng phòng trọ thuộc quyền sở hữu của Chủ trọ đang đăng nhập.")
    @GetMapping("/my-rooms")
    public ApiResponse<List<RoomSummaryResponse>> getMyRooms() {
        List<RoomSummaryResponse> data = roomService.getMyRooms();
        return ApiResponse.ok(data, "Lấy danh sách phòng trọ của tôi thành công");
    }
}