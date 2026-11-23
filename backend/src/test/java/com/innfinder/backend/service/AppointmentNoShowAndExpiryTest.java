package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentDecisionRequest;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.webhook.SePayWebhookPayload;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentNoShowAndExpiryTest {

    @Mock private PhieuDatLichRepository phieuDatLichRepository;
    @Mock private NguoiDungRepository nguoiDungRepository;
    @Mock private PhongTroRepository phongTroRepository;
    @Mock private ChuTroRepository chuTroRepository;
    @Mock private TransactionService transactionService;
    @Mock private GiaoDichRepository giaoDichRepository;
    @Mock private TaiKhoanNganHangRepository taiKhoanNganHangRepository;

    // For AdminService
    @Mock private YeuCauChuTroRepository yeuCauChuTroRepository;
    @Mock private LoaiPhongTroRepository loaiPhongTroRepository;
    @Mock private CocRepository cocRepository;
    @Mock private PhiThuRepository phiThuRepository;
    @Mock private TienIchRepository tienIchRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EntityManager entityManager;

    private AppointmentService appointmentService;
    private AdminService adminService;
    private BankingWebhookService bankingWebhookService;

    private NguoiDung khachHang;
    private NguoiDung chuTroUser;
    private ChuTro chuTro;
    private PhongTro phongTro;
    private PhieuDatLich phieu;

    @BeforeEach
    void setUp() {
        appointmentService = new AppointmentService(
                phieuDatLichRepository,
                nguoiDungRepository,
                phongTroRepository,
                chuTroRepository,
                transactionService,
                giaoDichRepository,
                taiKhoanNganHangRepository
        );

        adminService = new AdminService(
                phongTroRepository,
                nguoiDungRepository,
                phieuDatLichRepository,
                yeuCauChuTroRepository,
                chuTroRepository,
                taiKhoanNganHangRepository,
                giaoDichRepository,
                loaiPhongTroRepository,
                cocRepository,
                phiThuRepository,
                tienIchRepository,
                transactionService,
                passwordEncoder,
                entityManager
        );

        bankingWebhookService = new BankingWebhookService(
                phieuDatLichRepository,
                giaoDichRepository,
                transactionService
        );

        khachHang = NguoiDung.builder()
                .maNguoiDung("ND202611220001")
                .tenDangNhap("khach_hang")
                .hoVaTen("Nguyen Van Khach")
                .build();

        chuTroUser = NguoiDung.builder()
                .maNguoiDung("ND202611220002")
                .tenDangNhap("chu_tro")
                .hoVaTen("Tran Van Chu")
                .build();

        chuTro = ChuTro.builder()
                .maChuTro(chuTroUser.getMaNguoiDung())
                .nguoiDung(chuTroUser)
                .soDu(100_000L)
                .diemUyTin(100)
                .build();

        phongTro = PhongTro.builder()
                .maPhongTro("PT01")
                .moTa("Phòng trọ cao cấp")
                .chuPhongTro(chuTro)
                .trangThai(TrangThaiPhongTro.DA_DUYET)
                .build();

        phieu = PhieuDatLich.builder()
                .maDatLich("DL20261123001")
                .khachHang(khachHang)
                .phongTro(phongTro)
                .thoiGianDat(LocalDateTime.now())
                .ngayHen(LocalDateTime.now().plusDays(2))
                .trangThai(TrangThaiDatLich.CHO_XAC_NHAN)
                .coc(200_000L)
                .daNhanLaiCoc(false)
                .build();
    }

    // =========================================================================
    // TRƯỜNG HỢP 1: TỰ ĐỘNG HỦY KHI CHỦ TRỌ NGÂM ĐƠN QUÁ 24 GIỜ
    // =========================================================================
    @Test
    @DisplayName("TH1: Tự động hủy và hoàn cọc khi phiếu ở CHO_XAC_NHAN quá 24h")
    void testTuDongHuy_KhiChoXacNhanQua24h() {
        // Đặt thời gian gửi là 25 tiếng trước
        phieu.setThoiGianDat(LocalDateTime.now().minusHours(25));
        phieu.setNgayHen(LocalDateTime.now().plusDays(3));

        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));
        when(giaoDichRepository.existsDepositByMaDatLich(eq(khachHang.getMaNguoiDung()), eq(phieu.getMaDatLich()))).thenReturn(true);

        PhieuDatLich result = appointmentService.kiemTraVaTuDongHuyQuaHan(phieu);

        assertEquals(TrangThaiDatLich.HUY, result.getTrangThai());
        assertTrue(result.getLiDoHuy().contains("quá hạn phản hồi"));

        // Xác nhận đã tạo lệnh hoàn cọc 100% với trạng thái CHO_THANH_TOAN
        verify(transactionService).taoGiaoDich(
                eq(khachHang),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Tự động hoàn cọc do quá hạn phản hồi"),
                eq(TrangThaiGD.CHO_THANH_TOAN)
        );
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: TỰ ĐỘNG HỦY KHI SÁT GIỜ HẸN DƯỚI 2 TIẾNG MÀ CHƯA DUYỆT
    // =========================================================================
    @Test
    @DisplayName("TH2: Tự động hủy khi còn dưới 2 tiếng trước giờ hẹn mà Chủ trọ chưa duyệt")
    void testTuDongHuy_KhiSatGioHenDuoi2h() {
        // Đặt thời gian tạo là 3 tiếng trước, giờ hẹn là 1 tiếng sau (cách giờ hẹn < 2 tiếng)
        phieu.setThoiGianDat(LocalDateTime.now().minusHours(3));
        phieu.setNgayHen(LocalDateTime.now().plusHours(1));

        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));
        when(giaoDichRepository.existsDepositByMaDatLich(eq(khachHang.getMaNguoiDung()), eq(phieu.getMaDatLich()))).thenReturn(true);

        PhieuDatLich result = appointmentService.kiemTraVaTuDongHuyQuaHan(phieu);

        assertEquals(TrangThaiDatLich.HUY, result.getTrangThai());
        assertTrue(result.getLiDoHuy().contains("quá hạn phản hồi"));
    }

    // =========================================================================
    // TRƯỜNG HỢP 3: PHIẾU HỢP LỆ TRONG HẠN THÌ KHÔNG BỊ TỰ ĐỘNG HỦY
    // =========================================================================
    @Test
    @DisplayName("TH3: Phiếu CHO_XAC_NHAN hợp lệ (chưa quá 24h và cách giờ hẹn > 2h) thì GIỮ NGUYÊN")
    void testKhongHuy_KhiPhieuHopLe() {
        phieu.setThoiGianDat(LocalDateTime.now().minusHours(2));
        phieu.setNgayHen(LocalDateTime.now().plusHours(10));

        PhieuDatLich result = appointmentService.kiemTraVaTuDongHuyQuaHan(phieu);

        assertEquals(TrangThaiDatLich.CHO_XAC_NHAN, result.getTrangThai());
        verify(phieuDatLichRepository, never()).save(any());
        verify(transactionService, never()).taoGiaoDich(any(), any(), any(), any(), any());
    }

    // =========================================================================
    // TRƯỜNG HỢP 4: KHÁCH HÀNG BÁO CHỦ TRỌ NO-SHOW TRƯỚC 30 PHÚT -> TỪ CHỐI
    // =========================================================================
    @Test
    @DisplayName("TH4: Khách hàng báo Chủ trọ No-show trước 30 phút giờ hẹn -> Ném lỗi NO_SHOW_TOO_EARLY")
    void testKhachBaoNoShow_Truoc30Phut_ThatBai() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        // Mới quá giờ hẹn 10 phút (< 30 phút)
        phieu.setNgayHen(LocalDateTime.now().minusMinutes(10));

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findById(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.khachBaoCaoNoShow(phieu.getMaDatLich(), "khach_hang")
        );

        assertEquals(ErrorCode.NO_SHOW_TOO_EARLY, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 5: KHÁCH HÀNG BÁO CHỦ TRỌ NO-SHOW HỢP LỆ (QUÁ 30 PHÚT)
    // =========================================================================
    @Test
    @DisplayName("TH5: Khách hàng báo Chủ trọ No-show sau 30 phút -> Hủy, phạt uy tín Chủ trọ, hoàn cọc khách")
    void testKhachBaoNoShow_Sau30Phut_ThanhCong() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        // Đã quá giờ hẹn 35 phút
        phieu.setNgayHen(LocalDateTime.now().minusMinutes(35));
        chuTro.setDiemUyTin(100);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findById(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));
        when(giaoDichRepository.existsDepositByMaDatLich(eq(khachHang.getMaNguoiDung()), eq(phieu.getMaDatLich()))).thenReturn(true);

        appointmentService.khachBaoCaoNoShow(phieu.getMaDatLich(), "khach_hang");

        // 1. Phiếu chuyển HUY
        assertEquals(TrangThaiDatLich.HUY, phieu.getTrangThai());
        assertTrue(phieu.getLiDoHuy().contains("Khách báo chủ trọ vắng mặt"));

        // 2. Chủ trọ bị phạt trừ 10 điểm uy tín (từ 100 xuống 90)
        ArgumentCaptor<ChuTro> chuTroCaptor = ArgumentCaptor.forClass(ChuTro.class);
        verify(chuTroRepository).save(chuTroCaptor.capture());
        assertEquals(90, chuTroCaptor.getValue().getDiemUyTin());

        // 3. Lệnh hoàn cọc 100% được lập cho khách
        verify(transactionService).taoGiaoDich(
                eq(khachHang),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Hoàn cọc do chủ trọ vắng mặt"),
                eq(TrangThaiGD.CHO_THANH_TOAN)
        );
    }

    // =========================================================================
    // TRƯỜNG HỢP 6: CHỦ TRỌ BÁO KHÁCH NO-SHOW -> ĐÓNG BĂNG CỌC 24H (KHÔNG CỘNG VÍ NGAY)
    // =========================================================================
    @Test
    @DisplayName("TH6: Chủ trọ báo khách No-show -> Đóng băng cọc CHO_THANH_TOAN, KHÔNG cộng ví tức thì")
    void testChuTroBaoNoShow_DongBangCoc24h() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setNgayHen(LocalDateTime.now().minusMinutes(35));
        chuTro.setSoDu(100_000L); // Số dư ban đầu

        when(nguoiDungRepository.findByTenDangNhap("chu_tro")).thenReturn(Optional.of(chuTroUser));
        when(phieuDatLichRepository.findById(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));
        when(giaoDichRepository.existsDepositByMaDatLich(eq(khachHang.getMaNguoiDung()), eq(phieu.getMaDatLich()))).thenReturn(true);

        appointmentService.baoCaoNoShow(phieu.getMaDatLich(), "chu_tro");

        // 1. Trạng thái phiếu sang HUY
        assertEquals(TrangThaiDatLich.HUY, phieu.getTrangThai());
        assertTrue(phieu.getLiDoHuy().contains("Chờ đối soát 24h để bồi thường cọc"));

        // 2. KHÔNG cộng tiền ngay vào ví Chủ trọ (Bảo vệ khách khỏi bị vu oan)
        verify(chuTroRepository, never()).save(any());
        assertEquals(100_000L, chuTro.getSoDu());

        // 3. Tiền cọc được tạo giao dịch đóng băng CHO_THANH_TOAN
        verify(transactionService).taoGiaoDich(
                eq(chuTroUser),
                eq(200_000L),
                eq("BOI_THUONG_NO_SHOW"),
                contains("Bồi thường tiền cọc (chờ đối soát 24h)"),
                eq(TrangThaiGD.CHO_THANH_TOAN)
        );
    }

    // =========================================================================
    // TRƯỜNG HỢP 7: ADMIN PHÊ DUYỆT LỆNH BOI_THUONG_NO_SHOW SAU 24H ĐỐI SOÁT
    // =========================================================================
    @Test
    @DisplayName("TH7: Admin duyệt lệnh BOI_THUONG_NO_SHOW -> Tiền được giải ngân cộng vào ví Chủ trọ")
    void testAdminDuyet_BoiThuongNoShow_CongTienViChuTro() {
        GiaoDich gd = GiaoDich.builder()
                .maGiaoDich("GD20261123001")
                .nguoiDung(chuTroUser)
                .soTien(200_000L)
                .loaiGiaoDich("BOI_THUONG_NO_SHOW")
                .trangThai(TrangThaiGD.CHO_THANH_TOAN)
                .ngayGiaoDich(LocalDateTime.now())
                .build();

        chuTro.setSoDu(100_000L);

        when(giaoDichRepository.findByIdForUpdate(gd.getMaGiaoDich())).thenReturn(Optional.of(gd));
        when(giaoDichRepository.save(any(GiaoDich.class))).thenAnswer(i -> i.getArgument(0));
        when(chuTroRepository.findByIdForUpdate(chuTroUser.getMaNguoiDung())).thenReturn(Optional.of(chuTro));
        when(chuTroRepository.save(any(ChuTro.class))).thenAnswer(i -> i.getArgument(0));

        // Mock tổng quỹ hệ thống đủ tiền chi
        lenient().when(giaoDichRepository.sumSoTienByLoaiAndTrangThai(anyString(), any(TrangThaiGD.class))).thenReturn(0L);
        lenient().when(giaoDichRepository.sumSoTienByLoaiAndTrangThai(eq("COC_XEM_PHONG"), eq(TrangThaiGD.THANH_CONG))).thenReturn(10_000_000L);
        lenient().when(chuTroRepository.sumTotalSoDu()).thenReturn(100_000L);

        adminService.approveTransaction(gd.getMaGiaoDich(), "admin_user", "FT123456");

        // 1. Giao dịch chuyển sang THANH_CONG
        assertEquals(TrangThaiGD.THANH_CONG, gd.getTrangThai());
        assertTrue(gd.getNoiDung().contains("ĐÃ DUYỆT BỞI ADMIN"));

        // 2. Tiền cọc bồi thường 200.000đ được cộng chính thức vào ví Chủ trọ (100k + 200k = 300k)
        assertEquals(300_000L, chuTro.getSoDu());
        verify(chuTroRepository).save(chuTro);
    }

    // =========================================================================
    // TRƯỜNG HỢP 8: ĐẶT LỊCH SÁT GIỜ (< 3 TIẾNG) BỊ CHẶN
    // =========================================================================
    @Test
    @DisplayName("TH8: Đặt lịch hẹn sát giờ (< 3 tiếng) -> Bị chặn với APPOINTMENT_MINIMUM_ADVANCE_TIME")
    void testTaoDatLich_ThatBai_KhiDatDuoi3Gio() {
        AppointmentCreateRequest request = new AppointmentCreateRequest();
        request.setMaPhongTro("PT001");
        request.setNgayHen(LocalDateTime.now().plusHours(2).plusMinutes(30)); // 2h30 < 3h

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.taoDatLich("khach_hang", request));

        assertEquals(ErrorCode.APPOINTMENT_MINIMUM_ADVANCE_TIME, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 9: ĐẶT TRÙNG LỊCH ĐANG HOẠT ĐỘNG BỊ CHẶN
    // =========================================================================
    @Test
    @DisplayName("TH9: Đặt trùng lịch đang hoạt động cùng phòng, cùng giờ -> Bị chặn với DUPLICATE_APPOINTMENT")
    void testTaoDatLich_ThatBai_KhiDatTrungLichDangHoatDong() {
        AppointmentCreateRequest request = new AppointmentCreateRequest();
        request.setMaPhongTro(phongTro.getMaPhongTro());
        LocalDateTime ngayHen = LocalDateTime.now().plusDays(2);
        request.setNgayHen(ngayHen);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro())).thenReturn(Optional.of(phongTro));
        when(phieuDatLichRepository.existsActiveDuplicateAppointment(
                eq(khachHang.getMaNguoiDung()), eq(phongTro.getMaPhongTro()), eq(ngayHen), any(), any()))
                .thenReturn(true);

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.taoDatLich("khach_hang", request));

        assertEquals(ErrorCode.DUPLICATE_APPOINTMENT, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 10: DUYỆT LỊCH QUÁ HẠN (TỰ HỦY & HOÀN CỌC TRONG CÙNG TRANSACTION)
    // =========================================================================
    @Test
    @DisplayName("TH10: Chủ trọ duyệt lịch quá hạn -> Trả về false, chuyển HUY và hoàn cọc an toàn (không rollback)")
    void testXacNhanLichHen_QuaHan_TuDongHuyVaCommit() {
        phieu.setTrangThai(TrangThaiDatLich.CHO_XAC_NHAN);
        phieu.setCoc(200_000L);
        // Đặt từ 3 ngày trước -> đã quá 24h
        phieu.setThoiGianDat(LocalDateTime.now().minusDays(3));
        phieu.setNgayHen(LocalDateTime.now().plusHours(10));

        when(nguoiDungRepository.findByTenDangNhap("chu_tro")).thenReturn(Optional.of(chuTroUser));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(true);

        boolean result = appointmentService.xacNhanLichHen(phieu.getMaDatLich(), "chu_tro");

        assertFalse(result, "Hàm duyệt lịch phải trả về false khi quá hạn");
        assertEquals(TrangThaiDatLich.HUY, phieu.getTrangThai());
        assertTrue(phieu.getLiDoHuy().contains("quá hạn"));
        verify(transactionService).taoGiaoDich(
                eq(khachHang), eq(200_000L), eq("HOAN_COC"), contains("quá hạn"), eq(TrangThaiGD.CHO_THANH_TOAN)
        );
        verify(phieuDatLichRepository).save(phieu);
    }

    // =========================================================================
    // TRƯỜNG HỢP 11: NHẬN LẠI CỌC SỚM HƠN CỬA SỔ 2H BỊ CHẶN
    // =========================================================================
    @Test
    @DisplayName("TH11: Khách hàng xác nhận nhận cọc khi chưa tới cửa sổ (cách giờ hẹn > 2h) -> Bị chặn với APPOINTMENT_CONFIRM_TOO_EARLY")
    void testKhachHangXacNhanDaNhanCoc_ThatBai_KhiChuaToiCuaSo2h() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setNgayHen(LocalDateTime.now().plusHours(5)); // Còn 5 tiếng nữa mới đến giờ hẹn

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.khachHangXacNhanDaNhanCoc(phieu.getMaDatLich(), "khach_hang"));

        assertEquals(ErrorCode.APPOINTMENT_CONFIRM_TOO_EARLY, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 12: KHÁCH ĐÃ NHẬN CỌC BẤM HỦY THƯỜNG BỊ CHẶN
    // =========================================================================
    @Test
    @DisplayName("TH12: Khách đã xác nhận nhận lại cọc bấm hủy thường -> Bị chặn với CANNOT_CANCEL_AFTER_DEPOSIT_RETURN")
    void testHuyLichHen_ThatBai_KhiKhachDaNhanLaiCoc() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setDaNhanLaiCoc(true);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        AppointmentCancelRequest request = new AppointmentCancelRequest();
        request.setLiDoHuy("Đổi ý không muốn thuê nữa");

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.huyLichHen(phieu.getMaDatLich(), "khach_hang", request));

        assertEquals(ErrorCode.CANNOT_CANCEL_AFTER_DEPOSIT_RETURN, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 13: HAI PHIẾU CÙNG CHỐT THUÊ -> PHIẾU ĐẾN SAU LÀ PHIẾU THUA
    // =========================================================================
    @Test
    @DisplayName("TH13: Hai phiếu cùng chốt phòng -> Phiếu chốt sau khi phòng đã HOAN_THANH sẽ chuyển HUY và hoàn cọc cho chủ trọ")
    void testXuLyKetQuaLichHen_PhongDaDuocKhachKhacThue_PhieuThuaChuyenHuy() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setDaNhanLaiCoc(true);
        phieu.setCoc(200_000L);
        phieu.setPhiThu(20_000L);
        phieu.setChuTroDongY(true); // Chủ trọ đã đồng ý trước
        chuTro.setSoDu(0L);

        // Phòng đã được người khác chốt thuê hoàn tất trước đó
        phongTro.setTrangThai(com.innfinder.backend.entity.enums.TrangThaiPhongTro.HOAN_THANH);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro())).thenReturn(Optional.of(phongTro));
        when(chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro())).thenReturn(Optional.of(chuTro));
        when(chuTroRepository.save(any(ChuTro.class))).thenAnswer(i -> i.getArgument(0));

        // Khách hàng bấm Đồng ý thuê (đây là phiếu chốt sau)
        appointmentService.khachHangDuaRaQuyetDinh(phieu.getMaDatLich(), "khach_hang", new AppointmentDecisionRequest(true, null));

        // 1. Phiếu thua chuyển sang HUY
        assertEquals(TrangThaiDatLich.HUY, phieu.getTrangThai());
        assertTrue(phieu.getLiDoHuy().contains("đã được khách hàng khác chốt thuê"));

        // 2. Không thu phí hoa hồng sàn, hoàn đủ 100% cọc (200.000đ) cho Chủ trọ bù khoản đã ứng trả khách
        assertEquals(200_000L, chuTro.getSoDu());
        verify(transactionService).taoGiaoDich(
                eq(chuTroUser),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("khách khác chốt trước"),
                eq(TrangThaiGD.THANH_CONG)
        );
    }

    // =========================================================================
    // TRƯỜNG HỢP 14: SEPAY WEBHOOK IDEMPOTENT (CHỐNG TRÙNG LẶP ID)
    // =========================================================================
    @Test
    @DisplayName("TH14: SePay Webhook gửi lại cùng ID giao dịch -> Bỏ qua không xử lý trùng (Idempotent)")
    void testSePayWebhook_Idempotent_BaoQuaKhiTrungSePayId() {
        SePayWebhookPayload payload = SePayWebhookPayload.builder()
                .id(999888777L)
                .transferType("in")
                .transferAmount(200_000L)
                .content("IFCOC20261122001")
                .build();

        when(giaoDichRepository.existsById("SEPAY_999888777")).thenReturn(true);

        var response = bankingWebhookService.xuLySePayWebhook("dummyAuth", payload);

        assertTrue((Boolean) response.get("success"));
        assertTrue(response.get("message").toString().contains("đối soát trước đó"));
        verify(phieuDatLichRepository, never()).findByIdForUpdate(anyString());
    }

    // =========================================================================
    // TRƯỜNG HỢP 15: TIỀN VÀO ĐƠN ĐÃ HỦY QUA WEBHOOK -> TỰ ĐỘNG HOÀN TIỀN
    // =========================================================================
    @Test
    @DisplayName("TH15: Tiền cọc chuyển vào đơn đã HUY -> Ghi nhận TIEN_VAO_DON_HUY và tự động tạo lệnh HOAN_COC")
    void testSePayWebhook_TienDenMuon_GhiNhanVaTuDongHoanTien() {
        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setCoc(200_000L);

        SePayWebhookPayload payload = SePayWebhookPayload.builder()
                .id(123456789L)
                .transferType("in")
                .transferAmount(200_000L)
                .content("IFCOC" + phieu.getMaDatLich().replace("DL", ""))
                .referenceCode("REF123")
                .build();

        when(giaoDichRepository.existsById("SEPAY_123456789")).thenReturn(false);
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        var response = bankingWebhookService.xuLySePayWebhook("dummyAuth", payload);

        assertTrue((Boolean) response.get("success"));
        // 1. Ghi nhận tiền vào đơn hủy
        verify(giaoDichRepository).save(argThat(gd ->
                "SEPAY_123456789".equals(gd.getMaGiaoDich()) &&
                "TIEN_VAO_DON_HUY".equals(gd.getLoaiGiaoDich()) &&
                gd.getSoTien() == 200_000L
        ));

        // 2. Tự động sinh lệnh hoàn cọc ở CHO_THANH_TOAN
        verify(transactionService).taoGiaoDich(
                eq(khachHang),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Hoàn tiền cọc nộp muộn cho lịch hẹn đã hủy"),
                eq(TrangThaiGD.CHO_THANH_TOAN)
        );
    }
}
