/*
 * @ (#) UploadController.java    1.0     11/8/2026
 *
 * Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "Upload - Lưu trữ tệp tin", description = "APIs tải lên hình ảnh phục vụ phòng trọ, avatar, cccd, đánh giá, khiếu nại qua Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @Operation(summary = "Upload danh sách hình ảnh lên Cloudinary", description = "Tải lên một hoặc nhiều hình ảnh cùng lúc (tối đa 10MB/ảnh) vào thư mục chỉ định (rooms, reviews, complaints...). Trả về danh sách URL HTTPS an toàn từ Cloudinary.")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadMultipleImages(
            @RequestParam("files") List<MultipartFile> files,
            @Parameter(description = "Thư mục đích: rooms, reviews, complaints, avatars, cccd, banks")
            @RequestParam(value = "folder", required = false, defaultValue = "rooms") String folder) {
        log.info("Nhận yêu cầu tải lên {} hình ảnh lên Cloudinary vào thư mục '{}'", files != null ? files.size() : 0, folder);
        List<String> urls = cloudinaryService.uploadMultipleImages(files, folder);
        return ApiResponse.ok(urls, "Tải hình ảnh lên Cloudinary thành công");
    }

    @Operation(summary = "Upload 1 hình ảnh đơn lẻ lên Cloudinary", description = "Tải lên 1 ảnh đơn (ảnh đại diện, ảnh CCCD, ảnh phòng, ảnh khiếu nại...) vào thư mục chỉ định.")
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> uploadSingleImage(
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Thư mục đích: avatars, cccd, rooms, reviews, complaints, banks")
            @RequestParam(value = "folder", required = false, defaultValue = "rooms") String folder) {
        log.info("Nhận yêu cầu tải lên 1 ảnh đơn lên Cloudinary vào thư mục '{}': {}", folder, file != null ? file.getOriginalFilename() : "null");
        String url = cloudinaryService.uploadImage(file, folder);
        return ApiResponse.ok(url, "Tải hình ảnh lên Cloudinary thành công");
    }
}
