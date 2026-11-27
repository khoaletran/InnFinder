package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.controller.WebhookController;
import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentDecisionRequest;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.webhook.CassoWebhookPayload;
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
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
        verify(transactionService).taoGiaoDichLichHen(
                eq(khachHang),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Tự động hoàn cọc do quá hạn phản hồi"),
                eq(TrangThaiGD.CHO_THANH_TOAN),
                any(PhieuDatLich.class)
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
    @DisplayName("TH3: Phiếu CHO_XAC_NHAN hợp lệ (đã nộp cọc, chưa quá 24h và cách giờ hẹn > 2h) thì GIỮ NGUYÊN")
    void testKhongHuy_KhiPhieuHopLe() {
        phieu.setThoiGianDat(LocalDateTime.now().minusHours(2));
        phieu.setNgayHen(LocalDateTime.now().plusHours(10));
        when(giaoDichRepository.existsDepositByMaDatLich(eq(khachHang.getMaNguoiDung()), eq(phieu.getMaDatLich()))).thenReturn(true);

        PhieuDatLich result = appointmentService.kiemTraVaTuDongHuyQuaHan(phieu);

        assertEquals(TrangThaiDatLich.CHO_XAC_NHAN, result.getTrangThai());
        verify(phieuDatLichRepository, never()).save(any());
        verify(transactionService, never()).taoGiaoDichLichHen(any(), any(), any(), any(), any(), any());
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
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

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
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
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
        verify(transactionService).taoGiaoDichLichHen(
                eq(khachHang),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Hoàn cọc do chủ trọ vắng mặt"),
                eq(TrangThaiGD.CHO_THANH_TOAN),
                any(PhieuDatLich.class)
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
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
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
        verify(transactionService).taoGiaoDichLichHen(
                eq(chuTroUser),
                eq(200_000L),
                eq("BOI_THUONG_NO_SHOW"),
                contains("Bồi thường tiền cọc (chờ đối soát 24h)"),
                eq(TrangThaiGD.CHO_THANH_TOAN),
                any(PhieuDatLich.class)
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

        // Lệnh bồi thường đang chờ xử lý vẫn là cọc giữ tại sàn.
        lenient().when(giaoDichRepository.findAll()).thenReturn(List.of(gd));
        lenient().when(giaoDichRepository.sumPendingRefundAndNoShow()).thenReturn(200_000L);
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
    // TRƯỜNG HỢP 9: MỖI KHÁCH CHỈ ĐƯỢC GIỮ TỐI ĐA 1 LỊCH ĐANG HOẠT ĐỘNG CHO 1 PHÒNG
    // =========================================================================
    @Test
    @DisplayName("TH9: Khách đã có lịch đang hoạt động (XAC_NHAN/CHO_XAC_NHAN) cho phòng -> Đặt tiếp (dù khác giờ) bị chặn với DUPLICATE_APPOINTMENT")
    void testTaoDatLich_ThatBai_KhiDatTrungLichDangHoatDong() {
        AppointmentCreateRequest request = new AppointmentCreateRequest();
        request.setMaPhongTro(phongTro.getMaPhongTro());
        LocalDateTime ngayHenKhac = LocalDateTime.now().plusDays(3);
        request.setNgayHen(ngayHenKhac);

        PhieuDatLich existingActive = PhieuDatLich.builder()
                .maDatLich("DL20261125009")
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(LocalDateTime.now().plusDays(1))
                .thoiGianDat(LocalDateTime.now())
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .build();

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro())).thenReturn(Optional.of(phongTro));
        when(phieuDatLichRepository.findByKhachHang_MaNguoiDungAndPhongTro_MaPhongTroAndTrangThaiIn(
                eq(khachHang.getMaNguoiDung()), eq(phongTro.getMaPhongTro()), anyList()))
                .thenReturn(List.of(existingActive));

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
        verify(transactionService).taoGiaoDichLichHen(
                eq(khachHang), eq(200_000L), eq("HOAN_COC"), contains("quá hạn"), eq(TrangThaiGD.CHO_THANH_TOAN),
                any(PhieuDatLich.class)
        );
        verify(phieuDatLichRepository).save(phieu);
    }

    // =========================================================================
    // TRƯỜNG HỢP 11: GẶP MẶT SỚM HƠN GIỜ HẸN VẪN CHO PHÉP XÁC NHẬN NHẬN LẠI CỌC
    // =========================================================================
    @Test
    @DisplayName("TH11: Hai bên gặp sớm hơn giờ hẹn -> Khách hàng vẫn bấm xác nhận nhận cọc thành công (daNhanLaiCoc = true)")
    void testKhachHangXacNhanDaNhanCoc_ThanhCong_KhiGapSomHonGioHen() {
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setNgayHen(LocalDateTime.now().plusHours(5)); // Còn 5 tiếng nữa mới đến giờ hẹn
        phieu.setDaNhanLaiCoc(false);
        phieu.setCoc(200_000L);
        phongTro.setViDo("10.7769");
        phongTro.setKinhDo("106.7009");

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(true);
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));

        var locationReq = new com.innfinder.backend.dto.appointment.ConfirmReceivedDepositRequest(10.7769, 106.7009);
        var response = appointmentService.khachHangXacNhanDaNhanCoc(phieu.getMaDatLich(), "khach_hang", locationReq);

        assertTrue(phieu.getDaNhanLaiCoc());
        assertTrue(response.getDaNhanLaiCoc());
        verify(phieuDatLichRepository).save(phieu);
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
        verify(transactionService).taoGiaoDichLichHen(
                eq(chuTroUser),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("khách khác chốt trước"),
                eq(TrangThaiGD.THANH_CONG),
                any(PhieuDatLich.class)
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
    // TRƯỜNG HỢP 15: CHUYỂN THIẾU TIỀN HOẶC SAI ĐƠN -> KHÔNG GHI NHẬN CỌC VÀ KHÔNG ĐỀN BÙ
    // =========================================================================
    @Test
    @DisplayName("TH15: Chuyển thiếu tiền cọc -> Bỏ qua không ghi nhận cọc, không tạo lệnh hoàn tiền tự động (khách tự chịu)")
    void testSePayWebhook_ChuyenThieuTien_KhongGhiNhanVaKhongDenBu() {
        phieu.setTrangThai(TrangThaiDatLich.CHO_XAC_NHAN);
        phieu.setCoc(200_000L);

        // Khách chuyển thiếu chỉ 100.000đ (cần 200.000đ)
        SePayWebhookPayload payload = SePayWebhookPayload.builder()
                .id(123456789L)
                .transferType("in")
                .transferAmount(100_000L)
                .content("IFCOC" + phieu.getMaDatLich().replace("DL", ""))
                .referenceCode("REF123")
                .build();

        when(giaoDichRepository.existsById("SEPAY_123456789")).thenReturn(false);
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(false);

        var response = bankingWebhookService.xuLySePayWebhook("dummyAuth", payload);

        assertTrue((Boolean) response.get("success"));
        assertTrue(response.get("message").toString().contains("Chuyển thiếu tiền cọc"));

        // Tuyệt đối không lưu giao dịch COC_XEM_PHONG và không tạo lệnh HOAN_COC đền bù
        verify(giaoDichRepository, never()).save(any(GiaoDich.class));
        verify(transactionService, never()).taoGiaoDichLichHen(any(), anyLong(), anyString(), anyString(), any(), any());
    }

    // =========================================================================
    // TRƯỜNG HỢP 16: CHỐT THUÊ THÀNH CÔNG -> TỰ ĐỘNG HỦY DÂY CHUYỀN CÁC PHIẾU HẸN SAU
    // =========================================================================
    @Test
    @DisplayName("TH16: Khách A chốt thuê thành công -> Tự động hủy phiếu của Khách B (xem sau) và hoàn cọc 100% cho B")
    void testXuLyKetQuaLichHen_ChotThueThanhCong_TuDongHuyCacPhieuSauVaHoanCoc() {
        // Phiếu A (xem sớm hơn và chốt thuê)
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setDaNhanLaiCoc(true);
        phieu.setCoc(200_000L);
        phieu.setPhiThu(20_000L);
        phieu.setKhachHangDongY(null); // Khách hàng chưa bấm
        phieu.setChuTroDongY(true);    // Chủ trọ đã đồng ý trước

        // Phiếu B (khách B hẹn xem sau vào ngày mai, đang ở XAC_NHAN, đã nộp cọc nhưng chưa xem)
        NguoiDung khachHangB = NguoiDung.builder()
                .maNguoiDung("ND202611220002")
                .tenDangNhap("khach_hang_b")
                .build();
        PhieuDatLich phieuB = PhieuDatLich.builder()
                .maDatLich("DL20261123002")
                .khachHang(khachHangB)
                .phongTro(phongTro)
                .thoiGianDat(LocalDateTime.now())
                .ngayHen(LocalDateTime.now().plusDays(3))
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .coc(200_000L)
                .daNhanLaiCoc(false)
                .build();

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro())).thenReturn(Optional.of(phongTro));
        when(phongTroRepository.save(any(PhongTro.class))).thenAnswer(i -> i.getArgument(0));
        when(chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro())).thenReturn(Optional.of(chuTro));
        when(chuTroRepository.save(any(ChuTro.class))).thenAnswer(i -> i.getArgument(0));

        // Mock tìm thấy phiếu B là phiếu đang hoạt động khác của phòng này
        when(phieuDatLichRepository.findOtherActiveAppointmentsByRoom(
                eq(phongTro.getMaPhongTro()), anyList(), eq(phieu.getMaDatLich())))
                .thenReturn(List.of(phieuB));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHangB.getMaNguoiDung(), phieuB.getMaDatLich())).thenReturn(true);

        // Gọi hàm đưa ra quyết định để kích hoạt xử lý kết quả
        appointmentService.khachHangDuaRaQuyetDinh(phieu.getMaDatLich(), "khach_hang", new AppointmentDecisionRequest(true, null));

        // 1. Phiếu A và Phòng chuyển sang HOAN_THANH
        assertEquals(TrangThaiDatLich.HOAN_THANH, phieu.getTrangThai());
        assertEquals(TrangThaiPhongTro.HOAN_THANH, phongTro.getTrangThai());

        // 2. Phiếu B tự động chuyển HUY với lý do khách xem sớm hơn chốt thuê
        assertEquals(TrangThaiDatLich.HUY, phieuB.getTrangThai());
        assertTrue(phieuB.getLiDoHuy().contains("khách hẹn xem sớm hơn chốt thuê thành công"));

        // 3. Tự động sinh lệnh hoàn cọc 100% cho Khách B
        verify(transactionService).taoGiaoDichLichHen(
                eq(khachHangB),
                eq(200_000L),
                eq("HOAN_COC"),
                contains("Hoàn cọc do phòng đã có khách trước chốt thuê"),
                eq(TrangThaiGD.CHO_THANH_TOAN),
                any(PhieuDatLich.class)
        );
    }

    @Test
    void paymentConfirmationCannotCreateDepositWithoutBankPayment() {
        when(nguoiDungRepository.findByTenDangNhap(khachHang.getTenDangNhap())).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findById(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        AppException error = assertThrows(AppException.class,
                () -> appointmentService.nopTienCoc(phieu.getMaDatLich(), khachHang.getTenDangNhap()));

        assertEquals(ErrorCode.DEPOSIT_NOT_PAID_YET, error.getErrorCode());
        verifyNoInteractions(transactionService);
    }

    // =========================================================================
    // TRƯỜNG HỢP 17: CASSO WEBHOOK ĐỐI SOÁT CỌC THÀNH CÔNG VỚI ĐỊNH DẠNG CASSO FLOW
    // =========================================================================
    private static final String CASSO_BODY = """
            {"error":0,"data":[{"id":888999,"tid":"FT24TEST999","description":"IFCOC20261123001",
            "amount":200000,"subAccId":"0383838383"}]}
            """;

    @Test
    @DisplayName("Casso gửi đúng secure-token thì ghi nhận cọc")
    void testCassoWebhook_NopCocThanhCong() throws Exception {
        ReflectionTestUtils.setField(bankingWebhookService, "cassoSecureToken", "test-casso-token");
        phieu.setTrangThai(TrangThaiDatLich.CHO_XAC_NHAN);
        phieu.setCoc(200_000L);

        when(giaoDichRepository.existsById("CASSO_888999")).thenReturn(false);
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(false);

        WebhookController controller = new WebhookController(bankingWebhookService);
        ReflectionTestUtils.setField(controller, "cassoEnabled", true);
        byte[] responseBody = MockMvcBuilders.standaloneSetup(controller).build()
                .perform(post("/api/webhooks/casso")
                        .header("secure-token", "test-casso-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CASSO_BODY))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        var response = new ObjectMapper().readTree(responseBody);
        assertTrue(response.path("success").asBoolean());
        assertEquals(1, response.path("processed").asInt());

        ArgumentCaptor<GiaoDich> gdCaptor = ArgumentCaptor.forClass(GiaoDich.class);
        verify(giaoDichRepository).save(gdCaptor.capture());
        assertEquals("CASSO_888999", gdCaptor.getValue().getMaGiaoDich());
        assertEquals(200_000L, gdCaptor.getValue().getSoTien());
        assertEquals("FT24TEST999", gdCaptor.getValue().getMaThamChieuNganHang());
        assertEquals("COC_XEM_PHONG", gdCaptor.getValue().getLoaiGiaoDich());
        assertEquals(TrangThaiGD.THANH_CONG, gdCaptor.getValue().getTrangThai());
    }

    @Test
    void cassoRequiresCorrectSecureTokenBeforeReconciliation() throws Exception {
        ReflectionTestUtils.setField(bankingWebhookService, "cassoSecureToken", "test-casso-token");
        WebhookController controller = new WebhookController(bankingWebhookService);
        ReflectionTestUtils.setField(controller, "cassoEnabled", true);
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();

        for (String token : new String[] {null, "wrong-token"}) {
            var request = post("/api/webhooks/casso").contentType(MediaType.APPLICATION_JSON).content(CASSO_BODY);
            if (token != null) {
                request.header("secure-token", token);
            }
            byte[] response = mvc.perform(request)
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsByteArray();
            assertFalse(new ObjectMapper().readTree(response).path("success").asBoolean());
        }
        verifyNoInteractions(phieuDatLichRepository, giaoDichRepository);
    }

    // =========================================================================
    // TRƯỜNG HỢP 18: CỜ BẬT/TẮT CỔNG THANH TOÁN (FEATURE TOGGLE ENABLED / DISABLED)
    // =========================================================================
    @Test
    @DisplayName("TH18: Khi cờ enabled = false -> Từ chối xử lý webhook an toàn")
    void testBankingWebhook_FeatureToggle_TuChoiKhiDisabled() {
        // 1. Tắt Casso
        ReflectionTestUtils.setField(bankingWebhookService, "cassoEnabled", false);
        var cassoRes = bankingWebhookService.xuLyCassoWebhook(null, CassoWebhookPayload.builder().build());
        assertFalse((Boolean) cassoRes.get("success"));
        assertTrue(cassoRes.get("message").toString().contains("vô hiệu hóa"));

        // 2. Tắt SePay
        ReflectionTestUtils.setField(bankingWebhookService, "sepayEnabled", false);
        SePayWebhookPayload sepayPayload = SePayWebhookPayload.builder().transferAmount(200_000L).build();
        var sepayRes = bankingWebhookService.xuLySePayWebhook("auth", sepayPayload);
        assertFalse((Boolean) sepayRes.get("success"));
        assertTrue(sepayRes.get("message").toString().contains("vô hiệu hóa"));

        // Phục hồi lại cờ enabled để không ảnh hưởng các test khác
        ReflectionTestUtils.setField(bankingWebhookService, "cassoEnabled", true);
        ReflectionTestUtils.setField(bankingWebhookService, "sepayEnabled", true);
    }

    // =========================================================================
    // TRƯỜNG HỢP 19: KHÁCH B ĐẶT TRÙNG KHOẢNG ĐỆM 2 GIỜ CỦA KHÁCH A -> BỊ CHẶN
    // =========================================================================
    @Test
    @DisplayName("TH19: Khách B đặt lịch trong vòng 2 giờ quanh lịch đã giữ của Khách A -> Bị chặn với APPOINTMENT_SLOT_CONFLICT")
    void testTaoDatLich_ThatBai_KhiTrungKhoangDem2GioCuaKhachKhac() {
        NguoiDung khachHangB = NguoiDung.builder()
                .maNguoiDung("ND202611220099")
                .tenDangNhap("khach_hang_b")
                .build();

        LocalDateTime gioKhachA = LocalDateTime.now().plusDays(2).withHour(9).withMinute(30).withSecond(0).withNano(0);
        LocalDateTime gioKhachB = gioKhachA.plusHours(1); // 10:30 - nằm trong khoảng đệm 2 giờ

        PhieuDatLich phieuA = PhieuDatLich.builder()
                .maDatLich("DL20261125001")
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(gioKhachA)
                .thoiGianDat(LocalDateTime.now())
                .trangThai(TrangThaiDatLich.XAC_NHAN)
                .coc(200_000L)
                .build();

        AppointmentCreateRequest requestB = new AppointmentCreateRequest();
        requestB.setMaPhongTro(phongTro.getMaPhongTro());
        requestB.setNgayHen(gioKhachB);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang_b")).thenReturn(Optional.of(khachHangB));
        when(phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro())).thenReturn(Optional.of(phongTro));
        when(phieuDatLichRepository.findByKhachHang_MaNguoiDungAndPhongTro_MaPhongTroAndTrangThaiIn(
                eq(khachHangB.getMaNguoiDung()), eq(phongTro.getMaPhongTro()), anyList()))
                .thenReturn(Collections.emptyList());
        when(phieuDatLichRepository.findAppointmentsByRoomAndTimeRange(
                eq(phongTro.getMaPhongTro()), any(), any(), anyList()))
                .thenReturn(List.of(phieuA));

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.taoDatLich("khach_hang_b", requestB));

        assertEquals(ErrorCode.APPOINTMENT_SLOT_CONFLICT, ex.getErrorCode());
    }

    // =========================================================================
    // TRƯỜNG HỢP 20: TỰ ĐỘNG HỦY PHIẾU CHƯA NỘP CỌC SAU 15 PHÚT
    // =========================================================================
    @Test
    @DisplayName("TH20: Phiếu CHO_XAC_NHAN quá 15 phút chưa nộp cọc -> Tự động hủy HUY và hết hiệu lực")
    void testKiemTraTrangThaiCoc_TuDongHuySau15PhutChuaNopCoc() {
        phieu.setTrangThai(TrangThaiDatLich.CHO_XAC_NHAN);
        phieu.setCoc(200_000L);
        phieu.setThoiGianDat(LocalDateTime.now().minusMinutes(16));
        phieu.setNgayHen(LocalDateTime.now().plusDays(1));

        when(phieuDatLichRepository.findById(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(false);
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));

        var status = appointmentService.kiemTraTrangThaiCoc(phieu.getMaDatLich());

        assertEquals("HUY", status.getTrangThaiLich());
        assertFalse(status.isConHieuLuc());
        assertFalse(status.isDaNopCoc());
        assertNotNull(status.getHanNopCoc());
        assertTrue(phieu.getLiDoHuy().contains("15 phút"));
    }

    // =========================================================================
    // TRƯỜNG HỢP 21: KHÁCH ĐÃ ĐẶT PHÒNG P1 VẪN ĐẶT ĐƯỢC PHÒNG P2 (VÀ ĐẶT LẠI P1 NẾU ĐÃ HUY)
    // =========================================================================
    @Test
    @DisplayName("TH21: Khách đang có lịch ở Phòng P1 vẫn đặt được Phòng P2 bình thường")
    void testTaoDatLich_ThanhCong_KhiDatPhongKhac() {
        PhongTro phongTro2 = PhongTro.builder()
                .maPhongTro("PT000000000002")
                .trangThai(TrangThaiPhongTro.DA_DUYET)
                .chuPhongTro(chuTro)
                .build();

        AppointmentCreateRequest requestP2 = new AppointmentCreateRequest();
        requestP2.setMaPhongTro(phongTro2.getMaPhongTro());
        requestP2.setNgayHen(LocalDateTime.now().plusDays(2).withHour(15).withMinute(0));

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phongTroRepository.findByIdForUpdate(phongTro2.getMaPhongTro())).thenReturn(Optional.of(phongTro2));
        // Phòng P2 chưa có lịch nào của khách này (vì khách chỉ mới đặt ở P1)
        when(phieuDatLichRepository.findByKhachHang_MaNguoiDungAndPhongTro_MaPhongTroAndTrangThaiIn(
                eq(khachHang.getMaNguoiDung()), eq(phongTro2.getMaPhongTro()), anyList()))
                .thenReturn(Collections.emptyList());
        when(phieuDatLichRepository.findAppointmentsByRoomAndTimeRange(
                eq(phongTro2.getMaPhongTro()), any(), any(), anyList()))
                .thenReturn(Collections.emptyList());
        when(phieuDatLichRepository.findMaxMaDatLichByPrefix(anyString())).thenReturn(null);
        when(phieuDatLichRepository.existsById(anyString())).thenReturn(false);
        when(giaoDichRepository.existsByCandidateId(anyString())).thenReturn(false);
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));

        var resp = appointmentService.taoDatLich("khach_hang", requestP2);

        assertNotNull(resp);
        assertEquals(phongTro2.getMaPhongTro(), resp.getMaPhongTro());
        assertEquals(TrangThaiDatLich.CHO_XAC_NHAN, resp.getTrangThai());
    }

    // =========================================================================
    // TRƯỜNG HỢP 22: CHỦ TRỌ KHÔNG THẤY LỊCH HUY CHƯA TỪNG NỘP CỌC, NHƯNG THẤY LỊCH HUY ĐÃ NỘP CỌC
    // =========================================================================
    @Test
    @DisplayName("TH22: Danh sách lịch của Chủ trọ ẩn phiếu HUY chưa nộp cọc, giữ lại phiếu HUY đã nộp cọc")
    void testLayLichHenChoChuTro_AnPhieuHuyChuaCoc() {
        PhieuDatLich phieuHuyChuaCoc = PhieuDatLich.builder()
                .maDatLich("DL20261125101")
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(LocalDateTime.now().plusDays(1))
                .thoiGianDat(LocalDateTime.now().minusMinutes(20))
                .trangThai(TrangThaiDatLich.HUY)
                .coc(200_000L)
                .liDoHuy("Quá 15 phút chưa nộp cọc")
                .build();

        PhieuDatLich phieuHuyDaCoc = PhieuDatLich.builder()
                .maDatLich("DL20261125102")
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(LocalDateTime.now().plusDays(2))
                .thoiGianDat(LocalDateTime.now().minusHours(1))
                .trangThai(TrangThaiDatLich.HUY)
                .coc(200_000L)
                .liDoHuy("Khách hủy hợp lệ")
                .build();

        when(nguoiDungRepository.findByTenDangNhap("chu_tro")).thenReturn(Optional.of(chuTroUser));
        when(phieuDatLichRepository.findAppointmentsByLandlordId(chuTroUser.getMaNguoiDung()))
                .thenReturn(List.of(phieuHuyChuaCoc, phieuHuyDaCoc));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), "DL20261125101")).thenReturn(false);
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), "DL20261125102")).thenReturn(true);

        var result = appointmentService.layLichHenChoChuTro("chu_tro");

        assertEquals(1, result.size());
        assertEquals("DL20261125102", result.get(0).getMaDatLich());
    }
}
