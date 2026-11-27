package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.ComplaintRequestDTO;
import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.response.ComplaintResponseDTO;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.repository.PhieuKhieuNaiRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceTest {

    @Mock
    private PhieuKhieuNaiRepository phieuKhieuNaiRepository;

    @Mock
    private NguoiDungRepository nguoiDungRepository;

    @Mock
    private ChuTroRepository chuTroRepository;

    @Mock
    private PhongTroRepository phongTroRepository;

    @Mock
    private PhieuDatLichRepository phieuDatLichRepository;

    @Mock
    private GiaoDichRepository giaoDichRepository;

    @Mock
    private AppointmentService appointmentService;

    @InjectMocks
    private ComplaintService complaintService;

    private NguoiDung customer;
    private NguoiDung landlordUser;
    private NguoiDung adminUser;

    @BeforeEach
    void setUp() {
        customer = NguoiDung.builder()
                .maNguoiDung("ND010120260001")
                .tenDangNhap("khach_hang_1")
                .hoVaTen("Nguyễn Văn Khách")
                .build();

        landlordUser = NguoiDung.builder()
                .maNguoiDung("ND010120260002")
                .tenDangNhap("chu_tro_1")
                .hoVaTen("Trần Thị Chủ Trọ")
                .chuTro(true)
                .trangThaiKhoa(false)
                .build();

        adminUser = NguoiDung.builder()
                .maNguoiDung("ND010120260099")
                .tenDangNhap("admin")
                .hoVaTen("Quản trị viên")
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
    void createComplaint_findsTargetByUsername() {
        authenticateAs("khach_hang_1");
        when(nguoiDungRepository.findByTenDangNhap("khach_hang_1")).thenReturn(Optional.of(customer));
        when(nguoiDungRepository.findById("chu_tro_1")).thenReturn(Optional.empty());
        when(nguoiDungRepository.findByTenDangNhap("chu_tro_1")).thenReturn(Optional.of(landlordUser));
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ComplaintRequestDTO req = ComplaintRequestDTO.builder()
                .doiTuongKhieuNai("chu_tro_1")
                .vanDe("Chủ trọ không hoàn trả tiền cọc đúng hẹn")
                .build();

        ComplaintResponseDTO res = complaintService.createComplaint(req);

        assertEquals("ND010120260002", res.getDoiTuongKhieuNai());
        assertEquals("Trần Thị Chủ Trọ", res.getTenDoiTuongKhieuNai());
        assertEquals("Nguyễn Văn Khách", res.getTenNguoiGui());
        assertEquals(TrangThaiKhieuNai.CHO_DUYET, res.getTrangThai());
    }

    @Test
    void createComplaint_rejectsSelfComplaint() {
        authenticateAs("khach_hang_1");
        when(nguoiDungRepository.findByTenDangNhap("khach_hang_1")).thenReturn(Optional.of(customer));
        when(nguoiDungRepository.findById("ND010120260001")).thenReturn(Optional.of(customer));

        ComplaintRequestDTO req = ComplaintRequestDTO.builder()
                .doiTuongKhieuNai("ND010120260001")
                .vanDe("Tự gửi khiếu nại chính mình để kiểm thử")
                .build();

        AppException ex = assertThrows(AppException.class, () -> complaintService.createComplaint(req));
        assertEquals(ErrorCode.CANNOT_COMPLAINT_SELF, ex.getErrorCode());
        verify(phieuKhieuNaiRepository, never()).save(any());
    }

    @Test
    void resolveComplaint_doesNotApplySanctionWhileInProgress() {
        authenticateAs("admin");
        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN001")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Khiếu nại thử nghiệm")
                .build();

        when(phieuKhieuNaiRepository.findById("KN001")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DANG_XU_LY)
                .mucDoViPham(MucDoViPham.TRUNG_BINH)
                .ketQua("Đang liên hệ hai bên để xác minh")
                .build();

        ComplaintResponseDTO res = complaintService.resolveComplaint("KN001", req);

        assertEquals(TrangThaiKhieuNai.DANG_XU_LY, res.getTrangThai());
        verify(chuTroRepository, never()).findById(any());
        verify(nguoiDungRepository, never()).save(any());
    }

    @Test
    void resolveComplaint_deductsReputationOnceOnResolvedAndBlocksReResolve() {
        authenticateAs("admin");
        ChuTro chuTro = ChuTro.builder()
                .maChuTro("ND010120260002")
                .nguoiDung(landlordUser)
                .diemUyTin(100)
                .soDu(0L)
                .build();
        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN002")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.DANG_XU_LY)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Thông tin phòng sai lệch")
                .build();

        when(phieuKhieuNaiRepository.findById("KN002")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(chuTroRepository.findById("ND010120260002")).thenReturn(Optional.of(chuTro));
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DA_XU_LI)
                .mucDoViPham(MucDoViPham.TRUNG_BINH)
                .ketQua("Xác nhận sai phạm, trừ 10 điểm uy tín")
                .build();

        ComplaintResponseDTO res = complaintService.resolveComplaint("KN002", req);
        assertEquals(TrangThaiKhieuNai.DA_XU_LI, res.getTrangThai());
        assertEquals(90, chuTro.getDiemUyTin());
        verify(chuTroRepository, times(1)).save(chuTro);

        AppException ex = assertThrows(AppException.class, () -> complaintService.resolveComplaint("KN002", req));
        assertEquals(ErrorCode.COMPLAINT_ALREADY_RESOLVED, ex.getErrorCode());
        assertEquals(90, chuTro.getDiemUyTin());
    }

    @Test
    void resolveComplaint_severeLocksAccountAndHidesActiveRooms() {
        authenticateAs("admin");
        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN003")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Có dấu hiệu lừa đảo chiếm đoạt cọc")
                .build();

        PhongTro approvedRoom = PhongTro.builder().maPhongTro("PT01").trangThai(TrangThaiPhongTro.DA_DUYET).build();
        PhongTro pendingRoom = PhongTro.builder().maPhongTro("PT02").trangThai(TrangThaiPhongTro.CHO_DUYET).build();
        PhongTro completedRoom = PhongTro.builder().maPhongTro("PT03").trangThai(TrangThaiPhongTro.HOAN_THANH).build();

        when(phieuKhieuNaiRepository.findById("KN003")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(phongTroRepository.findByChuPhongTro_MaChuTro("ND010120260002"))
                .thenReturn(List.of(approvedRoom, pendingRoom, completedRoom));
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DA_XU_LI)
                .mucDoViPham(MucDoViPham.NANG)
                .ketQua("Khóa tài khoản vĩnh viễn và gỡ toàn bộ tin đăng")
                .build();

        complaintService.resolveComplaint("KN003", req);

        assertTrue(Boolean.TRUE.equals(landlordUser.getTrangThaiKhoa()));
        assertEquals(TrangThaiPhongTro.HUY, approvedRoom.getTrangThai());
        assertEquals(TrangThaiPhongTro.HUY, pendingRoom.getTrangThai());
        assertEquals(TrangThaiPhongTro.HOAN_THANH, completedRoom.getTrangThai());
        verify(nguoiDungRepository).save(landlordUser);
        verify(phongTroRepository).saveAll(List.of(approvedRoom, pendingRoom));
    }

    @Test
    void resolveComplaint_refundsDepositToCustomerWhenEligible() {
        authenticateAs("admin");
        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN004")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Chủ trọ không đến dẫn xem phòng như đã hẹn")
                .build();

        ChuTro chuTro = ChuTro.builder().maChuTro("ND010120260002").nguoiDung(landlordUser).build();
        PhongTro room = PhongTro.builder().maPhongTro("PT10").chuPhongTro(chuTro).build();
        PhieuDatLich phieu = PhieuDatLich.builder()
                .maDatLich("DL001")
                .khachHang(customer)
                .phongTro(room)
                .coc(200_000L)
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .daNhanLaiCoc(false)
                .build();

        when(phieuKhieuNaiRepository.findById("KN004")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(phieuDatLichRepository.findByIdForUpdate("DL001")).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich("ND010120260001", "DL001")).thenReturn(true);
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DA_XU_LI)
                .mucDoViPham(MucDoViPham.NHE)
                .ketQua("Chủ trọ vắng mặt, hoàn cọc 100% cho khách hàng")
                .hoanCoc(true)
                .maDatLichHoanCoc("DL001")
                .build();

        complaintService.resolveComplaint("KN004", req);

        assertEquals(TrangThaiDatLich.HUY, phieu.getTrangThai());
        assertTrue(phieu.getLiDoHuy().contains("KN004"));
        verify(phieuDatLichRepository).save(phieu);
        verify(appointmentService).taoGiaoDichHoanCocChoKhach(eq(phieu), contains("KN004"), isNull());
    }

    @Test
    void resolveComplaint_rejectsRefundWhenCustomerAlreadyReceivedDepositInPerson() {
        authenticateAs("admin");
        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN005")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Tranh chấp cọc")
                .build();

        ChuTro chuTro = ChuTro.builder().maChuTro("ND010120260002").nguoiDung(landlordUser).build();
        PhongTro room = PhongTro.builder().maPhongTro("PT11").chuPhongTro(chuTro).build();
        PhieuDatLich phieu = PhieuDatLich.builder()
                .maDatLich("DL002")
                .khachHang(customer)
                .phongTro(room)
                .coc(200_000L)
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .daNhanLaiCoc(true)
                .build();

        when(phieuKhieuNaiRepository.findById("KN005")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(phieuDatLichRepository.findByIdForUpdate("DL002")).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich("ND010120260001", "DL002")).thenReturn(true);

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DA_XU_LI)
                .mucDoViPham(MucDoViPham.NHE)
                .ketQua("Thử hoàn cọc trùng")
                .hoanCoc(true)
                .maDatLichHoanCoc("DL002")
                .build();

        AppException ex = assertThrows(AppException.class, () -> complaintService.resolveComplaint("KN005", req));
        assertEquals(ErrorCode.INVALID_APPOINTMENT_STATUS, ex.getErrorCode());
        verifyNoInteractions(appointmentService);
    }

    @Test
    void resolveComplaint_delegatesToReputationServiceWhenPresent() {
        authenticateAs("admin");
        ReputationService repMock = mock(ReputationService.class);
        org.springframework.test.util.ReflectionTestUtils.setField(complaintService, "reputationService", repMock);

        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai("KN006")
                .nguoiGui(customer)
                .doiTuongKhieuNai(landlordUser)
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoViPham(MucDoViPham.NHE)
                .vanDe("Tin đăng sai thực tế")
                .build();

        when(phieuKhieuNaiRepository.findById("KN006")).thenReturn(Optional.of(kn));
        when(nguoiDungRepository.findByTenDangNhap("admin")).thenReturn(Optional.of(adminUser));
        when(phieuKhieuNaiRepository.save(any(PhieuKhieuNai.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplaintResolveDTO req = ComplaintResolveDTO.builder()
                .trangThai(TrangThaiKhieuNai.DA_XU_LI)
                .mucDoViPham(MucDoViPham.TRUNG_BINH)
                .ketQua("Tạm ẩn 7 ngày và trừ 10 điểm")
                .build();

        complaintService.resolveComplaint("KN006", req);
        verify(repMock).penalizeMediumComplaint("ND010120260002", "KN006");
    }
}
