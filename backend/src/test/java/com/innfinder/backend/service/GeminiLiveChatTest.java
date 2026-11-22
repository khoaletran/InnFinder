package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.chat.ChatRequest;
import com.innfinder.backend.dto.chat.ChatResponse;
import com.innfinder.backend.dto.room.*;
import jakarta.validation.Validation;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Explicitly opt-in only: sends the full planner/schema and synthetic public room facts to Google. */
@EnabledIfSystemProperty(named = "innfinder.live-ai", matches = "true")
class GeminiLiveChatTest {
    @Test void fullChatRequestsWithRealProviderAndSyntheticRoomData() throws Exception {
        String key = System.getenv("GEMINI_API_KEY");
        if (key == null || key.isBlank()) {
            String entry = Files.readAllLines(Path.of(".env")).stream().map(String::trim)
                    .filter(s -> s.startsWith("GEMINI_API_KEY=")).findFirst().orElseThrow();
            key = entry.substring(entry.indexOf('=') + 1).trim().replaceAll("^[\"']|[\"']$", "");
        }
        assertFalse(key.isBlank(), "Configure backend/.env before running the opt-in live test.");
        GeminiClient provider = new GeminiClient(new ObjectMapper(), key, "gemini-3.5-flash-lite");
        CategoryService categories = mock(CategoryService.class);
        RoomDiscoveryService discovery = mock(RoomDiscoveryService.class);
        AiSearchService search = mock(AiSearchService.class);
        when(categories.getAllRoomTypes()).thenReturn(List.of(CategoryResponse.builder().maLpt("LPT001").tenLoaiPhongTro("Phòng trọ").build()));
        when(categories.getAllAmenities()).thenReturn(List.of(AmenityResponse.builder().maTienIch("TI0001").tenTienIch("Máy lạnh").build()));
        String id = "PT191126150001";
        var room = new RoomDiscoveryService.Document(RoomSummaryResponse.builder().maPhongTro(id)
                .diaChi("Phòng minh họa, Gò Vấp, Hồ Chí Minh").giaThue(2500000L).dienTich(20).soNguoi(2).build(),
                RoomDetailResponse.builder().maPhongTro(id).giaThue(2500000L).diaChi("Phòng minh họa, Gò Vấp, Hồ Chí Minh")
                        .dienTich(20).soNguoi(2).coc(2500000L).dsTienIch(List.of(AmenityResponse.builder().maTienIch("TI0001").tenTienIch("Máy lạnh").build()))
                        .loaiPhong(CategoryResponse.builder().maLpt("LPT001").tenLoaiPhongTro("Phòng trọ").soTienCoc(200000).build()).build(), "phòng minh họa");
        when(discovery.findByIds(anyList())).thenAnswer(inv -> ((List<?>) inv.getArgument(0)).isEmpty() ? List.of() : List.of(room));
        when(search.search(anyString(), any(), anyInt(), any())).thenAnswer(inv -> {
            RoomFilterRequest filter = inv.getArgument(1);
            assertEquals(3000000L, filter.getMaxGia());
            assertEquals(2, filter.getSoNguoi());
            return new AiSearchService.Result(List.of(room), "FILTERED");
        });
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            ChatService service = new ChatService(provider, new ObjectMapper(), categories, discovery, search, factory.getValidator());
            long start = System.nanoTime();
            ChatResponse result = service.chat(new ChatRequest("Tìm phòng ở Gò Vấp dưới 3 triệu cho 2 người", List.of(), null, null, List.of(), null));
            System.out.printf("LIVE search: %d ms, rooms=%d%n", (System.nanoTime() - start) / 1000000, result.rooms().size());
            assertEquals(1, result.rooms().size());
            start = System.nanoTime();
            ChatResponse detail = service.chat(new ChatRequest("Giới thiệu ngắn về giá thuê và tiện ích của phòng đang xem nhé", List.of(), id, null, List.of(id), null));
            System.out.printf("LIVE detail: %d ms, replyCharacters=%d%n", (System.nanoTime() - start) / 1000000, detail.message().length());
            assertFalse(detail.message().isBlank());
            assertTrue(detail.message().contains("2,5") || detail.message().contains("2.5") || detail.message().contains("2.500.000") || detail.message().contains("2,500,000"));
            start = System.nanoTime();
            ChatResponse booking = service.chat(new ChatRequest("Đặt lịch xem phòng này", List.of(), id, null, List.of(id), null));
            System.out.printf("LIVE booking redirect: %d ms%n", (System.nanoTime() - start) / 1000000);
            assertEquals(id, booking.action().roomId());
        }
    }
}
