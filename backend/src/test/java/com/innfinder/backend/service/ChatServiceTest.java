package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.chat.*;
import com.innfinder.backend.dto.room.*;
import com.innfinder.backend.exception.AppException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ChatServiceTest {
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final CategoryService categories = mock(CategoryService.class);
    private final RoomDiscoveryService discovery = mock(RoomDiscoveryService.class);
    private final AiSearchService search = mock(AiSearchService.class);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final ChatService service = new ChatService(gemini, new ObjectMapper(), categories, discovery, search, validator);
    private static final String ID = "PT191126150001";
    private static final String OTHER = "PT191126150002";

    @BeforeEach void setup() {
        when(categories.getAllRoomTypes()).thenReturn(List.of(CategoryResponse.builder().maLpt("LPT001").build()));
        when(categories.getAllAmenities()).thenReturn(List.of(AmenityResponse.builder().maTienIch("TI0001").build()));
        when(discovery.findByIds(anyList())).thenReturn(List.of());
        when(gemini.generate(anyString(), anyString(), isNull())).thenReturn("Đây là thông tin phòng từ hệ thống.");
    }

    private void plan(String intent, String id, SearchCriteria criteria) throws Exception {
        when(gemini.generate(anyString(), anyString(), notNull())).thenReturn(
                new ObjectMapper().writeValueAsString(new ChatService.Plan(intent, "phòng có máy lạnh", id, criteria)));
    }

    private RoomDiscoveryService.Document room(String id) {
        return new RoomDiscoveryService.Document(RoomSummaryResponse.builder().maPhongTro(id).giaThue(2500000L)
                .dienTich(20).diaChi("Gò Vấp").build(), RoomDetailResponse.builder().maPhongTro(id)
                .giaThue(2500000L).dienTich(20).diaChi("Gò Vấp").dsTienIch(List.of()).build(), "phòng");
    }

    @Test void opensBookingForExplicitRequestAndApprovedContext() throws Exception {
        plan("BOOKING", ID, null);
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        ChatResponse result = service.chat(new ChatRequest("Đặt lịch xem phòng này", List.of(), ID, null, List.of(), null));
        assertEquals("OPEN_BOOKING", result.action().type());
        assertEquals(ID, result.action().roomId());
        verifyNoInteractions(search);
    }

    @Test void cannotNavigateToInventedRoomId() throws Exception {
        plan("BOOKING", OTHER, null);
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        ChatResponse result = service.chat(new ChatRequest("Đặt lịch phòng thứ hai", List.of(), null, null, List.of(ID), null));
        assertNull(result.action());
        assertTrue(result.message().contains("phòng nào"));
    }

    @Test void asksWhichRoomInsteadOfPickingFirst() throws Exception {
        plan("BOOKING", null, null);
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID), room(OTHER)));
        assertNull(service.chat(new ChatRequest("Tôi muốn đặt lịch", List.of(), null, null, List.of(ID, OTHER), null)).action());
    }

    @Test void bookingInstructionsAndNegationsDoNotNavigate() throws Exception {
        plan("BOOKING", ID, null);
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        for (String message : List.of("Đặt lịch thế nào?", "Hướng dẫn cách đặt lịch", "Tôi không muốn đặt lịch", "Chưa đặt lịch nhé")) {
            assertNull(service.chat(new ChatRequest(message, List.of(), ID, null, List.of(), null)).action(), message);
        }
    }

    @Test void invalidOrNoLongerApprovedRoomCannotBeBooked() throws Exception {
        plan("BOOKING", ID, null);
        assertNull(service.chat(new ChatRequest("Đặt lịch phòng này", List.of(), ID, null, List.of(), null)).action());
    }

    @Test void translatesCriteriaIntoActualSearchAndDoesNotRelaxEmptyResults() throws Exception {
        SearchCriteria criteria = new SearchCriteria("Gò Vấp", null, 3000000L, 20, null, 2, "LPT001", List.of("TI0001"), "PRICE_ASC");
        plan("SEARCH", null, criteria);
        when(search.search(anyString(), any(), eq(6), eq("PRICE_ASC"))).thenReturn(new AiSearchService.Result(List.of(), "FILTERED"));
        ChatResponse result = service.chat(new ChatRequest("Rẻ hơn, vẫn cần máy lạnh", List.of(), null, null, List.of(), criteria));
        ArgumentCaptor<RoomFilterRequest> filter = ArgumentCaptor.forClass(RoomFilterRequest.class);
        verify(search).search(anyString(), filter.capture(), eq(6), eq("PRICE_ASC"));
        assertEquals(3000000L, filter.getValue().getMaxGia());
        assertEquals(2, filter.getValue().getSoNguoi());
        assertEquals(List.of("TI0001"), filter.getValue().getDsTienIch());
        assertTrue(result.rooms().isEmpty());
        assertEquals(criteria, result.criteria());
    }

    @Test void unknownAmenityIsRejectedRatherThanIgnored() throws Exception {
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of("TI9999"), "RELEVANCE"));
        assertThrows(AppException.class, () -> service.chat(new ChatRequest("Tìm phòng", List.of(), null, null, List.of(), null)));
        verifyNoInteractions(search);
    }

    @Test void explicitWebFiltersOverrideModelCriteria() throws Exception {
        plan("SEARCH", null, new SearchCriteria(null, null, 5000000L, null, null, null, null, List.of(), "RELEVANCE"));
        when(search.search(anyString(), any(), eq(10), any())).thenReturn(new AiSearchService.Result(List.of(), "FILTERED"));
        RoomFilterRequest explicit = new RoomFilterRequest();
        explicit.setMaxGia(3000000L);
        service.searchRooms("phòng dưới 5 triệu", explicit, 10);
        ArgumentCaptor<RoomFilterRequest> filter = ArgumentCaptor.forClass(RoomFilterRequest.class);
        verify(search).search(anyString(), filter.capture(), eq(10), any());
        assertEquals(3000000L, filter.getValue().getMaxGia());
    }

    @Test void greetingReturnsImmediatelyWithoutCallingGoogleOrDatabase() {
        ChatResponse result = service.chat(new ChatRequest("Xin chào!", List.of(), null, null, List.of(), null));
        assertTrue(result.message().contains("Chào bạn"));
        verifyNoInteractions(gemini, search, discovery);
    }

    @Test void explicitCurrentRoomBookingDoesNotWaitForAI() {
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        ChatResponse result = service.chat(new ChatRequest("Tôi muốn đặt lịch xem phòng này", List.of(), ID, null, List.of(), null));
        assertEquals(ID, result.action().roomId());
        verifyNoInteractions(gemini, search);
    }

    @Test void searchUsesOnlyOneGenerationCall() throws Exception {
        plan("SEARCH", null, null);
        when(search.search(anyString(), any(), eq(6), isNull())).thenReturn(new AiSearchService.Result(List.of(room(ID)), "FILTERED"));
        ChatResponse result = service.chat(new ChatRequest("Tìm phòng", List.of(), null, null, List.of(), null));
        assertEquals(1, result.rooms().size());
        verify(gemini, times(1)).generate(anyString(), anyString(), notNull());
        verify(gemini, never()).generate(anyString(), anyString(), isNull());
    }

    @Test void detailAnswerComesFromTheSameStructuredCall() throws Exception {
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        when(gemini.generate(anyString(), anyString(), notNull())).thenReturn(new ObjectMapper().writeValueAsString(
                new ChatService.Plan("DETAIL", "giá thuê", ID, null, "Phòng có giá thuê 2,5 triệu đồng/tháng.")));
        ChatResponse result = service.chat(new ChatRequest("Bạn giới thiệu ngắn về phòng đang xem được không?", List.of(), ID, null, List.of(), null));
        assertTrue(result.message().contains("2,5 triệu"));
        verify(gemini, times(1)).generate(anyString(), anyString(), notNull());
        verify(gemini, never()).generate(anyString(), anyString(), isNull());
    }

    @Test void commonRoomFactsAreInstantAndNeverInventMissingAmenities() {
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(ID)));
        ChatResponse price = service.chat(new ChatRequest("Phòng này giá thuê bao nhiêu?", List.of(), ID, null, List.of(), null));
        assertTrue(price.message().contains("2.500.000"));
        ChatResponse amenities = service.chat(new ChatRequest("Phòng này có những tiện ích gì?", List.of(), ID, null, List.of(), null));
        assertTrue(amenities.message().contains("chưa cung cấp"));
        ChatResponse deposit = service.chat(new ChatRequest("Tiền cọc phòng này là bao nhiêu?", List.of(), ID, null, List.of(), null));
        assertTrue(deposit.message().contains("chưa có thông tin"));
        assertFalse(deposit.message().contains("200.000"));
        verifyNoInteractions(gemini);
    }

    @Test void simpleCheapSearchSortsActualDataWithoutInventingABudgetOrCallingGoogle() {
        when(search.search(anyString(), any(), eq(6), eq("PRICE_ASC"))).thenReturn(new AiSearchService.Result(List.of(room(ID)), "FILTERED"));
        ChatResponse result = service.chat(new ChatRequest("Trọ rẻ", List.of(), null, null, List.of(), null));
        assertEquals("PRICE_ASC", result.criteria().sort());
        assertNull(result.criteria().maxPrice());
        verifyNoInteractions(gemini);
    }

    @Test void knownDepositPolicyNeedsNoProviderRoundTrip() {
        ChatResponse result = service.chat(new ChatRequest("Cọc xem phòng được hoàn thế nào?", List.of(), null, null, List.of(), null));
        assertTrue(result.message().contains("100%"));
        verifyNoInteractions(gemini, discovery, search);
    }

    @Test void legacySeedRoomCanStillBeReferencedWithoutChangingNewRoomIds() {
        String legacy = "PT0111260001";
        ChatRequest request = new ChatRequest("Đặt lịch xem phòng này", List.of(), legacy, null, List.of(legacy), null);
        assertTrue(validator.validate(request).isEmpty());
        when(discovery.findByIds(anyList())).thenReturn(List.of(room(legacy)));
        assertEquals(legacy, service.chat(request).action().roomId());
        ChatRequest invalid = new ChatRequest("hi", List.of(), "https://example.com", null, List.of(), null);
        assertFalse(validator.validate(invalid).isEmpty());
    }
}
