package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.AdminReputationAdjustRequest;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReputationServiceTest {

    @Mock private ChuTroRepository chuTroRepository;
    @Mock private NguoiDungRepository nguoiDungRepository;
    @Mock private PhongTroRepository phongTroRepository;
    @Mock private PhieuDatLichRepository phieuDatLichRepository;
    @Mock private GiaoDichRepository giaoDichRepository;
    @Mock private TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    @Mock private TransactionService transactionService;
    @Mock private LichSuDiemUyTinRepository lichSuDiemUyTinRepository;

    @InjectMocks
    private ReputationService reputationService;

    private NguoiDung landlordUser;
    private ChuTro chuTro;

    @BeforeEach
    void setUp() {
        landlordUser = NguoiDung.builder()
                .maNguoiDung("ND010120260010")
                .tenDangNhap("landlord_test")
                .hoVaTen("Chủ Trọ Test")
                .chuTro(true)
                .trangThaiKhoa(false)
                .build();

        chuTro = ChuTro.builder()
                .maChuTro("ND010120260010")
                .nguoiDung(landlordUser)
                .diemUyTin(100)
                .soDu(0L)
                .build();

        lenient().when(chuTroRepository.findByIdForUpdate("ND010120260010")).thenReturn(Optional.of(chuTro));
        lenient().when(chuTroRepository.save(any(ChuTro.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(lichSuDiemUyTinRepository.save(any(LichSuDiemUyTin.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void penalizeOverdueResponse_deductsThreePoints() {
        reputationService.penalizeOverdueResponse("ND010120260010", "DL001");
        assertEquals(97, chuTro.getDiemUyTin());

        ArgumentCaptor<LichSuDiemUyTin> captor = ArgumentCaptor.forClass(LichSuDiemUyTin.class);
        verify(lichSuDiemUyTinRepository).save(captor.capture());
        assertEquals(-3, captor.getValue().getBienDong());
        assertEquals(ReputationService.EVENT_OVERDUE_RESPONSE, captor.getValue().getLoaiSuKien());
    }

    @Test
    void penalizeCancelConfirmedAppointment_deductsFivePoints() {
        reputationService.penalizeCancelConfirmedAppointment("ND010120260010", "DL002");
        assertEquals(95, chuTro.getDiemUyTin());
    }

    @Test
    void penalizeLandlordNoShow_onlyTempHidesAfterMoreThanTwoTimesIn30Days() {
        when(lichSuDiemUyTinRepository.countByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
                eq("ND010120260010"), eq(ReputationService.EVENT_LANDLORD_NO_SHOW), any(LocalDateTime.class)))
                .thenReturn(2L)
                .thenReturn(3L);

        // Lần thứ 2 (<= 2): trừ 10 điểm, chưa tạm ẩn
        reputationService.penalizeLandlordNoShow("ND010120260010", "DL003");
        assertEquals(90, chuTro.getDiemUyTin());
        assertNull(chuTro.getTamAnDen());

        // Lần thứ 3 (> 2): trừ tiếp 10 điểm & tạm ẩn 7 ngày
        reputationService.penalizeLandlordNoShow("ND010120260010", "DL004");
        assertEquals(80, chuTro.getDiemUyTin());
        assertNotNull(chuTro.getTamAnDen());
        assertTrue(chuTro.getTamAnDen().isAfter(LocalDateTime.now().plusDays(6)));
    }

    @Test
    void mildComplaintWarning_stacksMinusFiveOnEveryThirdWarning() {
        when(lichSuDiemUyTinRepository.countByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
                eq("ND010120260010"), eq(ReputationService.EVENT_MILD_WARNING), any(LocalDateTime.class)))
                .thenReturn(1L, 2L, 3L);

        reputationService.recordMildComplaintWarning("ND010120260010", "KN1");
        assertEquals(100, chuTro.getDiemUyTin());

        reputationService.recordMildComplaintWarning("ND010120260010", "KN2");
        assertEquals(100, chuTro.getDiemUyTin());

        reputationService.recordMildComplaintWarning("ND010120260010", "KN3");
        assertEquals(95, chuTro.getDiemUyTin());
    }

    @Test
    void mediumComplaint_deductsTenAndStacksSevenDaysTempHide() {
        chuTro.setTamAnDen(LocalDateTime.now().plusDays(3));
        reputationService.penalizeMediumComplaint("ND010120260010", "KN_MED");

        assertEquals(90, chuTro.getDiemUyTin());
        assertNotNull(chuTro.getTamAnDen());
        // Phải cộng dồn từ mốc cũ (+3 + 7 = ~10 ngày)
        assertTrue(chuTro.getTamAnDen().isAfter(LocalDateTime.now().plusDays(9)));
    }

    @Test
    void droppingBelowFifty_triggersTempHideSevenDays() {
        chuTro.setDiemUyTin(52);
        reputationService.penalizeCancelConfirmedAppointment("ND010120260010", "DL010");

        assertEquals(47, chuTro.getDiemUyTin());
        assertNotNull(chuTro.getTamAnDen());
        assertTrue(chuTro.isDangTamAn());
    }

    @Test
    void droppingBelowThirty_autoLocksAccountHidesRoomsAndRefundsOpenAppointments() {
        chuTro.setDiemUyTin(35);

        PhongTro approved = PhongTro.builder().maPhongTro("PT01").trangThai(TrangThaiPhongTro.DA_DUYET).build();
        PhongTro pending = PhongTro.builder().maPhongTro("PT02").trangThai(TrangThaiPhongTro.CHO_DUYET).build();
        when(phongTroRepository.findByChuPhongTro_MaChuTro("ND010120260010")).thenReturn(List.of(approved, pending));

        NguoiDung customer = NguoiDung.builder().maNguoiDung("ND01").hoVaTen("Khách A").build();
        PhieuDatLich openBooking = PhieuDatLich.builder()
                .maDatLich("DL_OPEN")
                .khachHang(customer)
                .coc(200_000L)
                .daNhanLaiCoc(false)
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .build();
        when(phieuDatLichRepository.findByPhongTro_ChuPhongTro_MaChuTroAndTrangThaiIn(
                eq("ND010120260010"), anyList())).thenReturn(List.of(openBooking));
        when(giaoDichRepository.existsDepositByMaDatLich("ND01", "DL_OPEN")).thenReturn(true);
        when(taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung("ND01")).thenReturn(List.of());

        reputationService.penalizeLandlordNoShow("ND010120260010", "DL020");

        assertEquals(25, chuTro.getDiemUyTin());
        assertTrue(Boolean.TRUE.equals(landlordUser.getTrangThaiKhoa()));
        assertEquals(TrangThaiPhongTro.HUY, approved.getTrangThai());
        assertEquals(TrangThaiPhongTro.HUY, pending.getTrangThai());
        assertEquals(TrangThaiDatLich.HUY, openBooking.getTrangThai());
        verify(transactionService).taoGiaoDichLichHen(
                eq(customer), eq(200_000L), eq("HOAN_COC"), anyString(), eq(TrangThaiGD.CHO_THANH_TOAN), eq(openBooking)
        );
    }

    @Test
    void rewards_completedRentalAndReviewsRespectCaps() {
        chuTro.setDiemUyTin(88);
        reputationService.rewardCompletedRental("ND010120260010", "DL_DONE");
        assertEquals(91, chuTro.getDiemUyTin());

        // Đã cộng 9 điểm từ đánh giá trong 30 ngày -> chỉ được cộng thêm tối đa 1 điểm nữa (trần 10)
        when(lichSuDiemUyTinRepository.sumBienDongSince(
                eq("ND010120260010"), eq(ReputationService.EVENT_REWARD_REVIEW), any(LocalDateTime.class)))
                .thenReturn(9);
        reputationService.rewardNewReview("ND010120260010", "DG_01", 5);
        assertEquals(92, chuTro.getDiemUyTin());
    }

    @Test
    void cleanStreak_rewardsFivePointsWhenNoViolationAndActiveIn30Days() {
        chuTro.setDiemUyTin(80);
        when(chuTroRepository.findEligibleForCleanStreak()).thenReturn(List.of(chuTro));
        when(lichSuDiemUyTinRepository.existsByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
                eq("ND010120260010"), eq(ReputationService.EVENT_REWARD_CLEAN_STREAK), any(LocalDateTime.class)))
                .thenReturn(false);
        when(lichSuDiemUyTinRepository.hasViolationSince(eq("ND010120260010"), any(LocalDateTime.class)))
                .thenReturn(false);
        when(phieuDatLichRepository.existsRecentValidAppointment(
                eq("ND010120260010"), anyList(), any(LocalDateTime.class)))
                .thenReturn(true);

        reputationService.processMonthlyCleanStreaks();
        assertEquals(85, chuTro.getDiemUyTin());
    }

    @Test
    void adminUnlockAndAdjust_restoresAndClearsTempHide() {
        chuTro.setDiemUyTin(20);
        chuTro.setTamAnDen(LocalDateTime.now().plusDays(5));

        reputationService.restoreOnAdminUnlock(landlordUser, "admin_main");
        assertEquals(50, chuTro.getDiemUyTin());
        assertNull(chuTro.getTamAnDen());

        when(lichSuDiemUyTinRepository.findTop50ByChuTro_MaChuTroOrderByThoiGianDesc("ND010120260010"))
                .thenReturn(List.of());
        var summary = reputationService.adjustByAdmin(
                "ND010120260010",
                AdminReputationAdjustRequest.builder().diemMoi(75).lyDo("Giải oan").goTamAn(true).build(),
                "admin_main"
        );
        assertEquals(75, summary.getDiemUyTin());
        assertFalse(summary.isDangTamAn());
    }
}
