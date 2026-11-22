package com.innfinder.backend.service;

import com.innfinder.backend.entity.*;
import com.innfinder.backend.repository.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PopularAreaTests {
    private final PhongTroRepository rooms = mock(PhongTroRepository.class);
    private final RoomService service = new RoomService(rooms, mock(LoaiPhongTroRepository.class),
            mock(TienIchRepository.class), mock(ChuTroRepository.class), mock(CloudinaryService.class));

    private PhongTro room(String address, Long price, List<HinhAnh> images) {
        return PhongTro.builder().diaChi(address).giaThue(price).hinhAnh(images).build();
    }

    @Test void countsAllRoomsAndUsesMinimumPriceAndRealCover() {
        var data = new ArrayList<PhongTro>();
        for (int i = 0; i < 25; i++) data.add(room("Số " + i + ", Cầu Giấy, Hà Nội", 3000000L, List.of()));
        data.add(room("1 Đường A, cầu giấy, hà nội", 0L, List.of(
                HinhAnh.builder().url("https://example.com/other.jpg").laDaiDien(false).build(),
                HinhAnh.builder().url("https://example.com/cover.jpg").laDaiDien(true).build())));
        data.add(room("2 Đường B, Đống Đa, Hà Nội", 2000000L, List.of()));
        when(rooms.findPublicRoomsForAreaStats()).thenReturn(data);
        var result = service.getPopularAreas();
        assertEquals(2, result.size());
        assertEquals("Cầu Giấy, Hà Nội", result.getFirst().name());
        assertEquals(26, result.getFirst().roomCount());
        assertEquals(0L, result.getFirst().minPrice());
        assertEquals("https://example.com/cover.jpg", result.getFirst().imageUrl());
        assertNull(result.get(1).imageUrl());
    }

    @Test void neverInventsAreaForIncompleteAddressesOrMissingData() {
        when(rooms.findPublicRoomsForAreaStats()).thenReturn(List.of(
                room(null, null, null), room("383", 3000000L, null),
                room("12 Nguyễn Văn Bảo", 3000000L, null), room(" , ", null, null)));
        assertTrue(service.getPopularAreas().isEmpty());
    }

    @Test void keepsCitiesDistinctAndReturnsAtMostSixAreas() {
        var data = new ArrayList<PhongTro>();
        data.add(room("1 Đường A, Phường A, Thành phố X", null, null));
        data.add(room("2 Đường A, Phường A, Thành phố Y", null, null));
        data.add(room("3 Đường A, Phường A, Thành phố X", null, null));
        data.add(room("4 Đường A, Phường A, Thành phố Y", null, null));
        for (int i = 0; i < 7; i++) data.add(room("1 Đường B, Phường " + i + ", Tỉnh Z", 1000000L, null));
        when(rooms.findPublicRoomsForAreaStats()).thenReturn(data);
        var result = service.getPopularAreas();
        assertEquals(6, result.size());
        assertTrue(result.stream().anyMatch(a -> a.keyword().equals("Phường A, Thành phố X")));
        assertTrue(result.stream().anyMatch(a -> a.keyword().equals("Phường A, Thành phố Y")));
    }
}
