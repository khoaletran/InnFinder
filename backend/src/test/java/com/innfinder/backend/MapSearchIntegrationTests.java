package com.innfinder.backend;

import com.innfinder.backend.controller.RoomController;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.service.RoomService;
import com.innfinder.backend.service.SearchLocationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "INNFINDER_DB_MODE", matches = "LOCAL")
class MapSearchIntegrationTests {
    @Autowired RoomService rooms;
    @Autowired RoomController endpoint;
    @Autowired SearchLocationService locations;
    @Autowired JdbcTemplate jdbc;

    @Test
    void radiusFiltersApprovedRoomsBeforePaginationAndRequiresEveryAmenity() {
        jdbc.update("UPDATE phong_tro SET trang_thai = 'CHO_DUYET' WHERE ma_phong_tro = 'PT0111260006'");
        jdbc.update("UPDATE phong_tro SET trang_thai = 'HUY' WHERE ma_phong_tro = 'PT0111260010'");
        var filter = new RoomFilterRequest();
        filter.setCenterLat(21.0333);
        filter.setCenterLng(105.7984);
        filter.setRadiusKm(5.0);
        filter.setMaxGia(2_000_000L);
        filter.setMaLpt("LPT001");
        filter.setDsTienIch(List.of("TI0001", "TI0003"));
        filter.setSize(1);

        var page = rooms.searchRooms(filter);
        assertEquals(1, page.getTotalElements());
        assertEquals("PT0111260001", page.getContent().getFirst().getMaPhongTro());
        filter.setDsTienIch(List.of("TI0001", "TI0006"));
        assertEquals(0, rooms.searchRooms(filter).getTotalElements());
    }

    @Test
    void boundingBoxOverridesLocationButDistanceOnlyDoesNot() {
        var filter = new RoomFilterRequest();
        filter.setCenterLat(21.0185);
        filter.setCenterLng(105.834);
        filter.setSortBy("distance");
        filter.setSize(1);
        var nearby = endpoint.searchDetails("Cầu Giấy", filter).getData();
        assertEquals("Cầu Giấy", nearby.criteria().getLocation());
        assertEquals(4, nearby.results().getTotalElements());
        assertEquals(4, nearby.results().getTotalPages());
        assertEquals("PT0111260001", nearby.results().getContent().getFirst().getMaPhongTro());

        filter.setSouth(21.007);
        filter.setWest(105.82);
        filter.setNorth(21.02);
        filter.setEast(105.84);
        filter.setMaxGia(4_000_000L);
        filter.setMaLpt("LPT002");
        filter.setDsTienIch(List.of("TI0001", "TI0002"));
        filter.setPage(1);
        var viewport = endpoint.searchDetails("Cầu Giấy", filter).getData();
        assertNull(viewport.criteria().getLocation());
        assertEquals(2, viewport.results().getTotalElements());
        assertEquals(2, viewport.results().getTotalPages());
        assertEquals("PT0111260009", viewport.results().getContent().getFirst().getMaPhongTro());
    }

    @Test
    void suggestionsUseDatabaseCoordinates() {
        var location = locations.suggest("cau giay").stream()
                .filter(item -> item.name().equals("Cầu Giấy")).findFirst().orElseThrow();
        assertEquals(105.7689, location.bounds().west());
        assertEquals(105.7984, location.bounds().east());
    }
}
