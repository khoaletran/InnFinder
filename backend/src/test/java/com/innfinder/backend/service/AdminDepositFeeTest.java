package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.UpdateDepositFeeRequest;
import com.innfinder.backend.entity.Coc;
import com.innfinder.backend.entity.LichSuBieuPhi;
import com.innfinder.backend.entity.LoaiPhongTro;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhiThu;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDepositFeeTest {

    @Mock private PhongTroRepository phongTroRepository;
    @Mock private NguoiDungRepository nguoiDungRepository;
    @Mock private PhieuDatLichRepository phieuDatLichRepository;
    @Mock private YeuCauChuTroRepository yeuCauChuTroRepository;
    @Mock private ChuTroRepository chuTroRepository;
    @Mock private TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    @Mock private GiaoDichRepository giaoDichRepository;
    @Mock private LoaiPhongTroRepository loaiPhongTroRepository;
    @Mock private CocRepository cocRepository;
    @Mock private PhiThuRepository phiThuRepository;
    @Mock private TienIchRepository tienIchRepository;
    @Mock private TransactionService transactionService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EntityManager entityManager;
    @Mock private LichSuBieuPhiRepository lichSuBieuPhiRepository;

    @InjectMocks
    private AdminService adminService;

    private NguoiDung adminUser;
    private LoaiPhongTro lpt;
    private Coc coc;
    private PhiThu phiThu;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(adminService, "lichSuBieuPhiRepository", lichSuBieuPhiRepository);

        adminUser = NguoiDung.builder()
                .maNguoiDung("ND010120260001")
                .tenDangNhap("admin_main")
                .hoVaTen("Quản trị viên")
                .matKhau("$2a$10$hash")
                .vaiTro(VaiTro.QUAN_TRI)
                .build();

        lpt = LoaiPhongTro.builder()
                .maLpt("LPT002")
                .tenLoaiPhongTro("Phòng trọ khép kín")
                .build();

        coc = Coc.builder()
                .maCoc("COC002")
                .soTienCoc(200_000)
                .loaiPhong(lpt)
                .build();

        phiThu = PhiThu.builder()
                .maPhiThu("PT002")
                .coc(coc)
                .phi(20_000)
                .build();

        coc.setPhiThu(phiThu);
        lpt.setCoc(coc);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_main", null, List.of())
        );

        lenient().when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(adminUser));
        lenient().when(passwordEncoder.matches("Admin@123", "$2a$10$hash")).thenReturn(true);
        lenient().when(loaiPhongTroRepository.findByIdForUpdate("LPT002")).thenReturn(Optional.of(lpt));
        lenient().when(cocRepository.save(any(Coc.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(phiThuRepository.save(any(PhiThu.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(lichSuBieuPhiRepository.save(any(LichSuBieuPhi.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateDepositFee_succeedsLocksRowAndWritesAuditLog() {
        UpdateDepositFeeRequest req = UpdateDepositFeeRequest.builder()
                .soTienCoc(250_000)
                .phiThu(30_000)
                .lyDo("Điều chỉnh theo mức phí vận hành quý mới")
                .matKhauAdmin("Admin@123")
                .build();

        var res = adminService.updateDepositFee("LPT002", req);

        assertEquals(250_000, res.getSoTienCoc());
        assertEquals(30_000, res.getPhiThu());
        assertEquals(220_000, res.getThucNhanChuTro());
        assertEquals(12.0, res.getTyLePhiPercent());
        verify(loaiPhongTroRepository).findByIdForUpdate("LPT002");

        ArgumentCaptor<LichSuBieuPhi> auditCaptor = ArgumentCaptor.forClass(LichSuBieuPhi.class);
        verify(lichSuBieuPhiRepository).save(auditCaptor.capture());
        assertEquals(200_000, auditCaptor.getValue().getCocCu());
        assertEquals(250_000, auditCaptor.getValue().getCocMoi());
        assertEquals(20_000, auditCaptor.getValue().getPhiCu());
        assertEquals(30_000, auditCaptor.getValue().getPhiMoi());
        assertTrue(auditCaptor.getValue().getNguoiSua().contains("admin_main"));
    }

    @Test
    void updateDepositFee_rejectsWrongAdminPassword() {
        when(passwordEncoder.matches("WrongPass", "$2a$10$hash")).thenReturn(false);
        UpdateDepositFeeRequest req = UpdateDepositFeeRequest.builder()
                .soTienCoc(250_000)
                .phiThu(30_000)
                .lyDo("Điều chỉnh giá")
                .matKhauAdmin("WrongPass")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", req));
        assertEquals(ErrorCode.INVALID_CURRENT_PASSWORD, ex.getErrorCode());
        verify(cocRepository, never()).save(any());
        verify(lichSuBieuPhiRepository, never()).save(any());
    }

    @Test
    void updateDepositFee_rejectsCommissionAboveThirtyPercent() {
        UpdateDepositFeeRequest req = UpdateDepositFeeRequest.builder()
                .soTienCoc(200_000)
                .phiThu(70_000) // 35% > 30%
                .lyDo("Thử tăng phí vượt trần")
                .matKhauAdmin("Admin@123")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", req));
        assertEquals(ErrorCode.COMMISSION_RATE_EXCEEDED, ex.getErrorCode());
    }

    @Test
    void updateDepositFee_rejectsNonThousandStep() {
        UpdateDepositFeeRequest req = UpdateDepositFeeRequest.builder()
                .soTienCoc(200_500)
                .phiThu(20_000)
                .lyDo("Thử nhập số lẻ 500đ")
                .matKhauAdmin("Admin@123")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", req));
        assertEquals(ErrorCode.DEPOSIT_AMOUNT_STEP_INVALID, ex.getErrorCode());
    }

    @Test
    void updateDepositFee_rejectsUnchangedFee() {
        UpdateDepositFeeRequest req = UpdateDepositFeeRequest.builder()
                .soTienCoc(200_000)
                .phiThu(20_000)
                .lyDo("Không thay đổi giá")
                .matKhauAdmin("Admin@123")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", req));
        assertEquals(ErrorCode.DEPOSIT_FEE_UNCHANGED, ex.getErrorCode());
    }

    @Test
    void updateDepositFee_rejectsOutOfRangeDeposit() {
        UpdateDepositFeeRequest tooLow = UpdateDepositFeeRequest.builder()
                .soTienCoc(30_000)
                .phiThu(5_000)
                .lyDo("Thử cọc quá thấp")
                .matKhauAdmin("Admin@123")
                .build();
        assertEquals(ErrorCode.INVALID_DEPOSIT_FEE,
                assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", tooLow)).getErrorCode());

        UpdateDepositFeeRequest tooHigh = UpdateDepositFeeRequest.builder()
                .soTienCoc(2_500_000)
                .phiThu(100_000)
                .lyDo("Thử cọc quá cao")
                .matKhauAdmin("Admin@123")
                .build();
        assertEquals(ErrorCode.INVALID_DEPOSIT_FEE,
                assertThrows(AppException.class, () -> adminService.updateDepositFee("LPT002", tooHigh)).getErrorCode());
    }
}
