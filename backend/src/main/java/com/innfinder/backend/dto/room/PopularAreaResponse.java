package com.innfinder.backend.dto.room;

public record PopularAreaResponse(String name, String keyword, long roomCount, Long minPrice, String imageUrl) {}
