package com.innfinder.backend.dto.chat;

import com.innfinder.backend.dto.room.RoomFilterRequest;
import jakarta.validation.constraints.*;
import java.util.List;

public record SearchCriteria(
        @Size(max = 150) String location,
        @Min(0) Long minPrice, @Min(0) Long maxPrice,
        @Min(0) Long minElectricityPrice, @Min(0) Long maxElectricityPrice,
        @Min(0) Long minWaterPrice, @Min(0) Long maxWaterPrice,
        Boolean waterByPerson,
        @Min(0) Integer minArea, @Min(0) Integer maxArea,
        @Min(1) @Max(100) Integer capacity,
        @Pattern(regexp = "^LPT\\d{3}$") String categoryId,
        @Size(max = 30) List<@NotBlank @Pattern(regexp = "^TI\\d{4}$") String> amenityIds,
        @Pattern(regexp = "RELEVANCE|PRICE_ASC|PRICE_DESC|ELECTRICITY_ASC|ELECTRICITY_DESC|WATER_ASC|WATER_DESC") String sort) {

    public SearchCriteria(
            String location,
            Long minPrice, Long maxPrice,
            Integer minArea, Integer maxArea,
            Integer capacity,
            String categoryId,
            List<String> amenityIds,
            String sort) {
        this(location, minPrice, maxPrice, null, null, null, null, null,
                minArea, maxArea, capacity, categoryId, amenityIds, sort);
    }

    public RoomFilterRequest toFilter() {
        RoomFilterRequest filter = new RoomFilterRequest();
        filter.setKeyword(location);
        filter.setMinGia(minPrice);
        filter.setMaxGia(maxPrice);
        filter.setMinGiaDien(minElectricityPrice);
        filter.setMaxGiaDien(maxElectricityPrice);
        filter.setMinGiaNuoc(minWaterPrice);
        filter.setMaxGiaNuoc(maxWaterPrice);
        filter.setNuocTheoNguoi(waterByPerson);
        filter.setMinDienTich(minArea);
        filter.setMaxDienTich(maxArea);
        filter.setSoNguoi(capacity);
        filter.setMaLpt(categoryId);
        filter.setDsTienIch(amenityIds);
        return filter;
    }
}
