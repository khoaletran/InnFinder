package com.innfinder.backend.service;

import com.innfinder.backend.dto.landlord.LandlordAnalyticsResponseDTO;
import com.innfinder.backend.dto.landlord.LandlordAnalyticsResponseDTO.*;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LandlordAnalyticsService {

    private final ChuTroRepository chuTroRepository;
    private final PhongTroRepository phongTroRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final DanhGiaRepository danhGiaRepository;
    private final PhongTroTour360Repository tour360Repository;
    private final GiaoDichRepository giaoDichRepository;
    private final AiUsageLogRepository aiUsageLogRepository;

    @Transactional(readOnly = true)
    public LandlordAnalyticsResponseDTO getAnalyticsForCurrentLandlord(int months) {
        int safeMonths = Math.clamp(months, 1, 24);
        String username = SecurityUtils.getCurrentUsername();
        ChuTro landlord = chuTroRepository.findByNguoiDung_TenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));

        String maChuTro = landlord.getMaChuTro();
        LocalDateTime since = YearMonth.now().minusMonths(safeMonths - 1L).atDay(1).atStartOfDay();

        List<PhongTro> myRooms = phongTroRepository.findByChuPhongTro_MaChuTro(maChuTro);
        List<String> roomIds = myRooms.stream()
                .map(PhongTro::getMaPhongTro)
                .filter(Objects::nonNull)
                .toList();

        List<PhieuDatLich> appointments = phieuDatLichRepository.findAppointmentsByLandlordId(maChuTro);
        List<DanhGia> reviews = danhGiaRepository.findByPhongTro_ChuPhongTro_MaChuTroOrderByNgayDanhGiaDesc(maChuTro);
        List<PhongTroTour360> tours = tour360Repository.findByChuTro_MaChuTroOrderByUpdatedAtDesc(maChuTro);
        List<GiaoDich> transactions = giaoDichRepository.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(maChuTro);

        Set<String> roomsWithTour360 = new HashSet<>();
        for (PhongTroTour360 t : tours) {
            if (t.getPhongTro() != null && t.getPhongTro().getMaPhongTro() != null) {
                roomsWithTour360.add(t.getPhongTro().getMaPhongTro());
            }
        }

        Map<String, Long> favoritesByRoom = new HashMap<>();
        Map<String, Map<String, Long>> trackingByRoom = new HashMap<>();
        if (!roomIds.isEmpty()) {
            for (Object[] row : phongTroRepository.countFavoritesByRoomIds(roomIds)) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] instanceof Number cnt) {
                    favoritesByRoom.put(String.valueOf(row[0]), cnt.longValue());
                }
            }
            for (Object[] row : aiUsageLogRepository.countRoomTrackingEvents(roomIds, since)) {
                if (row != null && row.length >= 3 && row[0] != null && row[1] != null && row[2] instanceof Number cnt) {
                    String roomId = String.valueOf(row[0]);
                    String feature = String.valueOf(row[1]);
                    trackingByRoom.computeIfAbsent(roomId, k -> new HashMap<>())
                            .merge(feature, cnt.longValue(), Long::sum);
                }
            }
        }

        // Giá trung bình theo loại phòng trên toàn sàn (chỉ xét phòng công khai đã duyệt)
        Map<String, long[]> marketSumCountByType = new HashMap<>();
        for (Object[] row : phongTroRepository.sumAndCountPublicRentByRoomType()) {
            if (row == null || row.length < 3 || row[0] == null) continue;
            long sum = row[1] instanceof Number n ? n.longValue() : 0L;
            long count = row[2] instanceof Number n ? n.longValue() : 0L;
            if (count > 0) {
                marketSumCountByType.put(String.valueOf(row[0]), new long[]{sum, count});
            }
        }

        // Gom đánh giá theo phòng
        Map<String, List<DanhGia>> reviewsByRoom = new HashMap<>();
        for (DanhGia dg : reviews) {
            if (dg.getPhongTro() != null && dg.getPhongTro().getMaPhongTro() != null) {
                reviewsByRoom.computeIfAbsent(dg.getPhongTro().getMaPhongTro(), k -> new ArrayList<>()).add(dg);
            }
        }

        // Chuẩn bị buckets biểu đồ dòng tiền theo tháng
        Map<String, long[]> cashflowBuckets = new LinkedHashMap<>();
        YearMonth currentYm = YearMonth.now();
        for (int i = safeMonths - 1; i >= 0; i--) {
            YearMonth ym = currentYm.minusMonths(i);
            cashflowBuckets.put(String.format("%02d/%d", ym.getMonthValue(), ym.getYear()), new long[]{0L, 0L, 0L, 0L});
        }

        long tongLichHen = 0L;
        long lichChoDuyet = 0L;
        long lichDaXem = 0L;
        long lichHoanThanh = 0L;
        long lichHuy = 0L;
        long lichChoQuyetDinhSauXem = 0L;
        long tongPhiHoaHongDaTra = 0L;

        Map<String, long[]> apptStatsByRoom = new HashMap<>();
        Map<String, List<String>> rejectReasonsByRoom = new HashMap<>();

        for (PhieuDatLich p : appointments) {
            LocalDateTime apptTime = p.getNgayHen() != null ? p.getNgayHen() : p.getThoiGianDat();
            boolean inWindow = apptTime == null || !apptTime.isBefore(since);
            if (!inWindow) continue;

            tongLichHen++;
            if (p.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN) lichChoDuyet++;
            if (Boolean.TRUE.equals(p.getDaNhanLaiCoc()) || p.getTrangThai() == TrangThaiDatLich.HOAN_THANH) {
                lichDaXem++;
            }
            if (p.getTrangThai() == TrangThaiDatLich.XAC_NHAN
                    && Boolean.TRUE.equals(p.getDaNhanLaiCoc())
                    && p.getChuTroDongY() == null) {
                lichChoQuyetDinhSauXem++;
            }

            String roomId = p.getPhongTro() != null ? p.getPhongTro().getMaPhongTro() : null;
            long[] rStats = roomId != null
                    ? apptStatsByRoom.computeIfAbsent(roomId, k -> new long[]{0L, 0L, 0L})
                    : null;
            if (rStats != null) rStats[0]++;

            String bucketKey = apptTime != null
                    ? String.format("%02d/%d", apptTime.getMonthValue(), apptTime.getYear())
                    : null;
            if (bucketKey != null && cashflowBuckets.containsKey(bucketKey)) {
                cashflowBuckets.get(bucketKey)[3]++;
            }

            if (p.getTrangThai() == TrangThaiDatLich.HOAN_THANH) {
                lichHoanThanh++;
                long fee = p.getPhiThu() != null ? p.getPhiThu() : 0L;
                tongPhiHoaHongDaTra += fee;
                if (rStats != null) rStats[1]++;
                if (bucketKey != null && cashflowBuckets.containsKey(bucketKey)) {
                    cashflowBuckets.get(bucketKey)[1] += fee;
                    cashflowBuckets.get(bucketKey)[2]++;
                }
            } else if (p.getTrangThai() == TrangThaiDatLich.HUY) {
                lichHuy++;
                if (Boolean.FALSE.equals(p.getKhachHangDongY()) && rStats != null) {
                    rStats[2]++;
                    if (p.getLiDoHuy() != null && !p.getLiDoHuy().isBlank()) {
                        rejectReasonsByRoom.computeIfAbsent(roomId, k -> new ArrayList<>()).add(p.getLiDoHuy().trim());
                    }
                }
            }
        }

        long tongTienCocThucNhan = 0L;
        long tongBoiThuongNoShow = 0L;
        for (GiaoDich gd : transactions) {
            if (gd.getNgayGiaoDich() != null && gd.getNgayGiaoDich().isBefore(since)) continue;
            if (gd.getTrangThai() != TrangThaiGD.THANH_CONG) continue;
            String loai = gd.getLoaiGiaoDich() != null ? gd.getLoaiGiaoDich() : "";
            long amount = gd.getSoTien() != null ? gd.getSoTien() : 0L;

            if ("CONG_TIEN_COC".equalsIgnoreCase(loai)
                    || "HOAN_COC".equalsIgnoreCase(loai)
                    || "BOI_THUONG_NO_SHOW".equalsIgnoreCase(loai)) {
                tongTienCocThucNhan += amount;
                if ("BOI_THUONG_NO_SHOW".equalsIgnoreCase(loai)) {
                    tongBoiThuongNoShow += amount;
                }
                if (gd.getNgayGiaoDich() != null) {
                    String key = String.format("%02d/%d", gd.getNgayGiaoDich().getMonthValue(), gd.getNgayGiaoDich().getYear());
                    if (cashflowBuckets.containsKey(key)) {
                        cashflowBuckets.get(key)[0] += amount;
                    }
                }
            }
        }

        long phongDangMo = 0L;
        long phongDaThue = 0L;
        long phongChoDuyet = 0L;
        long tongLuotHienThi = 0L;
        long tongLuotClick = 0L;
        long tongLuotXemPhong = 0L;
        long tongLuotXemTour360 = 0L;
        long tongYeuThich = 0L;

        List<RoomPerformanceDTO> hieuQuaTungPhong = new ArrayList<>();
        for (PhongTro room : myRooms) {
            if (room.getTrangThai() == TrangThaiPhongTro.DA_DUYET && !room.isTamAn()) phongDangMo++;
            else if (room.getTrangThai() == TrangThaiPhongTro.HOAN_THANH) phongDaThue++;
            else if (room.getTrangThai() == TrangThaiPhongTro.CHO_DUYET) phongChoDuyet++;

            String roomId = room.getMaPhongTro();
            Map<String, Long> ev = trackingByRoom.getOrDefault(roomId, Map.of());
            long impressions = ev.getOrDefault("RECOMMEND_IMPRESSION", 0L);
            long clicks = ev.getOrDefault("RECOMMEND_CLICK", 0L);
            long views = ev.getOrDefault("ROOM_VIEW", 0L);
            long tourViews = ev.getOrDefault("TOUR_360_VIEW", 0L);
            long favs = favoritesByRoom.getOrDefault(roomId, 0L);

            tongLuotHienThi += impressions;
            tongLuotClick += clicks;
            tongLuotXemPhong += views;
            tongLuotXemTour360 += tourViews;
            tongYeuThich += favs;

            long[] rAppt = apptStatsByRoom.getOrDefault(roomId, new long[]{0L, 0L, 0L});
            long bookings = rAppt[0];
            long completed = rAppt[1];
            long tenantRejected = rAppt[2];

            List<DanhGia> roomReviews = reviewsByRoom.getOrDefault(roomId, List.of());
            double avgRating = roomReviews.isEmpty() ? 0.0
                    : round1(roomReviews.stream().mapToInt(d -> d.getDiem() != null ? d.getDiem() : 0).average().orElse(0.0));

            String maLpt = room.getLoaiPhong() != null ? room.getLoaiPhong().getMaLpt() : null;
            String tenLpt = room.getLoaiPhong() != null ? room.getLoaiPhong().getTenLoaiPhongTro() : "Phòng trọ";
            long[] marketAcc = maLpt != null ? marketSumCountByType.get(maLpt) : null;
            long avgMarketPrice = (marketAcc != null && marketAcc[1] > 0) ? Math.round((double) marketAcc[0] / marketAcc[1]) : 0L;
            long giaThue = room.getGiaThue() != null ? room.getGiaThue() : 0L;
            double priceDiffPct = avgMarketPrice > 0 ? round1((giaThue - avgMarketPrice) * 100.0 / avgMarketPrice) : 0.0;

            double ctr = impressions > 0 ? round1(clicks * 100.0 / impressions) : 0.0;
            double conv = bookings > 0 ? round1(completed * 100.0 / bookings) : 0.0;
            boolean hasTour360 = roomsWithTour360.contains(roomId);
            int photoCount = room.getHinhAnh() != null ? room.getHinhAnh().size() : 0;

            String health = classifyRoomHealth(room, impressions, ctr, views, bookings, completed);

            hieuQuaTungPhong.add(RoomPerformanceDTO.builder()
                    .maPhongTro(roomId)
                    .tenPhong(buildRoomTitle(room, tenLpt))
                    .diaChi(room.getDiaChi())
                    .tenLoaiPhong(tenLpt)
                    .hinhAnhUrl(resolveCoverUrl(room))
                    .trangThai(room.getTrangThai())
                    .tamAn(room.isTamAn())
                    .giaThue(giaThue)
                    .giaTrungBinhCungLoai(avgMarketPrice)
                    .chenhLechGiaPercent(priceDiffPct)
                    .coTour360(hasTour360)
                    .soAnh(photoCount)
                    .luotHienThi(impressions)
                    .luotClick(clicks)
                    .ctrPercent(ctr)
                    .luotXem(views)
                    .luotXemTour360(tourViews)
                    .luotYeuThich(favs)
                    .soLichHen(bookings)
                    .soLichHoanThanh(completed)
                    .soLichKhachTuChoi(tenantRejected)
                    .tyLeChotPercent(conv)
                    .diemDanhGiaTrungBinh(avgRating)
                    .soDanhGia(roomReviews.size())
                    .nhanSucKhoe(health)
                    .build());
        }

        hieuQuaTungPhong.sort(Comparator
                .comparingLong(RoomPerformanceDTO::getSoLichHen).reversed()
                .thenComparing(Comparator.comparingLong(RoomPerformanceDTO::getLuotXem).reversed())
                .thenComparing(RoomPerformanceDTO::getMaPhongTro));

        double overallAvgRating = reviews.isEmpty() ? 0.0
                : round1(reviews.stream().mapToInt(d -> d.getDiem() != null ? d.getDiem() : 0).average().orElse(0.0));

        List<MonthlyCashflowPoint> bieuDoDongTien = cashflowBuckets.entrySet().stream()
                .map(e -> MonthlyCashflowPoint.builder()
                        .thang(e.getKey())
                        .tienThucNhan(e.getValue()[0])
                        .phiHoaHong(e.getValue()[1])
                        .soLichHoanThanh(e.getValue()[2])
                        .soLichDat(e.getValue()[3])
                        .build())
                .toList();

        SummaryDTO tongQuan = SummaryDTO.builder()
                .soDuHienTai(landlord.getSoDu() != null ? landlord.getSoDu() : 0L)
                .diemUyTin(landlord.getDiemUyTin() != null ? landlord.getDiemUyTin() : 100)
                .tamAnDen(landlord.getTamAnDen())
                .tongPhong(myRooms.size())
                .phongDangMo(phongDangMo)
                .phongDaThue(phongDaThue)
                .phongChoDuyet(phongChoDuyet)
                .tongTienCocThucNhan(tongTienCocThucNhan)
                .tongPhiHoaHongDaTra(tongPhiHoaHongDaTra)
                .tongBoiThuongNoShow(tongBoiThuongNoShow)
                .tongLuotHienThi(tongLuotHienThi)
                .tongLuotClick(tongLuotClick)
                .ctrPercent(tongLuotHienThi > 0 ? round1(tongLuotClick * 100.0 / tongLuotHienThi) : 0.0)
                .tongLuotXemPhong(tongLuotXemPhong)
                .tongLuotXemTour360(tongLuotXemTour360)
                .tongYeuThich(tongYeuThich)
                .tongLichHen(tongLichHen)
                .lichChoDuyet(lichChoDuyet)
                .lichDaXem(lichDaXem)
                .lichHoanThanh(lichHoanThanh)
                .lichHuy(lichHuy)
                .tyLeChotPercent(tongLichHen > 0 ? round1(lichHoanThanh * 100.0 / tongLichHen) : 0.0)
                .diemDanhGiaTrungBinh(overallAvgRating)
                .tongDanhGia(reviews.size())
                .build();

        FunnelDTO pheuKhachHang = FunnelDTO.builder()
                .luotHienThi(tongLuotHienThi)
                .luotClick(tongLuotClick)
                .luotXem(tongLuotXemPhong)
                .luotXemTour360(tongLuotXemTour360)
                .luotYeuThich(tongYeuThich)
                .lichDatXem(tongLichHen)
                .daXemThucTe(lichDaXem)
                .chotThue(lichHoanThanh)
                .build();

        List<LandlordRecommendationDTO> deXuatCaiThien = buildRecommendations(
                hieuQuaTungPhong, lichChoDuyet, lichChoQuyetDinhSauXem, rejectReasonsByRoom);

        return LandlordAnalyticsResponseDTO.builder()
                .months(safeMonths)
                .tongQuan(tongQuan)
                .bieuDoDongTien(bieuDoDongTien)
                .pheuKhachHang(pheuKhachHang)
                .hieuQuaTungPhong(hieuQuaTungPhong)
                .deXuatCaiThien(deXuatCaiThien)
                .build();
    }

    private List<LandlordRecommendationDTO> buildRecommendations(
            List<RoomPerformanceDTO> rooms,
            long lichChoDuyet,
            long lichChoQuyetDinhSauXem,
            Map<String, List<String>> rejectReasonsByRoom
    ) {
        List<LandlordRecommendationDTO> recs = new ArrayList<>();

        if (lichChoDuyet > 0) {
            recs.add(LandlordRecommendationDTO.builder()
                    .id("pending-appointments")
                    .mucDoUuTien("CAO")
                    .nhom("LICH_HEN")
                    .tieuDe(String.format("Xác nhận %d lịch hẹn xem phòng đang chờ", lichChoDuyet))
                    .moTa("Phản hồi sớm giúp giữ chân khách đã nộp cọc và tránh lịch tự động hết hạn.")
                    .hanhDongLabel("Duyệt lịch ngay")
                    .duongDan("/landlord/appointments")
                    .build());
        }

        if (lichChoQuyetDinhSauXem > 0) {
            recs.add(LandlordRecommendationDTO.builder()
                    .id("pending-decisions")
                    .mucDoUuTien("CAO")
                    .nhom("LICH_HEN")
                    .tieuDe(String.format("Hoàn tất quyết định cho %d lịch đã xem phòng", lichChoQuyetDinhSauXem))
                    .moTa("Khách đã xác nhận nhận lại cọc trực tiếp; hãy chọn Đồng ý / Không thuê để giải ngân tiền thế chân về ví.")
                    .hanhDongLabel("Chốt quyết định")
                    .duongDan("/landlord/appointments")
                    .build());
        }

        for (RoomPerformanceDTO r : rooms) {
            if (r.getTrangThai() != TrangThaiPhongTro.DA_DUYET || r.isTamAn()) continue;

            if (r.getSoLichKhachTuChoi() >= 2 || (r.getSoDanhGia() > 0 && r.getDiemDanhGiaTrungBinh() < 4.0)) {
                List<String> reasons = rejectReasonsByRoom.getOrDefault(r.getMaPhongTro(), List.of());
                String reasonNote = reasons.isEmpty() ? "" : " Lý do gần nhất: \"" + reasons.get(0) + "\".";
                recs.add(LandlordRecommendationDTO.builder()
                        .id("quality-" + r.getMaPhongTro())
                        .maPhongTro(r.getMaPhongTro())
                        .tenPhong(r.getTenPhong())
                        .mucDoUuTien("CAO")
                        .nhom("CHAT_LUONG")
                        .tieuDe("Kiểm tra thực trạng " + r.getTenPhong())
                        .moTa(String.format("Phòng có %d lượt khách từ chối sau xem hoặc điểm đánh giá %.1f/5.%s",
                                r.getSoLichKhachTuChoi(), r.getDiemDanhGiaTrungBinh(), reasonNote))
                        .hanhDongLabel("Xem đánh giá & phòng")
                        .duongDan("/landlord/reviews")
                        .build());
            }

            if (r.getLuotXem() >= 8 && r.getSoLichHen() == 0 && !r.isCoTour360()) {
                recs.add(LandlordRecommendationDTO.builder()
                        .id("tour360-" + r.getMaPhongTro())
                        .maPhongTro(r.getMaPhongTro())
                        .tenPhong(r.getTenPhong())
                        .mucDoUuTien("TRUNG_BINH")
                        .nhom("NOI_DUNG_360")
                        .tieuDe("Bổ sung Tour 360° cho " + r.getTenPhong())
                        .moTa(String.format("Đã có %d lượt xem chi tiết nhưng chưa phát sinh lịch đặt cọc. Thêm Tour 360° giúp khách tự tin đặt cọc hơn.",
                                r.getLuotXem()))
                        .hanhDongLabel("Thêm Tour 360°")
                        .duongDan("/landlord/rooms/edit/" + r.getMaPhongTro())
                        .build());
            }

            if (r.getGiaTrungBinhCungLoai() > 0 && r.getChenhLechGiaPercent() > 15.0 && r.getSoLichHen() <= 1) {
                recs.add(LandlordRecommendationDTO.builder()
                        .id("price-" + r.getMaPhongTro())
                        .maPhongTro(r.getMaPhongTro())
                        .tenPhong(r.getTenPhong())
                        .mucDoUuTien("TRUNG_BINH")
                        .nhom("GIA_THUE")
                        .tieuDe("Cân nhắc giá thuê " + r.getTenPhong())
                        .moTa(String.format("Giá đang cao hơn %.1f%% so với mặt bằng %s (TB %,d đ/tháng) trong khi lượt đặt lịch còn ít.",
                                r.getChenhLechGiaPercent(), r.getTenLoaiPhong(), r.getGiaTrungBinhCungLoai()))
                        .hanhDongLabel("Điều chỉnh giá")
                        .duongDan("/landlord/rooms/edit/" + r.getMaPhongTro())
                        .build());
            }

            if ((r.getLuotHienThi() >= 15 && r.getCtrPercent() < 3.0) || r.getSoAnh() < 3) {
                recs.add(LandlordRecommendationDTO.builder()
                        .id("media-" + r.getMaPhongTro())
                        .maPhongTro(r.getMaPhongTro())
                        .tenPhong(r.getTenPhong())
                        .mucDoUuTien("GOI_Y")
                        .nhom("NOI_DUNG_360")
                        .tieuDe("Nâng cấp ảnh đại diện cho " + r.getTenPhong())
                        .moTa(String.format("Phòng hiện có %d ảnh (CTR gợi ý %.1f%%). Nên đăng tối thiểu 3–5 ảnh sáng rõ để tăng tỷ lệ bấm xem.",
                                r.getSoAnh(), r.getCtrPercent()))
                        .hanhDongLabel("Cập nhật ảnh")
                        .duongDan("/landlord/rooms/edit/" + r.getMaPhongTro())
                        .build());
            }
        }

        if (recs.isEmpty()) {
            recs.add(LandlordRecommendationDTO.builder()
                    .id("all-healthy")
                    .mucDoUuTien("GOI_Y")
                    .nhom("CHAT_LUONG")
                    .tieuDe("Hiệu suất danh sách phòng đang ổn định")
                    .moTa("Tiếp tục duy trì phản hồi lịch hẹn nhanh và cập nhật ảnh/Tour 360° định kỳ cho phòng trống.")
                    .hanhDongLabel("Quản lý phòng")
                    .duongDan("/landlord/rooms")
                    .build());
        }

        Map<String, Integer> rank = Map.of("CAO", 0, "TRUNG_BINH", 1, "GOI_Y", 2);
        return recs.stream()
                .sorted(Comparator.comparingInt(r -> rank.getOrDefault(r.getMucDoUuTien(), 9)))
                .limit(6)
                .toList();
    }

    private String classifyRoomHealth(PhongTro room, long impressions, double ctr, long views, long bookings, long completed) {
        if (room.getTrangThai() == TrangThaiPhongTro.HOAN_THANH) return "DA_THUE";
        if (room.getTrangThai() == TrangThaiPhongTro.CHO_DUYET) return "CHO_DUYET";
        if (completed > 0 || bookings >= 2) return "HUT_KHACH";
        if (views >= 8 && bookings == 0) return "XEM_NHIEU_IT_COC";
        if (impressions >= 15 && ctr < 3.0) return "CTR_THAP";
        return "ON_DINH";
    }

    private String buildRoomTitle(PhongTro room, String tenLoaiPhong) {
        String address = room.getDiaChi() != null ? room.getDiaChi() : "";
        String firstPart = address.contains(",") ? address.substring(0, address.indexOf(",")).trim() : address;
        return firstPart.isBlank() ? tenLoaiPhong : tenLoaiPhong + " - " + firstPart;
    }

    private String resolveCoverUrl(PhongTro room) {
        if (room.getHinhAnh() == null || room.getHinhAnh().isEmpty()) return "";
        return room.getHinhAnh().stream()
                .filter(img -> Boolean.TRUE.equals(img.getLaDaiDien()))
                .map(HinhAnh::getUrl)
                .findFirst()
                .orElse(room.getHinhAnh().get(0).getUrl());
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
