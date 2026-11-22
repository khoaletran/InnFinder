package com.innfinder.backend.service;

import com.innfinder.backend.dto.room.*;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.*;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LandlordRoomTests {
    private final PhongTroRepository rooms = mock(PhongTroRepository.class);
    private final LoaiPhongTroRepository types = mock(LoaiPhongTroRepository.class);
    private final TienIchRepository amenities = mock(TienIchRepository.class);
    private final ChuTroRepository owners = mock(ChuTroRepository.class);
    private final RoomService service = new RoomService(rooms, types, amenities, owners, mock(CloudinaryService.class));
    private ChuTro owner;
    private PhongTro room;
    @BeforeEach void setup() {
        owner = ChuTro.builder().maChuTro("owner").build();
        room = PhongTro.builder().maPhongTro("PT221126090000").chuPhongTro(owner).cocPhong(5000000L)
                .giaThue(3000000L).trangThai(TrangThaiPhongTro.CHO_DUYET).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner", "", List.of()));
        when(owners.findByNguoiDung_TenDangNhap("owner")).thenReturn(Optional.of(owner));
        when(rooms.findByIdForUpdate(room.getMaPhongTro())).thenReturn(Optional.of(room));
        when(rooms.findByMaPhongTro(room.getMaPhongTro())).thenReturn(Optional.of(room));
        when(rooms.save(any())).thenAnswer(call -> call.getArgument(0));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void cannotSelfApprovePendingOrRejectedRooms() {
        for (TrangThaiPhongTro status : List.of(TrangThaiPhongTro.CHO_DUYET, TrangThaiPhongTro.HUY)) {
            room.setTrangThai(status);
            assertEquals(ErrorCode.ROOM_STATUS_NOT_ALLOWED, assertThrows(AppException.class,
                    () -> service.updateRoomStatus(room.getMaPhongTro(), TrangThaiPhongTro.DA_DUYET)).getErrorCode());
            assertEquals(status, room.getTrangThai());
        }
        verify(rooms, never()).save(any());
    }
    @Test void approvedRoomCanBeMarkedRentedAndReopened() {
        room.setTrangThai(TrangThaiPhongTro.DA_DUYET);
        service.updateRoomStatus(room.getMaPhongTro(), TrangThaiPhongTro.HOAN_THANH);
        assertEquals(TrangThaiPhongTro.HOAN_THANH, room.getTrangThai());
        service.updateRoomStatus(room.getMaPhongTro(), TrangThaiPhongTro.DA_DUYET);
        assertEquals(TrangThaiPhongTro.DA_DUYET, room.getTrangThai());
    }
    @Test void hidingDoesNotPretendRoomWasRented() {
        room.setTrangThai(TrangThaiPhongTro.DA_DUYET);
        service.setRoomVisibility(room.getMaPhongTro(), true);
        assertTrue(room.isTamAn());
        assertEquals(TrangThaiPhongTro.DA_DUYET, room.getTrangThai());
        service.setRoomVisibility(room.getMaPhongTro(), false);
        assertFalse(room.isTamAn());
    }
    @Test void cannotReadOrModifyAnotherLandlordsRoom() {
        room.setChuPhongTro(ChuTro.builder().maChuTro("other").build());
        assertEquals(ErrorCode.ROOM_NOT_OWNED, assertThrows(AppException.class,
                () -> service.getOwnedRoomDetail(room.getMaPhongTro())).getErrorCode());
        assertThrows(AppException.class, () -> service.updateRoomStatus(room.getMaPhongTro(), TrangThaiPhongTro.HUY));
    }
    @Test void listingReturnsContractDepositInsteadOfRent() {
        when(rooms.findByChuPhongTro_MaChuTro("owner")).thenReturn(List.of(room));
        var result = service.getMyRooms().getFirst();
        assertEquals(5000000L, result.getCocPhong());
        assertEquals(3000000L, result.getGiaThue());
    }
    private RoomCreateRequest request() { return RoomCreateRequest.builder().maLpt("LPT001").giaThue(3000000L)
            .dienTich(25).soNguoi(2).diaChi("12 Nguyen Van Bao").coc(5000000L)
            .hinhAnhUrls(List.of("https://example.com/room.jpg")).dsTienIch(List.of("TI0001")).build(); }
    @Test void rejectsMissingImagesAndUnknownRoomType() {
        var request = request(); request.setHinhAnhUrls(List.of());
        assertEquals(ErrorCode.INVALID_IMAGE_FILE, assertThrows(AppException.class,
                () -> service.createRoomFromJson(request)).getErrorCode());
        request.setHinhAnhUrls(List.of("https://example.com/room.jpg"));
        assertEquals(ErrorCode.CATEGORY_NOT_FOUND, assertThrows(AppException.class,
                () -> service.createRoomFromJson(request)).getErrorCode());
    }
    @Test void savesSelectedAmenitiesAndContractDeposit() {
        when(types.findById("LPT001")).thenReturn(Optional.of(LoaiPhongTro.builder().maLpt("LPT001").build()));
        when(amenities.findAllById(any())).thenReturn(List.of(TienIch.builder().maTienIch("TI0001").tenTienIch("Wifi").build()));
        var result = service.createRoomFromJson(request());
        assertEquals("TI0001", result.getDsTienIch().getFirst().getMaTienIch());
        assertEquals(5000000L, result.getCoc());
        assertEquals(TrangThaiPhongTro.CHO_DUYET, result.getTrangThai());
    }
    @Test void rejectsInvalidAmenitiesInsteadOfSilentlyDiscarding() {
        when(types.findById("LPT001")).thenReturn(Optional.of(LoaiPhongTro.builder().maLpt("LPT001").build()));
        when(amenities.findAllById(any())).thenReturn(List.of());
        assertEquals(ErrorCode.AMENITY_NOT_FOUND, assertThrows(AppException.class,
                () -> service.createRoomFromJson(request())).getErrorCode());
    }
}
