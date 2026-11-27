package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.tour360.PanoramaUploadResponse;
import com.innfinder.backend.dto.tour360.SaveTour360Request;
import com.innfinder.backend.dto.tour360.Tour360Response;
import com.innfinder.backend.service.Tour360Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Tour 360° đa điểm", description = "Upload ảnh 360°/Panorama lên Cloudinary và quản lý tour tham quan nhiều góc nhìn cho phòng trọ")
public class Tour360Controller {

    private final Tour360Service tour360Service;

    @Operation(summary = "Chủ trọ upload 1 ảnh 360° hoặc Panorama lên Cloudinary (tối đa 15MB)")
    @PostMapping(value = "/api/landlord/tours-360/upload-panorama", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PanoramaUploadResponse> uploadPanorama(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(tour360Service.uploadPanorama(file), "Tải ảnh 360° lên thành công");
    }

    @Operation(summary = "Tạo mới Tour 360° đa điểm (1–10 điểm góc nhìn)")
    @PostMapping("/api/landlord/tours-360")
    public ApiResponse<Tour360Response> createTour(@Valid @RequestBody SaveTour360Request request) {
        return ApiResponse.ok(tour360Service.createTour(request), "Tạo Tour 360° thành công");
    }

    @Operation(summary = "Cập nhật danh sách điểm góc nhìn, mũi tên chuyển cảnh và chú thích của Tour 360°")
    @PutMapping("/api/landlord/tours-360/{maTour}")
    public ApiResponse<Tour360Response> updateTour(
            @PathVariable String maTour,
            @Valid @RequestBody SaveTour360Request request
    ) {
        return ApiResponse.ok(tour360Service.updateTour(maTour, request), "Cập nhật Tour 360° thành công");
    }

    @Operation(summary = "Gắn Tour 360° vào phòng trọ")
    @PostMapping("/api/landlord/rooms/{maPhongTro}/tour-360/{maTour}")
    public ApiResponse<Tour360Response> attachTourToRoom(
            @PathVariable String maPhongTro,
            @PathVariable String maTour
    ) {
        return ApiResponse.ok(tour360Service.attachTourToRoom(maPhongTro, maTour), "Đã gắn Tour 360° vào phòng trọ");
    }

    @Operation(summary = "Xóa Tour 360° của chủ trọ")
    @DeleteMapping("/api/landlord/tours-360/{maTour}")
    public ApiResponse<Void> deleteTour(@PathVariable String maTour) {
        tour360Service.deleteTour(maTour);
        return ApiResponse.ok(null, "Đã xóa Tour 360°");
    }

    @Operation(summary = "Danh sách Tour 360° của chủ trọ đang đăng nhập")
    @GetMapping("/api/landlord/tours-360/my-tours")
    public ApiResponse<List<Tour360Response>> getMyTours() {
        return ApiResponse.ok(tour360Service.getMyTours(), "Lấy danh sách Tour 360° thành công");
    }

    @Operation(summary = "Lấy cấu hình Tour 360° theo mã tour (công khai cho trình xem Web/WebView)")
    @GetMapping("/api/tours-360/{maTour}")
    public ApiResponse<Tour360Response> getTourById(@PathVariable String maTour) {
        return ApiResponse.ok(tour360Service.getTourById(maTour), "Lấy Tour 360° thành công");
    }

    @Operation(summary = "Lấy Tour 360° mới nhất của phòng trọ (công khai)")
    @GetMapping("/api/rooms/{maPhongTro}/tour-360")
    public ApiResponse<Tour360Response> getRoomTour(@PathVariable String maPhongTro) {
        return ApiResponse.ok(tour360Service.getRoomTour(maPhongTro), "Lấy Tour 360° phòng trọ thành công");
    }
}
