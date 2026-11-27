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

    @Test void simpleCheapSearchFiltersUnder4MillionAndSortsWithoutCallingGoogle() {
        when(search.search(anyString(), any(), eq(6), eq("PRICE_ASC"))).thenReturn(new AiSearchService.Result(List.of(room(ID)), "FILTERED"));
        ChatResponse troReResult = service.chat(new ChatRequest("Trọ rẻ", List.of(), null, null, List.of(), null));
        assertEquals("PRICE_ASC", troReResult.criteria().sort());
        assertEquals(4_000_000L, troReResult.criteria().maxPrice());

        ChatResponse giaReResult = service.chat(new ChatRequest("giá rẻ", List.of(), null, null, List.of(), null));
        assertEquals("PRICE_ASC", giaReResult.criteria().sort());
        assertEquals(4_000_000L, giaReResult.criteria().maxPrice());
        verifyNoInteractions(gemini);
    }

    @Test void troRePrioritizesPhongTroAboveDormitoryEvenWhenDormitoryIsCheaper() {
        RoomDiscoveryService.Document dorm = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(ID).giaThue(1_600_000L).dienTich(15)
                        .tenLoaiPhong("Ký túc xá / Sleepbox").diaChi("Cầu Giấy").build(),
                RoomDetailResponse.builder().maPhongTro(ID).giaThue(1_600_000L).dienTich(15)
                        .loaiPhong(CategoryResponse.builder().maLpt("LPT001").tenLoaiPhongTro("Ký túc xá / Sleepbox").build())
                        .diaChi("Cầu Giấy").dsTienIch(List.of()).build(),
                "Ký túc xá / Sleepbox");
        RoomDiscoveryService.Document phongTro = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(OTHER).giaThue(3_000_000L).dienTich(22)
                        .tenLoaiPhong("Phòng trọ khép kín").diaChi("Gò Vấp").build(),
                RoomDetailResponse.builder().maPhongTro(OTHER).giaThue(3_000_000L).dienTich(22)
                        .loaiPhong(CategoryResponse.builder().maLpt("LPT002").tenLoaiPhongTro("Phòng trọ khép kín").build())
                        .diaChi("Gò Vấp").dsTienIch(List.of()).build(),
                "Phòng trọ khép kín");
        when(search.search(eq("trọ"), any(), eq(6), eq("PRICE_ASC")))
                .thenReturn(new AiSearchService.Result(List.of(dorm, phongTro), "FILTERED"));

        ChatResponse result = service.chat(new ChatRequest("trọ rẻ", List.of(), null, null, List.of(), null));
        assertEquals(2, result.rooms().size());
        assertEquals(OTHER, result.rooms().get(0).getMaPhongTro());
        assertEquals(ID, result.rooms().get(1).getMaPhongTro());
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

    @Test void allRoomsRequestListsApprovedRoomsWithoutLiteralKeywordFilter() {
        when(search.search(eq(""), any(), eq(6), eq("RELEVANCE")))
                .thenReturn(new AiSearchService.Result(List.of(room(ID), room(OTHER)), "FILTERED"));
        ChatResponse result = service.chat(new ChatRequest("tất cả các phòng", List.of(), null, null, List.of(), null));
        assertEquals(2, result.rooms().size());
        verify(search).search(eq(""), any(), eq(6), eq("RELEVANCE"));
        verifyNoInteractions(gemini);
    }

    @Test void nearbyQueryWithoutCoordinatesAsksForLocationPermission() {
        ChatResponse result = service.chat(new ChatRequest("tìm phòng gần vị trí của tôi", List.of(), null, null, List.of(), null));
        assertTrue(result.rooms().isEmpty());
        assertTrue(result.message().contains("vị trí"));
        verifyNoInteractions(gemini, search);
    }

    @Test void nearbyQueryWithCoordinatesFiltersWithin15KmOnly() {
        RoomDiscoveryService.Document hcmcRoom = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(ID).giaThue(3000000L).dienTich(20)
                        .diaChi("Quận 1, TP.HCM").viDo("10.7769").kinhDo("106.7009").build(),
                RoomDetailResponse.builder().maPhongTro(ID).giaThue(3000000L).dienTich(20)
                        .diaChi("Quận 1, TP.HCM").dsTienIch(List.of()).build(),
                "phòng TP.HCM");
        RoomDiscoveryService.Document hanoiRoom = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").viDo("21.0285").kinhDo("105.8542").build(),
                RoomDetailResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").dsTienIch(List.of()).build(),
                "phòng Hà Nội");
        when(discovery.find(any())).thenReturn(List.of(hanoiRoom, hcmcRoom));

        ChatResponse result = service.chat(new ChatRequest(
                "tìm phòng gần vị trí của tôi", List.of(), null, null, List.of(), null, 10.7800, 106.6950));
        assertEquals(1, result.rooms().size());
        assertEquals(ID, result.rooms().get(0).getMaPhongTro());
        assertTrue(result.message().contains("15 km"));
        verifyNoInteractions(gemini);
    }

    @Test void enrichCriteriaMatchesDormitoryAmenitiesAreaAndPriceExactly() throws Exception {
        when(categories.getAllRoomTypes()).thenReturn(List.of(
                CategoryResponse.builder().maLpt("LPT001").tenLoaiPhongTro("Ký túc xá / Sleepbox").build(),
                CategoryResponse.builder().maLpt("LPT002").tenLoaiPhongTro("Phòng trọ khép kín").build()));
        when(categories.getAllAmenities()).thenReturn(List.of(
                AmenityResponse.builder().maTienIch("TI0001").tenTienIch("Máy lạnh").build(),
                AmenityResponse.builder().maTienIch("TI0002").tenTienIch("Wi-Fi").build()));
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of(), "RELEVANCE"));
        when(search.search(anyString(), any(), eq(6), eq("RELEVANCE"))).thenReturn(new AiSearchService.Result(List.of(room(ID)), "FILTERED"));

        service.chat(new ChatRequest(
                "tìm phòng kí túc xá có điều hòa, wifi trên 15m2 dưới 2.5 triệu", List.of(), null, null, List.of(), null));

        ArgumentCaptor<RoomFilterRequest> filter = ArgumentCaptor.forClass(RoomFilterRequest.class);
        verify(search).search(anyString(), filter.capture(), eq(6), eq("RELEVANCE"));
        assertEquals("LPT001", filter.getValue().getMaLpt());
        assertEquals(List.of("TI0001", "TI0002"), filter.getValue().getDsTienIch());
        assertEquals(15, filter.getValue().getMinDienTich());
        assertEquals(2_500_000L, filter.getValue().getMaxGia());
    }

    @Test void enrichCriteriaSwitchesCategoryWhenUserAsksForDifferentRoomType() throws Exception {
        when(categories.getAllRoomTypes()).thenReturn(List.of(
                CategoryResponse.builder().maLpt("LPT001").tenLoaiPhongTro("Ký túc xá / Sleepbox").build(),
                CategoryResponse.builder().maLpt("LPT002").tenLoaiPhongTro("Phòng trọ khép kín").build()));
        SearchCriteria previous = new SearchCriteria(null, null, null, null, null, null, "LPT002", List.of(), "RELEVANCE");
        plan("SEARCH", null, previous);
        when(search.search(anyString(), any(), eq(6), eq("RELEVANCE"))).thenReturn(new AiSearchService.Result(List.of(room(ID)), "FILTERED"));

        service.chat(new ChatRequest("tìm sleepbox", List.of(), null, null, List.of(), previous));

        ArgumentCaptor<RoomFilterRequest> filter = ArgumentCaptor.forClass(RoomFilterRequest.class);
        verify(search).search(anyString(), filter.capture(), eq(6), eq("RELEVANCE"));
        assertEquals("LPT001", filter.getValue().getMaLpt());
    }

    @Test void findsRoomsWithin15KmOfSpecificTargetPlace() throws Exception {
        RoomDiscoveryService.Document nearIuh = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(ID).giaThue(2500000L).dienTich(20)
                        .diaChi("12 Nguyễn Văn Bảo, Gò Vấp").viDo("10.8222").kinhDo("106.6875").build(),
                RoomDetailResponse.builder().maPhongTro(ID).giaThue(2500000L).dienTich(20)
                        .diaChi("12 Nguyễn Văn Bảo, Gò Vấp").dsTienIch(List.of()).build(),
                "phòng gần IUH");
        RoomDiscoveryService.Document farRoom = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").viDo("21.0285").kinhDo("105.8542").build(),
                RoomDetailResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").dsTienIch(List.of()).build(),
                "phòng xa");
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of(), "RELEVANCE"));
        when(discovery.find(any())).thenReturn(List.of(farRoom, nearIuh));

        ChatResponse result = service.chat(new ChatRequest(
                "trọ gần đại học công nghiệp", List.of(), null, null, List.of(), null,
                null, null, 10.8221, 106.6874, "Đại học Công nghiệp TP.HCM"));

        assertEquals(1, result.rooms().size());
        assertEquals(ID, result.rooms().get(0).getMaPhongTro());
        assertTrue(result.message().contains("15 km"));
        assertTrue(result.message().contains("Đại học Công nghiệp TP.HCM"));
        verifyNoInteractions(search);
    }

    @Test void returnsHelpfulReplyWhenNoRoomsNearTargetPlace() throws Exception {
        RoomDiscoveryService.Document farRoom = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").viDo("21.0285").kinhDo("105.8542").build(),
                RoomDetailResponse.builder().maPhongTro(OTHER).giaThue(2500000L).dienTich(20)
                        .diaChi("Đống Đa, Hà Nội").dsTienIch(List.of()).build(),
                "phòng xa");
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of(), "RELEVANCE"));
        when(discovery.find(any())).thenReturn(List.of(farRoom));

        ChatResponse result = service.chat(new ChatRequest(
                "trọ gần đại học công nghiệp", List.of(), null, null, List.of(), null,
                null, null, 10.8221, 106.6874, "Đại học Công nghiệp TP.HCM"));

        assertTrue(result.rooms().isEmpty());
        assertTrue(result.message().contains("15 km"));
        assertTrue(result.message().contains("Đại học Công nghiệp TP.HCM"));
        verifyNoInteractions(search);
    }

    @Test void respectsExactRequestedRoomCountForNearbyAndStandardSearch() throws Exception {
        RoomDiscoveryService.Document r1 = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(ID).giaThue(2500000L).dienTich(20)
                        .diaChi("12 Nguyễn Văn Bảo, Gò Vấp").viDo("10.8222").kinhDo("106.6875").build(),
                RoomDetailResponse.builder().maPhongTro(ID).giaThue(2500000L).dienTich(20)
                        .diaChi("12 Nguyễn Văn Bảo, Gò Vấp").dsTienIch(List.of()).build(),
                "phòng 1");
        RoomDiscoveryService.Document r2 = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(OTHER).giaThue(2600000L).dienTich(20)
                        .diaChi("15 Lê Lợi, Gò Vấp").viDo("10.8235").kinhDo("106.6880").build(),
                RoomDetailResponse.builder().maPhongTro(OTHER).giaThue(2600000L).dienTich(20)
                        .diaChi("15 Lê Lợi, Gò Vấp").dsTienIch(List.of()).build(),
                "phòng 2");
        RoomDiscoveryService.Document r3 = new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro("PT191126150003").giaThue(2700000L).dienTich(20)
                        .diaChi("20 Quang Trung, Gò Vấp").viDo("10.8260").kinhDo("106.6890").build(),
                RoomDetailResponse.builder().maPhongTro("PT191126150003").giaThue(2700000L).dienTich(20)
                        .diaChi("20 Quang Trung, Gò Vấp").dsTienIch(List.of()).build(),
                "phòng 3");
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of(), "RELEVANCE"));
        when(discovery.find(any())).thenReturn(List.of(r3, r2, r1));

        ChatResponse nearbyLimited = service.chat(new ChatRequest(
                "tìm 2 phòng gần IUH", List.of(), null, null, List.of(), null,
                null, null, 10.8221, 106.6874, "Đại học Công nghiệp TP.HCM"));

        assertEquals(2, nearbyLimited.rooms().size());
        assertEquals(ID, nearbyLimited.rooms().get(0).getMaPhongTro());
        assertEquals(OTHER, nearbyLimited.rooms().get(1).getMaPhongTro());
        verifyNoInteractions(search);
    }

    @Test void doesNotReturnUnrelatedCitiesWhenTargetPlaceHasNoCoordinates() throws Exception {
        plan("SEARCH", null, new SearchCriteria(null, null, null, null, null, null, null, List.of(), "RELEVANCE"));
        when(discovery.find(any())).thenReturn(List.of());

        ChatResponse result = service.chat(new ChatRequest(
                "tìm trọ gần trường XYZ không tồn tại", List.of(), null, null, List.of(), null,
                null, null, null, null, "trường XYZ không tồn tại"));

        assertTrue(result.rooms().isEmpty());
        assertTrue(result.message().contains("trường XYZ không tồn tại"));
        verifyNoInteractions(search);
    }
}
