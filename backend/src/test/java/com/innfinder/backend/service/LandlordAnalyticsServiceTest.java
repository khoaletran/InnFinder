package com.innfinder.backend.service;

import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LandlordAnalyticsServiceTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void computesCashflowCommissionFunnelBenchmarkAndRecommendationsForAuthenticatedLandlord() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("chutro01", "N/A", List.of()));

        var chuTroRepo = mock(ChuTroRepository.class);
        var phongTroRepo = mock(PhongTroRepository.class);
        var phieuRepo = mock(PhieuDatLichRepository.class);
        var danhGiaRepo = mock(DanhGiaRepository.class);
        var tourRepo = mock(PhongTroTour360Repository.class);
        var gdRepo = mock(GiaoDichRepository.class);
        var aiLogRepo = mock(AiUsageLogRepository.class);

        var service = new LandlordAnalyticsService(
                chuTroRepo, phongTroRepo, phieuRepo, danhGiaRepo, tourRepo, gdRepo, aiLogRepo);

        ChuTro landlord = ChuTro.builder().maChuTro("ND010120260001").soDu(180_000L).diemUyTin(96).build();
        when(chuTroRepo.findByNguoiDung_TenDangNhap("chutro01")).thenReturn(Optional.of(landlord));

        LoaiPhongTro lpt = LoaiPhongTro.builder().maLpt("LPT001").tenLoaiPhongTro("Phòng trọ khép kín").build();
        PhongTro r1 = PhongTro.builder()
                .maPhongTro("PT010126100001")
                .chuPhongTro(landlord)
                .loaiPhong(lpt)
                .giaThue(4_000_000L)
                .diaChi("12 Nguyễn Văn Bảo, Gò Vấp")
                .trangThai(TrangThaiPhongTro.DA_DUYET)
                .hinhAnh(List.of(HinhAnh.builder().url("https://img.example/1.jpg").laDaiDien(true).build()))
                .build();
        PhongTro r2 = PhongTro.builder()
                .maPhongTro("PT010126100002")
                .chuPhongTro(landlord)
                .loaiPhong(lpt)
                .giaThue(4_500_000L)
                .diaChi("18 Lê Đức Thọ, Gò Vấp")
                .trangThai(TrangThaiPhongTro.DA_DUYET)
                .hinhAnh(List.of(HinhAnh.builder().url("https://img.example/2.jpg").laDaiDien(true).build()))
                .build();
        PhongTro marketPeer = PhongTro.builder()
                .maPhongTro("PT010126100099")
                .loaiPhong(lpt)
                .giaThue(1_500_000L)
                .trangThai(TrangThaiPhongTro.DA_DUYET)
                .build();

        when(phongTroRepo.findByChuPhongTro_MaChuTro("ND010120260001")).thenReturn(List.of(r1, r2));
        when(phongTroRepo.sumAndCountPublicRentByRoomType())
                .thenReturn(List.<Object[]>of(new Object[]{"LPT001", 10_000_000L, 3L}));
        when(phongTroRepo.countFavoritesByRoomIds(List.of("PT010126100001", "PT010126100002")))
                .thenReturn(List.<Object[]>of(new Object[]{"PT010126100001", 3L}));

        when(aiLogRepo.countRoomTrackingEvents(eq(List.of("PT010126100001", "PT010126100002")), any()))
                .thenReturn(List.of(
                        new Object[]{"PT010126100001", "RECOMMEND_IMPRESSION", 20L},
                        new Object[]{"PT010126100001", "RECOMMEND_CLICK", 2L},
                        new Object[]{"PT010126100001", "ROOM_VIEW", 12L},
                        new Object[]{"PT010126100002", "ROOM_VIEW", 10L}
                ));

        PhieuDatLich pendingAppt = PhieuDatLich.builder()
                .maDatLich("DL001")
                .phongTro(r1)
                .ngayHen(LocalDateTime.now().plusDays(1))
                .thoiGianDat(LocalDateTime.now())
                .trangThai(TrangThaiDatLich.CHO_XAC_NHAN)
                .coc(200_000L)
                .phiThu(20_000L)
                .build();
        PhieuDatLich completedAppt = PhieuDatLich.builder()
                .maDatLich("DL002")
                .phongTro(r1)
                .ngayHen(LocalDateTime.now().minusDays(2))
                .thoiGianDat(LocalDateTime.now().minusDays(3))
                .trangThai(TrangThaiDatLich.HOAN_THANH)
                .daNhanLaiCoc(true)
                .coc(200_000L)
                .phiThu(20_000L)
                .build();
        when(phieuRepo.findAppointmentsByLandlordId("ND010120260001"))
                .thenReturn(List.of(pendingAppt, completedAppt));

        GiaoDich netCredit = GiaoDich.builder()
                .maGiaoDich("GD001")
                .soTien(180_000L)
                .loaiGiaoDich("CONG_TIEN_COC")
                .trangThai(TrangThaiGD.THANH_CONG)
                .ngayGiaoDich(LocalDateTime.now())
                .build();
        when(gdRepo.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc("ND010120260001"))
                .thenReturn(List.of(netCredit));
        when(danhGiaRepo.findByPhongTro_ChuPhongTro_MaChuTroOrderByNgayDanhGiaDesc("ND010120260001"))
                .thenReturn(List.of());
        when(tourRepo.findByChuTro_MaChuTroOrderByUpdatedAtDesc("ND010120260001"))
                .thenReturn(List.of());

        var res = service.getAnalyticsForCurrentLandlord(6);

        assertEquals(180_000L, res.getTongQuan().getTongTienCocThucNhan());
        assertEquals(20_000L, res.getTongQuan().getTongPhiHoaHongDaTra());
        assertEquals(22L, res.getTongQuan().getTongLuotXemPhong());
        assertEquals(10.0, res.getTongQuan().getCtrPercent());
        assertEquals(3L, res.getTongQuan().getTongYeuThich());
        assertEquals(6, res.getBieuDoDongTien().size());
        assertEquals(2, res.getHieuQuaTungPhong().size());
        assertTrue(res.getHieuQuaTungPhong().get(0).getGiaTrungBinhCungLoai() > 0);
        assertTrue(res.getHieuQuaTungPhong().get(0).getChenhLechGiaPercent() > 15.0);
        assertTrue(res.getDeXuatCaiThien().stream().anyMatch(r -> "LICH_HEN".equals(r.getNhom())));
        assertTrue(res.getDeXuatCaiThien().stream().anyMatch(r -> "NOI_DUNG_360".equals(r.getNhom())));
        assertTrue(res.getDeXuatCaiThien().stream().anyMatch(r -> "GIA_THUE".equals(r.getNhom())));
    }

    @Test
    void rejectsNonLandlordUser() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("khach01", "N/A", List.of()));

        var chuTroRepo = mock(ChuTroRepository.class);
        when(chuTroRepo.findByNguoiDung_TenDangNhap("khach01")).thenReturn(Optional.empty());

        var service = new LandlordAnalyticsService(
                chuTroRepo,
                mock(PhongTroRepository.class),
                mock(PhieuDatLichRepository.class),
                mock(DanhGiaRepository.class),
                mock(PhongTroTour360Repository.class),
                mock(GiaoDichRepository.class),
                mock(AiUsageLogRepository.class));

        AppException ex = assertThrows(AppException.class, () -> service.getAnalyticsForCurrentLandlord(6));
        assertEquals(ErrorCode.NOT_A_LANDLORD, ex.getErrorCode());
    }
}
