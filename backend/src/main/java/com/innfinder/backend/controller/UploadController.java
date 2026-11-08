/*
 * @ (#) UploadController.java    1.0     11/8/2026
 *
 * Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
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
@Tag(name = "Upload - Lưu trữ tệp tin", description = "APIs tải lên hình ảnh phục vụ đăng phòng, đánh giá, khiếu nại qua Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @Operation(summary = "Upload danh sách hình ảnh lên Cloudinary", description = "Tải lên một hoặc nhiều hình ảnh cùng lúc (tối đa 10MB/ảnh). Trả về danh sách URL HTTPS an toàn từ Cloudinary.")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadMultipleImages(@RequestParam("files") List<MultipartFile> files) {
        log.info("Nhận yêu cầu tải lên {} hình ảnh lên Cloudinary", files != null ? files.size() : 0);
        List<String> urls = cloudinaryService.uploadMultipleImages(files);
        return ApiResponse.ok(urls, "Tải hình ảnh lên Cloudinary thành công");
    }

    @Operation(summary = "Upload 1 hình ảnh đơn lẻ lên Cloudinary", description = "Tải lên 1 ảnh đơn (ảnh đại diện, ảnh bằng chứng khiếu nại...).")
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> uploadSingleImage(@RequestParam("file") MultipartFile file) {
        log.info("Nhận yêu cầu tải lên 1 ảnh đơn lên Cloudinary: {}", file != null ? file.getOriginalFilename() : "null");
        String url = cloudinaryService.uploadImage(file);
        return ApiResponse.ok(url, "Tải hình ảnh lên Cloudinary thành công");
    }
}
