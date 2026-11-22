package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.SearchLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {
    private final SearchLocationService locations;

    @GetMapping("/suggestions")
    public ApiResponse<List<SearchLocationService.Location>> suggest(@RequestParam String query) {
        return ApiResponse.ok(locations.suggest(query), "Gợi ý khu vực");
    }
}
