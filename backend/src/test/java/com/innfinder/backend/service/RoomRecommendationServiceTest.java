package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.repository.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RoomRecommendationServiceTest {
    @Test void bookedRoomsAreNeverReintroducedAndCanceledBookingsAreNotPositiveSeeds() {
        var discovery = mock(RoomDiscoveryService.class);
        var vectors = mock(PhongTroVectorRepository.class);
        var users = mock(NguoiDungRepository.class);
        var bookings = mock(PhieuDatLichRepository.class);
        var service = new RoomRecommendationService(discovery, vectors, mock(AiEmbeddingService.class), users, bookings, new ObjectMapper());
        String id = "PT251126120001";
        var doc = new RoomDiscoveryService.Document(RoomSummaryResponse.builder().maPhongTro(id).giaThue(2000000L).build(), null, "room");
        when(discovery.findRecommendationCandidates()).thenReturn(List.of(doc));
        when(discovery.findPreferenceSeeds(any())).thenReturn(List.of(doc));
        var user = new NguoiDung(); user.setMaNguoiDung("ND251120260001");
        when(users.findByTenDangNhap("tester")).thenReturn(Optional.of(user));
        var room = new PhongTro(); room.setMaPhongTro(id);
        var booking = new PhieuDatLich(); booking.setPhongTro(room); booking.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        when(bookings.findTop10ByKhachHang_MaNguoiDungOrderByNgayHenDesc(anyString())).thenReturn(List.of(booking));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("tester", "", List.of()));
        try {
            assertTrue(service.getPersonalizedRecommendations(List.of(), 8).isEmpty());
            booking.setTrangThai(TrangThaiDatLich.HUY);
            assertEquals(id, service.getPersonalizedRecommendations(List.of(), 8).getFirst().getMaPhongTro());
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test void staleAndMalformedVectorsAreRejected() throws Exception {
        var discovery = mock(RoomDiscoveryService.class);
        var vectors = mock(PhongTroVectorRepository.class);
        var mapper = new ObjectMapper();
        var service = new RoomRecommendationService(discovery, vectors, mock(AiEmbeddingService.class), mock(NguoiDungRepository.class), mock(PhieuDatLichRepository.class), mapper);
        String id = "PT251126120001";
        var doc = new RoomDiscoveryService.Document(RoomSummaryResponse.builder().maPhongTro(id).build(), null, "updated description");
        var vector = PhongTroVector.builder().maPhongTro(id).contentHash("old-hash").embeddingJson(mapper.writeValueAsString(Collections.nCopies(768, 1.0))).build();
        when(vectors.findAllById(any())).thenReturn(List.of(vector));
        Map<?, ?> result = ReflectionTestUtils.invokeMethod(service, "loadValidVectors", List.of(doc));
        assertTrue(result.isEmpty());
        vector.setContentHash(AiSearchService.hash(doc.text()));
        result = ReflectionTestUtils.invokeMethod(service, "loadValidVectors", List.of(doc));
        assertTrue(result.containsKey(id));
        vector.setEmbeddingJson("[1,2]");
        result = ReflectionTestUtils.invokeMethod(service, "loadValidVectors", List.of(doc));
        assertTrue(result.isEmpty());
    }
}
