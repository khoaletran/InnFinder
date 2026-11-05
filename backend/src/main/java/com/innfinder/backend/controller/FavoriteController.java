/*
 * @ (#) FavoriteController.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:46 PM
 */
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Tag(name = "Phòng yêu thích", description = "APIs quản lý danh sách phòng trọ quan tâm của người dùng")
public class FavoriteController {
    private final FavoriteService favoriteService;
    @Operation(summary = "Thêm phòng vào danh sách yêu thích", description = "Lưu phòng trọ vào danh sách quan tâm của người dùng đang đăng nhập.")
    @PostMapping("/{roomId}")
    public ApiResponse<String> addFavorite(@PathVariable("roomId") String roomId) {
        favoriteService.addFavorite(roomId);
        return ApiResponse.ok(null, "Thêm phòng trọ vào danh sách yêu thích thành công");
    }
    @Operation(summary = "Lấy danh sách phòng yêu thích của tôi", description = "Xem toàn bộ danh sách phòng trọ mà người dùng hiện tại đã lưu.")
    @GetMapping
    public ApiResponse<List<RoomSummaryResponse>> getMyFavorites() {
        List<RoomSummaryResponse> data = favoriteService.getMyFavorites();
        return ApiResponse.ok(data, "Lấy danh sách phòng trọ yêu thích thành công");
    }
    @Operation(summary = "Xóa phòng khỏi danh sách yêu thích", description = "Bỏ lưu phòng trọ ra khỏi danh sách yêu thích.")
    @DeleteMapping("/{roomId}")
    public ApiResponse<String> removeFavorite(@PathVariable("roomId") String roomId) {
        favoriteService.removeFavorite(roomId);
        return ApiResponse.ok(null, "Xóa phòng trọ khỏi danh sách yêu thích thành công");
    }
}