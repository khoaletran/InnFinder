package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.*;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.*;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LandlordAppointmentTests {
    private final PhieuDatLichRepository appointments = mock(PhieuDatLichRepository.class);
    private final NguoiDungRepository users = mock(NguoiDungRepository.class);
    private final PhongTroRepository rooms = mock(PhongTroRepository.class);
    private final ChuTroRepository owners = mock(ChuTroRepository.class);
    private final TransactionService ledger = mock(TransactionService.class);
    private final GiaoDichRepository transactions = mock(GiaoDichRepository.class);
    private final AppointmentService service = new AppointmentService(appointments, users, rooms, owners, ledger, transactions);
    private PhongTro room;
    private PhieuDatLich appointment;
    private ChuTro owner;
    @BeforeEach void setup() {
        var user = NguoiDung.builder().maNguoiDung("owner").tenDangNhap("owner").build();
        var guest = NguoiDung.builder().maNguoiDung("guest").tenDangNhap("guest").build();
        owner = ChuTro.builder().maChuTro("owner").nguoiDung(user).soDu(0L).build();
        room = PhongTro.builder().maPhongTro("room").chuPhongTro(owner).trangThai(TrangThaiPhongTro.DA_DUYET).build();
        appointment = PhieuDatLich.builder().maDatLich("booking").khachHang(guest).phongTro(room)
                .trangThai(TrangThaiDatLich.XAC_NHAN).coc(200000L).phiThu(20000L).daNhanLaiCoc(true)
                .ngayHen(LocalDateTime.now()).build();
        when(users.findByTenDangNhap("owner")).thenReturn(Optional.of(user));
        when(appointments.findByIdForUpdate("booking")).thenReturn(Optional.of(appointment));
        when(rooms.findByIdForUpdate("room")).thenReturn(Optional.of(room));
        when(owners.findByIdForUpdate("owner")).thenReturn(Optional.of(owner));
        when(rooms.findStatusForUpdate("room")).thenAnswer(call -> room.getTrangThai().name());
    }
    @Test void rejectionRefundsOnceAndReplayCannotPayAgain() {
        service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(false).liDoTuChoi("Không phù hợp").build());
        assertEquals(200000L, owner.getSoDu());
        assertEquals(TrangThaiDatLich.HUY, appointment.getTrangThai());
        assertThrows(AppException.class, () -> service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(false).build()));
        verify(ledger, times(1)).taoGiaoDichLichHen(any(), eq(200000L), eq("HOAN_COC"), anyString(), any(), same(appointment));
    }
    @Test void anotherVisitsCancellationMustNotReopenRentedRoom() {
        room.setTrangThai(TrangThaiPhongTro.HOAN_THANH);
        service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(false).build());
        assertEquals(TrangThaiPhongTro.HOAN_THANH, room.getTrangThai());
        assertEquals(200000L, owner.getSoDu());
    }
    @Test void cannotCompleteSecondBookingForAlreadyRentedRoom() {
        appointment.setKhachHangDongY(true);
        room.setTrangThai(TrangThaiPhongTro.HOAN_THANH);
        assertEquals(ErrorCode.ROOM_UNAVAILABLE, assertThrows(AppException.class,
                () -> service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(true).build())).getErrorCode());
        verifyNoInteractions(ledger);
        assertEquals(0L, owner.getSoDu());
    }
    @Test void bothAgreePaysOnlyNetDepositAndCompletesRoom() {
        appointment.setKhachHangDongY(true);
        service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(true).build());
        assertEquals(180000L, owner.getSoDu());
        assertEquals(TrangThaiDatLich.HOAN_THANH, appointment.getTrangThai());
        assertEquals(TrangThaiPhongTro.HOAN_THANH, room.getTrangThai());
    }
    @Test void cannotDecideBeforeGuestReceivedDeposit() {
        appointment.setDaNhanLaiCoc(false);
        assertEquals(ErrorCode.DEPOSIT_NOT_REFUNDED_YET, assertThrows(AppException.class,
                () -> service.chuTroDuaRaQuyetDinh("booking", "owner", AppointmentDecisionRequest.builder().dongY(true).build())).getErrorCode());
        verifyNoInteractions(ledger);
    }
    @Test void confirmedVisitCanBeCancelledAndRefundIsNotRepeated() {
        var request = AppointmentCancelRequest.builder().liDoHuy("Bận đột xuất").build();
        service.huyLichHen("booking", "owner", request);
        assertEquals(200000L, owner.getSoDu());
        assertThrows(AppException.class, () -> service.huyLichHen("booking", "owner", request));
        assertEquals(200000L, owner.getSoDu());
    }
}
