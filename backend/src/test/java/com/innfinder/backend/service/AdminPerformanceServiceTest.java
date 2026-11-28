package com.innfinder.backend.service;

import com.innfinder.backend.dto.response.AdminRoomPageResponseDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.response.AdminTransactionPageResponseDTO;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.LoaiPhongTro;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.TaiKhoanNganHang;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import com.innfinder.backend.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPerformanceServiceTest {

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
    @Mock private PhieuKhieuNaiRepository phieuKhieuNaiRepository;
    @Mock private AiUsageLogRepository aiUsageLogRepository;

    @InjectMocks
    private AdminService adminService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(adminService, "phieuKhieuNaiRepository", phieuKhieuNaiRepository);
        ReflectionTestUtils.setField(adminService, "aiUsageLogRepository", aiUsageLogRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    void getTransactionsPaged_batchesBankAccountLookupInOneQuery() {
        NguoiDung u1 = NguoiDung.builder().maNguoiDung("ND01").tenDangNhap("user1").hoVaTen("User Một").build();
        NguoiDung u2 = NguoiDung.builder().maNguoiDung("ND02").tenDangNhap("user2").hoVaTen("User Hai").build();

        GiaoDich g1 = GiaoDich.builder()
                .maGiaoDich("GD01")
                .nguoiDung(u1)
                .loaiGiaoDich("RUT_TIEN")
                .soTien(150_000L)
                .noiDung("Yêu cầu rút tiền")
                .trangThai(TrangThaiGD.CHO_THANH_TOAN)
                .ngayGiaoDich(LocalDateTime.now())
                .build();
        GiaoDich g2 = GiaoDich.builder()
                .maGiaoDich("GD02")
                .nguoiDung(u2)
                .loaiGiaoDich("HOAN_COC")
                .soTien(200_000L)
                .noiDung("Hoàn cọc lịch hẹn DL001")
                .trangThai(TrangThaiGD.CHO_THANH_TOAN)
                .ngayGiaoDich(LocalDateTime.now())
                .build();

        when(giaoDichRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(g1, g2), PageRequest.of(0, 20), 2));
        when(giaoDichRepository.countByTrangThaiFiltered("ALL", ""))
                .thenReturn(List.<Object[]>of(
                        new Object[]{TrangThaiGD.CHO_THANH_TOAN, 2L},
                        new Object[]{TrangThaiGD.THANH_CONG, 5L}
                ));

        TaiKhoanNganHang b1 = TaiKhoanNganHang.builder()
                .nguoiDung(u1).tenNganHang("VCB").soTaiKhoan("111222333").tenChuTaiKhoan("USER MOT").macDinh(true).build();
        TaiKhoanNganHang b2 = TaiKhoanNganHang.builder()
                .nguoiDung(u2).tenNganHang("MB").soTaiKhoan("444555666").tenChuTaiKhoan("USER HAI").macDinh(true).build();

        when(taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDungIn(anyCollection()))
                .thenReturn(List.of(b1, b2));

        AdminTransactionPageResponseDTO page = adminService.getTransactionsPaged(
                null, "ALL", TrangThaiGD.CHO_THANH_TOAN, PageRequest.of(0, 20)
        );

        assertEquals(2, page.getContent().size());
        assertEquals("111222333", page.getContent().get(0).getSoTaiKhoan());
        assertEquals("444555666", page.getContent().get(1).getSoTaiKhoan());
        assertEquals(2L, page.getStatusCounts().get(TrangThaiGD.CHO_THANH_TOAN));
        assertEquals(5L, page.getStatusCounts().get(TrangThaiGD.THANH_CONG));

        verify(taiKhoanNganHangRepository, times(1)).findByNguoiDung_MaNguoiDungIn(anyCollection());
        verify(taiKhoanNganHangRepository, never()).findByNguoiDung_MaNguoiDung(anyString());
    }

    @Test
    void getStatistics_usesAggregatesAndComputesPlatformRevenueFromCompletedAppointments() {
        LocalDateTime now2026 = LocalDateTime.of(2026, 11, 20, 10, 0);
        when(phongTroRepository.findRoomStatsRows()).thenReturn(List.<Object[]>of(
                new Object[]{"PT01", "LPT001", "Ký túc xá", TrangThaiPhongTro.DA_DUYET, false, now2026}
        ));
        when(nguoiDungRepository.aggregateUserCounts(true, null, null, 2026))
                .thenReturn(List.<Object[]>of(new Object[]{10L, 8L, 2L}));
        when(yeuCauChuTroRepository.countByTrangThai(TrangThaiYeuCauChuTro.CHO_DUYET)).thenReturn(3L);
        when(phieuKhieuNaiRepository.countByTrangThai(TrangThaiKhieuNai.CHO_DUYET)).thenReturn(4L);

        when(phieuDatLichRepository.findAppointmentStatsRows()).thenReturn(List.<Object[]>of(
                new Object[]{"DL202601", TrangThaiDatLich.HOAN_THANH, 50_000L, 300_000L, now2026, now2026, true, true, true, null, "Ký túc xá"},
                new Object[]{"DL202602", TrangThaiDatLich.XAC_NHAN, 50_000L, 300_000L, now2026, now2026, false, null, null, null, "Ký túc xá"}
        ));
        when(giaoDichRepository.findPaidDepositNotes()).thenReturn(List.of("Nộp cọc lịch hẹn DL202602"));
        when(giaoDichRepository.findDistinctTransactionYears()).thenReturn(List.of(2026));
        when(giaoDichRepository.aggregateLedgerStats(true, null, null, 2026))
                .thenReturn(List.<Object[]>of(new Object[]{0L, 100_000L, 1L, 500_000L, 100_000L}));
        when(aiUsageLogRepository.aggregateTrackingSummaryForStats(true, null, null, 2026))
                .thenReturn(List.<Object[]>of(new Object[]{"ROOM_VIEW", "PT01", 12L}));
        when(phongTroRepository.countFavoritesByRoom()).thenReturn(List.<Object[]>of());

        AdminStatisticsResponseDTO stats = adminService.getStatistics(null, null, 2026);

        assertEquals(50_000L, stats.getTongDoanhThu());
        assertEquals(300_000L, stats.getQuyTamGiuCoc());
        assertEquals(4L, stats.getSoKhieuNaiChoDuyet());
        assertEquals(12L, stats.getPheuChuyenDoi().getLuotXemChiTiet());

        verify(nguoiDungRepository, never()).findAll();
        verify(giaoDichRepository, never()).findAll();
        verify(phieuDatLichRepository, never()).findAll();
    }

    @Test
    void getRoomsPaged_returnsPagedRoomsAndStatusCounts() {
        NguoiDung owner = NguoiDung.builder().maNguoiDung("ND01").hoVaTen("Chủ Trọ A").sdt("0901234567").build();
        ChuTro chuTro = ChuTro.builder().maChuTro("ND01").nguoiDung(owner).build();
        LoaiPhongTro lpt = LoaiPhongTro.builder().maLpt("LPT001").tenLoaiPhongTro("Phòng trọ").build();
        PhongTro pt = PhongTro.builder()
                .maPhongTro("PT01")
                .chuPhongTro(chuTro)
                .loaiPhong(lpt)
                .giaThue(2_500_000L)
                .dienTich(20)
                .soNguoi(2)
                .diaChi("123 Nguyễn Văn Bảo")
                .trangThai(TrangThaiPhongTro.CHO_DUYET)
                .thoiGianDang(LocalDateTime.now())
                .build();

        when(phongTroRepository.findByTrangThaiOrderByThoiGianDangDesc(TrangThaiPhongTro.CHO_DUYET, PageRequest.of(0, 15)))
                .thenReturn(new PageImpl<>(List.of(pt), PageRequest.of(0, 15), 1));
        when(phongTroRepository.countRoomsGroupByTrangThai()).thenReturn(List.<Object[]>of(
                new Object[]{TrangThaiPhongTro.CHO_DUYET, 1L},
                new Object[]{TrangThaiPhongTro.DA_DUYET, 7L}
        ));

        AdminRoomPageResponseDTO result = adminService.getRoomsPaged(TrangThaiPhongTro.CHO_DUYET, PageRequest.of(0, 15));

        assertEquals(1, result.getContent().size());
        assertEquals(1L, result.getStatusCounts().get(TrangThaiPhongTro.CHO_DUYET));
        assertEquals(7L, result.getStatusCounts().get(TrangThaiPhongTro.DA_DUYET));
    }
}
