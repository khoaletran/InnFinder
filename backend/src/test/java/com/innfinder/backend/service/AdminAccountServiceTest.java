package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.CreateAdminRequest;
import com.innfinder.backend.dto.response.UserResponseDTO;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAccountServiceTest {

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

    @InjectMocks
    private AdminService adminService;

    private NguoiDung currentAdmin;
    private NguoiDung secondAdmin;

    @BeforeEach
    void setUp() {
        currentAdmin = NguoiDung.builder()
                .maNguoiDung("ND010120260001")
                .tenDangNhap("admin_main")
                .hoVaTen("Quản trị viên Chính")
                .matKhau("$2a$10$encodedCurrentAdminPwd")
                .email("admin1@innfinder.vn")
                .sdt("0901234567")
                .vaiTro(VaiTro.QUAN_TRI)
                .chuTro(false)
                .trangThaiKhoa(false)
                .thoiGianMoTaiKhoan(LocalDate.now())
                .build();

        secondAdmin = NguoiDung.builder()
                .maNguoiDung("ND010120260002")
                .tenDangNhap("admin_ops")
                .hoVaTen("Quản trị viên Vận hành")
                .matKhau("$2a$10$encodedSecondAdminPwd")
                .email("admin2@innfinder.vn")
                .sdt("0907654321")
                .vaiTro(VaiTro.QUAN_TRI)
                .chuTro(false)
                .trangThaiKhoa(false)
                .thoiGianMoTaiKhoan(LocalDate.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of())
        );
    }

    @Test
    void createAdmin_createsNewAdminWithVerifiedCurrentPassword() {
        authenticateAs("admin_main");
        when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(currentAdmin));
        when(passwordEncoder.matches("AdminPass@123", currentAdmin.getMatKhau())).thenReturn(true);
        when(nguoiDungRepository.existsByTenDangNhap("admin_new")).thenReturn(false);
        when(nguoiDungRepository.existsByEmail("admin_new@innfinder.vn")).thenReturn(false);
        when(nguoiDungRepository.findMaxMaNguoiDungByPrefix(anyString())).thenReturn(null);
        when(nguoiDungRepository.existsById(anyString())).thenReturn(false);
        when(passwordEncoder.encode("NewAdmin@2026")).thenReturn("hashedNewPwd");
        when(nguoiDungRepository.save(any(NguoiDung.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateAdminRequest req = CreateAdminRequest.builder()
                .tenDangNhap("admin_new")
                .hoVaTen("Nguyễn Quản Trị")
                .email("admin_new@innfinder.vn")
                .sdt("0912345678")
                .matKhau("NewAdmin@2026")
                .matKhauAdminHienTai("AdminPass@123")
                .build();

        UserResponseDTO result = adminService.createAdmin(req);

        assertEquals("admin_new", result.getTenDangNhap());
        assertEquals(VaiTro.QUAN_TRI, result.getVaiTro());
        assertFalse(Boolean.TRUE.equals(result.getChuTro()));
        assertFalse(Boolean.TRUE.equals(result.getTrangThaiKhoa()));
        assertTrue(result.getMaNguoiDung().matches("^ND\\d{12}$"));
        verify(nguoiDungRepository).save(any(NguoiDung.class));
    }

    @Test
    void createAdmin_rejectsWrongCurrentAdminPassword() {
        authenticateAs("admin_main");
        when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(currentAdmin));
        when(passwordEncoder.matches("WrongPassword", currentAdmin.getMatKhau())).thenReturn(false);

        CreateAdminRequest req = CreateAdminRequest.builder()
                .tenDangNhap("admin_new")
                .hoVaTen("Nguyễn Quản Trị")
                .email("admin_new@innfinder.vn")
                .sdt("0912345678")
                .matKhau("NewAdmin@2026")
                .matKhauAdminHienTai("WrongPassword")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.createAdmin(req));
        assertEquals(ErrorCode.INVALID_CURRENT_PASSWORD, ex.getErrorCode());
        verify(nguoiDungRepository, never()).save(any());
    }

    @Test
    void createAdmin_rejectsDuplicateUsername() {
        authenticateAs("admin_main");
        when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(currentAdmin));
        when(passwordEncoder.matches("AdminPass@123", currentAdmin.getMatKhau())).thenReturn(true);
        when(nguoiDungRepository.existsByTenDangNhap("admin_ops")).thenReturn(true);

        CreateAdminRequest req = CreateAdminRequest.builder()
                .tenDangNhap("admin_ops")
                .hoVaTen("Quản trị trùng")
                .email("unique@innfinder.vn")
                .sdt("0912345678")
                .matKhau("NewAdmin@2026")
                .matKhauAdminHienTai("AdminPass@123")
                .build();

        AppException ex = assertThrows(AppException.class, () -> adminService.createAdmin(req));
        assertEquals(ErrorCode.USER_EXISTED, ex.getErrorCode());
        verify(nguoiDungRepository, never()).save(any());
    }

    @Test
    void toggleLockUser_blocksSelfLock() {
        authenticateAs("admin_main");
        when(nguoiDungRepository.findById("ND010120260001")).thenReturn(Optional.of(currentAdmin));
        when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(currentAdmin));

        AppException ex = assertThrows(AppException.class, () -> adminService.toggleLockUser("ND010120260001"));
        assertEquals(ErrorCode.CANNOT_LOCK_SELF, ex.getErrorCode());
        verify(nguoiDungRepository, never()).save(any());
    }

    @Test
    void toggleLockUser_blocksLockingLastActiveAdmin() {
        authenticateAs("admin_main");
        when(nguoiDungRepository.findById("ND010120260002")).thenReturn(Optional.of(secondAdmin));
        when(nguoiDungRepository.findByTenDangNhap("admin_main")).thenReturn(Optional.of(currentAdmin));
        when(nguoiDungRepository.countByVaiTroAndTrangThaiKhoaFalse(VaiTro.QUAN_TRI)).thenReturn(1L);

        AppException ex = assertThrows(AppException.class, () -> adminService.toggleLockUser("ND010120260002"));
        assertEquals(ErrorCode.CANNOT_LOCK_LAST_ADMIN, ex.getErrorCode());
        verify(nguoiDungRepository, never()).save(any());
    }
}
