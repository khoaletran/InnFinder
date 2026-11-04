/*
 * @ (#) CategoryController.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.controller;


import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.room.AmenityResponse;
import com.innfinder.backend.dto.room.CategoryResponse;
import com.innfinder.backend.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 7:32 PM
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Danh mục", description = "APIs lấy danh mục loại phòng trọ và tiện ích phòng")
public class CategoryController {
    private final CategoryService categoryService;

    @Operation(summary = "Lấy danh sách các loại phòng trọ", description = "Public API phục vụ dropdown lọc hoặc đăng tin phòng")
    @GetMapping("/room-types")
    public ApiResponse<List<CategoryResponse>> getRoomTypes(){
        return ApiResponse.ok(categoryService.getAllRoomTypes(), "Lấy danh mục loại phòng trọ thành công" );
    }

    @Operation(summary = "Lấy danh sách các tiện ích phòng trọ", description = "Public API phục vụ chọn tiện ích: Wifi, điều hòa, gác lửng...")
    @GetMapping("/amenities")
    public ApiResponse<List<AmenityResponse>> getAmenities(){
        return ApiResponse.ok(categoryService.getAllAmenities(), "Lấy danh mục tiện ích phòng trọ thành công");
    }

}
