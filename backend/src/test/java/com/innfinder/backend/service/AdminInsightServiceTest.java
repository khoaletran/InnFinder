package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminInsightServiceTest {
    private final AdminService stats = mock(AdminService.class);
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final AdminInsightService service = new AdminInsightService(stats, gemini, new ObjectMapper());

    private void setup() {
        when(stats.getStatistics(null, 11, 2026)).thenReturn(AdminStatisticsResponseDTO.builder()
                .tongDoanhThu(240000).soLichHoanThanh(15).tongSoPhong(19)
                .soPhongChoDuyet(4).soChuTroChoDuyet(3).soLenhRutChoDuyet(2)
                .quyChoRut(100000).bieuDoDoanhThu(List.of()).coCauLoaiPhong(List.of()).build());
        when(gemini.isConfigured()).thenReturn(true);
    }

    @Test void firstProviderTimeoutReturnsUsableCompactFallback() {
        setup();
        when(gemini.generate(anyString(), anyString(), anyMap())).thenThrow(new AppException(ErrorCode.AI_TIMEOUT));
        var result = service.generateInsights(null, 11, 2026);
        assertEquals("RULE_BASED", result.getNguonPhanTich());
        assertFalse(result.getTongQuan().isBlank());
        assertEquals(2, result.getDeXuatQuyetDinh().size());
        assertTrue(result.getTongQuan().split("\\s+").length <= 30);
        verify(stats).getStatistics(null, 11, 2026);
    }

    @Test void limitsVerboseAiAndFiltersUnsafeActions() throws Exception {
        setup();
        String verbose = "Thông tin ".repeat(70);
        var action = Map.of("tieuDe", verbose, "moTa", verbose, "mucDoUuTien", "INVALID", "duongDan", "https://example.com");
        String json = new ObjectMapper().writeValueAsString(Map.of("tongQuan", verbose,
                "danhGiaDoanhThu", verbose, "danhGiaNganKho", verbose, "danhGiaLoaiPhong", verbose,
                "deXuatQuyetDinh", List.of(action, action, action)));
        when(gemini.generate(anyString(), anyString(), anyMap())).thenReturn(json);
        var result = service.generateInsights(null, 11, 2026);
        assertEquals("AI", result.getNguonPhanTich());
        assertEquals(2, result.getDeXuatQuyetDinh().size());
        assertTrue(result.getTongQuan().split("\\s+").length <= 30);
        assertTrue(result.getDanhGiaDoanhThu().split("\\s+").length <= 18);
        result.getDeXuatQuyetDinh().forEach(item -> {
            assertTrue(item.getMoTa().split("\\s+").length <= 20);
            assertTrue(item.getTieuDe().split("\\s+").length <= 10);
            assertEquals("", item.getDuongDan());
            assertEquals("TRUNG_BINH", item.getMucDoUuTien());
        });
    }

    @Test void missingConfigurationOrInvalidJsonStillReturnsSummary() {
        setup();
        when(gemini.isConfigured()).thenReturn(false);
        assertEquals("RULE_BASED", service.generateInsights(null, 11, 2026).getNguonPhanTich());
        verify(gemini, never()).generate(anyString(), anyString(), anyMap());
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generate(anyString(), anyString(), anyMap())).thenReturn("not JSON");
        assertEquals("RULE_BASED", service.generateInsights(null, 11, 2026).getNguonPhanTich());
    }
}
