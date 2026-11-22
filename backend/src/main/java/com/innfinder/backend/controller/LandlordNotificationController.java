package com.innfinder.backend.controller;

import com.innfinder.backend.dto.landlord.LandlordNotificationResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.LandlordNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/landlord/notifications")
@RequiredArgsConstructor
public class LandlordNotificationController {
    private final LandlordNotificationService service;
    @GetMapping
    public ApiResponse<List<LandlordNotificationResponse>> getNotifications() {
        return ApiResponse.ok(service.getCurrentNotifications(), "Lấy thông báo chủ trọ thành công");
    }
}
