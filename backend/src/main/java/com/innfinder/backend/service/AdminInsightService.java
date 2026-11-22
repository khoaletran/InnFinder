package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.response.AdminRevenueInsightResponseDTO;
import com.innfinder.backend.dto.response.AdminRevenueInsightResponseDTO.RecommendedActionDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO.RevenuePointDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO.RoomTypeStatDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminInsightService {

    private static final Set<String> ALLOWED_ROUTES = Set.of(
            "/admin/posts",
            "/admin/transactions",
            "/admin/categories",
            "/admin/users",
            "/admin/viewings",
            "/admin/complaints",
            ""
    );

    private static final Set<String> ALLOWED_PRIORITIES = Set.of("CAO", "TRUNG_BINH", "THEO_DOI");

    private static final String SYSTEM_INSTRUCTION = """
            Bạn là chuyên gia phân tích dữ liệu tài chính và vận hành cho nền tảng thuê phòng trọ InnFinder.
            Dựa hoàn toàn trên số liệu thật được cung cấp (tuyệt đối không tự bịa số liệu mới, không nhắc tên bảng/cột kỹ thuật):
            1. Đánh giá tổng quan tình hình kỳ thống kê.
            2. Nhận xét biến động tăng/giảm của biểu đồ doanh thu hoa hồng (mốc mới nhất vs mốc trước, mốc đỉnh, bình quân).
            3. Đánh giá cơ cấu ngân khố (tổng quỹ, doanh thu hoa hồng, cọc tạm giữ, ví chủ trọ, quỹ chờ rút).
            4. Đánh giá cơ cấu loại phòng trọ và nguồn cung (nhóm chủ lực, nhóm ít tin, phòng chờ duyệt).
            5. Đề xuất 2 đến 4 quyết định hành động cụ thể, thực tế cho Admin.
            Mỗi mục nhận xét dài 1-3 câu tiếng Việt rõ ràng, có dẫn số liệu cụ thể (tiền tệ ghi VNĐ).
            Trường duongDan chỉ được chọn đúng 1 trong các giá trị: "/admin/posts", "/admin/transactions", "/admin/categories", "/admin/users", "/admin/viewings", "/admin/complaints", hoặc "".
            """;

    private final AdminService adminService;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    public AdminRevenueInsightResponseDTO generateInsights(Integer day, Integer month, Integer year) {
        AdminStatisticsResponseDTO stats = adminService.getStatistics(day, month, year);
        String periodLabel = formatPeriodLabel(day, month, year);
        TrendSummary trend = computeTrendSummary(stats);

        AdminRevenueInsightResponseDTO fallback = buildRuleBasedInsight(stats, periodLabel, trend);
        if (!geminiClient.isConfigured()) {
            return fallback;
        }

        try {
            Map<String, Object> payload = buildPromptPayload(stats, periodLabel, trend);
            String dataJson = objectMapper.writeValueAsString(payload);
            String rawJson = geminiClient.generate(SYSTEM_INSTRUCTION, dataJson, buildResponseSchema());
            JsonNode root = objectMapper.readTree(rawJson);

            String tongQuan = textOrFallback(root, "tongQuan", fallback.getTongQuan());
            String danhGiaDoanhThu = textOrFallback(root, "danhGiaDoanhThu", fallback.getDanhGiaDoanhThu());
            String danhGiaNganKho = textOrFallback(root, "danhGiaNganKho", fallback.getDanhGiaNganKho());
            String danhGiaLoaiPhong = textOrFallback(root, "danhGiaLoaiPhong", fallback.getDanhGiaLoaiPhong());

            List<RecommendedActionDTO> actions = new ArrayList<>();
            JsonNode actionNodes = root.path("deXuatQuyetDinh");
            if (actionNodes.isArray()) {
                for (JsonNode item : actionNodes) {
                    String title = item.path("tieuDe").asText("").trim();
                    String desc = item.path("moTa").asText("").trim();
                    if (title.isEmpty() || desc.isEmpty()) continue;

                    String priority = item.path("mucDoUuTien").asText("TRUNG_BINH").trim().toUpperCase(Locale.ROOT);
                    if (!ALLOWED_PRIORITIES.contains(priority)) {
                        priority = "TRUNG_BINH";
                    }

                    String route = item.path("duongDan").asText("").trim();
                    if (!ALLOWED_ROUTES.contains(route)) {
                        route = "";
                    }

                    actions.add(RecommendedActionDTO.builder()
                            .tieuDe(title)
                            .moTa(desc)
                            .mucDoUuTien(priority)
                            .duongDan(route)
                            .build());
                }
            }

            if (actions.isEmpty()) {
                actions = fallback.getDeXuatQuyetDinh();
            } else if (actions.size() > 4) {
                actions = actions.subList(0, 4);
            }

            return AdminRevenueInsightResponseDTO.builder()
                    .nguonPhanTich("AI")
                    .tongQuan(tongQuan)
                    .danhGiaDoanhThu(danhGiaDoanhThu)
                    .danhGiaNganKho(danhGiaNganKho)
                    .danhGiaLoaiPhong(danhGiaLoaiPhong)
                    .deXuatQuyetDinh(actions)
                    .build();
        } catch (Exception ex) {
            log.warn("Failed to generate AI statistics insight ({}); returning rule-based insight", ex.getMessage());
            return fallback;
        }
    }

    private TrendSummary computeTrendSummary(AdminStatisticsResponseDTO stats) {
        List<RevenuePointDTO> points = stats.getBieuDoDoanhThu() != null ? stats.getBieuDoDoanhThu() : List.of();
        RevenuePointDTO latest = points.isEmpty() ? null : points.get(points.size() - 1);
        RevenuePointDTO previous = points.size() >= 2 ? points.get(points.size() - 2) : null;

        RevenuePointDTO peak = null;
        for (RevenuePointDTO p : points) {
            if (peak == null || p.getDoanhThu() > peak.getDoanhThu()) {
                peak = p;
            }
        }
        if (peak != null && peak.getDoanhThu() <= 0) {
            peak = null;
        }

        long delta = (latest != null && previous != null) ? (latest.getDoanhThu() - previous.getDoanhThu()) : 0L;
        Double deltaPercent = null;
        if (latest != null && previous != null && previous.getDoanhThu() > 0) {
            deltaPercent = Math.round(((double) delta * 1000.0) / previous.getDoanhThu()) / 10.0;
        }

        long avgPerBooking = stats.getSoLichHoanThanh() > 0
                ? Math.round((double) stats.getTongDoanhThu() / stats.getSoLichHoanThanh())
                : 0L;

        List<RoomTypeStatDTO> roomTypes = stats.getCoCauLoaiPhong() != null ? stats.getCoCauLoaiPhong() : List.of();
        RoomTypeStatDTO topType = roomTypes.isEmpty() ? null : roomTypes.get(0);
        RoomTypeStatDTO smallestType = roomTypes.size() >= 2 ? roomTypes.get(roomTypes.size() - 1) : null;

        double topTypePercent = (topType != null && stats.getTongSoPhong() > 0)
                ? Math.round((double) topType.getSoLuong() * 1000.0 / stats.getTongSoPhong()) / 10.0
                : 0.0;

        double commissionFundShare = stats.getTongQuyHeThong() > 0
                ? Math.round((double) stats.getTongDoanhThu() * 1000.0 / stats.getTongQuyHeThong()) / 10.0
                : 0.0;

        return new TrendSummary(latest, previous, peak, delta, deltaPercent, avgPerBooking,
                topType, smallestType, topTypePercent, commissionFundShare);
    }

    private AdminRevenueInsightResponseDTO buildRuleBasedInsight(
            AdminStatisticsResponseDTO stats,
            String periodLabel,
            TrendSummary t
    ) {
        String tongQuan;
        if (stats.getTongDoanhThu() > 0) {
            tongQuan = String.format(
                    "Trong %s, sàn ghi nhận %s doanh thu hoa hồng từ %d lịch hẹn hoàn tất; tổng quỹ hệ thống đạt %s với %d phòng trọ trong kỳ.",
                    periodLabel, formatVnd(stats.getTongDoanhThu()), stats.getSoLichHoanThanh(),
                    formatVnd(stats.getTongQuyHeThong()), stats.getTongSoPhong());
        } else {
            tongQuan = String.format(
                    "Trong %s chưa phát sinh doanh thu hoa hồng từ lịch hẹn hoàn tất; hiện có %d phòng trọ và %s tổng quỹ hệ thống.",
                    periodLabel, stats.getTongSoPhong(), formatVnd(stats.getTongQuyHeThong()));
        }

        String danhGiaDoanhThu = buildRevenueEvaluation(stats, t);
        String danhGiaNganKho = buildTreasuryEvaluation(stats, t);
        String danhGiaLoaiPhong = buildRoomTypeEvaluation(stats, t);
        List<RecommendedActionDTO> actions = buildRecommendedActions(stats, t);

        return AdminRevenueInsightResponseDTO.builder()
                .nguonPhanTich("RULE_BASED")
                .tongQuan(tongQuan)
                .danhGiaDoanhThu(danhGiaDoanhThu)
                .danhGiaNganKho(danhGiaNganKho)
                .danhGiaLoaiPhong(danhGiaLoaiPhong)
                .deXuatQuyetDinh(actions)
                .build();
    }

    private String buildRevenueEvaluation(AdminStatisticsResponseDTO stats, TrendSummary t) {
        if (t.latest() == null || stats.getTongDoanhThu() <= 0) {
            return "Biểu đồ doanh thu chưa có giao dịch hoàn tất phát sinh hoa hồng trong kỳ lọc hiện tại.";
        }
        StringBuilder sb = new StringBuilder();
        if (t.previous() != null) {
            if (t.delta() > 0) {
                String pct = t.deltaPercent() != null ? String.format(" (+%.1f%%)", t.deltaPercent()) : " (tăng mới từ mốc 0 đ)";
                sb.append(String.format("Mốc %s đạt %s, tăng %s%s so với mốc %s (%s). ",
                        t.latest().getNhan(), formatVnd(t.latest().getDoanhThu()),
                        formatVnd(t.delta()), pct, t.previous().getNhan(), formatVnd(t.previous().getDoanhThu())));
            } else if (t.delta() < 0) {
                String pct = t.deltaPercent() != null ? String.format(" (%.1f%%)", t.deltaPercent()) : "";
                sb.append(String.format("Mốc %s đạt %s, giảm %s%s so với mốc %s (%s). ",
                        t.latest().getNhan(), formatVnd(t.latest().getDoanhThu()),
                        formatVnd(Math.abs(t.delta())), pct, t.previous().getNhan(), formatVnd(t.previous().getDoanhThu())));
            } else {
                sb.append(String.format("Mốc %s duy trì ổn định ở mức %s ngang bằng mốc %s. ",
                        t.latest().getNhan(), formatVnd(t.latest().getDoanhThu()), t.previous().getNhan()));
            }
        } else {
            sb.append(String.format("Mốc %s ghi nhận %s doanh thu hoa hồng. ",
                    t.latest().getNhan(), formatVnd(t.latest().getDoanhThu())));
        }

        if (t.peak() != null) {
            sb.append(String.format("Đỉnh doanh thu thuộc về mốc %s (%s, %d lịch hoàn tất); bình quân %s/lịch.",
                    t.peak().getNhan(), formatVnd(t.peak().getDoanhThu()),
                    t.peak().getSoLichHoanThanh(), formatVnd(t.avgPerBooking())));
        }
        return sb.toString().trim();
    }

    private String buildTreasuryEvaluation(AdminStatisticsResponseDTO stats, TrendSummary t) {
        if (stats.getTongQuyHeThong() <= 0) {
            return "Quỹ hệ thống hiện bằng 0 đ do chưa có tiền cọc tạm giữ hoặc số dư ví phát sinh trong kỳ.";
        }
        StringBuilder sb = new StringBuilder(String.format(
                "Doanh thu hoa hồng chiếm %.1f%% tổng quỹ hệ thống (%s); tiền cọc đang tạm giữ là %s và số dư ví chủ trọ là %s. ",
                t.commissionFundShare(), formatVnd(stats.getTongQuyHeThong()),
                formatVnd(stats.getQuyTamGiuCoc()), formatVnd(stats.getTongSoDuViChuTro())));
        if (stats.getSoLenhRutChoDuyet() > 0) {
            sb.append(String.format("Hiện có %d lệnh rút tiền đang chờ duyệt với tổng giá trị %s.",
                    stats.getSoLenhRutChoDuyet(), formatVnd(stats.getQuyChoRut())));
        } else {
            sb.append("Hiện không có lệnh rút tiền tồn đọng chờ xử lý.");
        }
        return sb.toString().trim();
    }

    private String buildRoomTypeEvaluation(AdminStatisticsResponseDTO stats, TrendSummary t) {
        if (stats.getTongSoPhong() <= 0 || t.topType() == null) {
            return "Chưa ghi nhận bài đăng phòng trọ mới trong kỳ lọc này.";
        }
        StringBuilder sb = new StringBuilder(String.format(
                "Loại hình chủ lực là %s với %d/%d phòng (chiếm %.1f%%). ",
                t.topType().getTenLoaiPhong(), t.topType().getSoLuong(), stats.getTongSoPhong(), t.topTypePercent()));
        if (t.smallestType() != null) {
            sb.append(String.format("Phân khúc ít nguồn cung nhất là %s (%d phòng). ",
                    t.smallestType().getTenLoaiPhong(), t.smallestType().getSoLuong()));
        }
        if (stats.getSoPhongChoDuyet() > 0) {
            sb.append(String.format("Đang có %d tin phòng chờ kiểm duyệt.", stats.getSoPhongChoDuyet()));
        }
        return sb.toString().trim();
    }

    private List<RecommendedActionDTO> buildRecommendedActions(AdminStatisticsResponseDTO stats, TrendSummary t) {
        List<RecommendedActionDTO> actions = new ArrayList<>();

        if (stats.getSoLenhRutChoDuyet() > 0) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe(String.format("Đối soát và duyệt %d lệnh rút tiền chờ xử lý", stats.getSoLenhRutChoDuyet()))
                    .moTa(String.format("Giải ngân kịp thời %s tiền chờ rút về tài khoản chủ trọ để duy trì uy tín thanh khoản sàn.",
                            formatVnd(stats.getQuyChoRut())))
                    .mucDoUuTien("CAO")
                    .duongDan("/admin/transactions")
                    .build());
        }

        if (stats.getSoPhongChoDuyet() > 0) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe(String.format("Kiểm duyệt %d tin phòng đang chờ", stats.getSoPhongChoDuyet()))
                    .moTa("Phê duyệt sớm các phòng đạt chuẩn giúp tăng nguồn cung hiển thị và tạo thêm lịch đặt xem phòng.")
                    .mucDoUuTien("CAO")
                    .duongDan("/admin/posts")
                    .build());
        }

        if (stats.getSoChuTroChoDuyet() > 0) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe(String.format("Xác minh %d hồ sơ đăng ký chủ trọ", stats.getSoChuTroChoDuyet()))
                    .moTa("Hoàn tất duyệt CCCD và tài khoản ngân hàng để mở rộng đội ngũ chủ trọ đăng tin mới.")
                    .mucDoUuTien("TRUNG_BINH")
                    .duongDan("/admin/users")
                    .build());
        }

        if (stats.getTongDoanhThu() <= 0 || t.delta() < 0) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe("Thúc đẩy tỷ lệ chốt thuê từ các lịch xem phòng")
                    .moTa("Theo dõi các lịch xem phòng đang xác nhận và rà soát biểu phí hoa hồng theo từng loại phòng cho phù hợp.")
                    .mucDoUuTien("TRUNG_BINH")
                    .duongDan("/admin/viewings")
                    .build());
        }

        if (t.topType() != null && t.topTypePercent() >= 55.0 && actions.size() < 4) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe("Cân bằng nguồn cung loại hình phòng trọ")
                    .moTa(String.format("%s đang chiếm %.1f%% tổng số phòng; nên khuyến khích thêm tin thuộc các phân khúc còn lại để đáp ứng đa dạng nhu cầu thuê.",
                            t.topType().getTenLoaiPhong(), t.topTypePercent()))
                    .mucDoUuTien("THEO_DOI")
                    .duongDan("/admin/categories")
                    .build());
        }

        if (actions.size() < 3) {
            actions.add(RecommendedActionDTO.builder()
                    .tieuDe("Tối ưu biểu phí cọc giữ chân & hoa hồng sàn")
                    .moTa(String.format("Đánh giá lại mức cọc giữ chân và phí hoa hồng ở các loại phòng chủ lực nhằm duy trì tốc độ tăng trưởng doanh thu (bình quân %s/lịch).",
                            formatVnd(t.avgPerBooking())))
                    .mucDoUuTien("THEO_DOI")
                    .duongDan("/admin/categories")
                    .build());
        }

        if (actions.size() > 4) {
            return actions.subList(0, 4);
        }
        return actions;
    }

    private Map<String, Object> buildPromptPayload(
            AdminStatisticsResponseDTO stats,
            String periodLabel,
            TrendSummary t
    ) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("kyThongKe", periodLabel);
        root.put("doanhThuHoaHongVnd", stats.getTongDoanhThu());
        root.put("soLichHenHoanTat", stats.getSoLichHoanThanh());
        root.put("hoaHongBinhQuanMoiLichVnd", t.avgPerBooking());
        root.put("tongQuyHeThongVnd", stats.getTongQuyHeThong());
        root.put("cocDangTamGiuVnd", stats.getQuyTamGiuCoc());
        root.put("tongSoDuViChuTroVnd", stats.getTongSoDuViChuTro());
        root.put("quyChoRutVnd", stats.getQuyChoRut());
        root.put("soLenhRutChoDuyet", stats.getSoLenhRutChoDuyet());
        root.put("tongSoPhong", stats.getTongSoPhong());
        root.put("soPhongDangHienThi", stats.getSoPhongDaDuyet());
        root.put("soPhongChoDuyet", stats.getSoPhongChoDuyet());
        root.put("soPhongDaHoanThanh", stats.getSoPhongHoanThanh());
        root.put("tongNguoiDung", stats.getTongNguoiDung());
        root.put("soChuTro", stats.getSoChuTro());
        root.put("soChuTroChoDuyet", stats.getSoChuTroChoDuyet());
        root.put("chenhLechMocMoiNhatSoVoiTruocVnd", t.delta());
        root.put("phanTramTangGiamMocMoiNhat", t.deltaPercent());
        root.put("chuoiDoanhThuTheoMoc", stats.getBieuDoDoanhThu());
        root.put("coCauLoaiPhong", stats.getCoCauLoaiPhong());
        return root;
    }

    private Map<String, Object> buildResponseSchema() {
        Map<String, Object> actionProps = new LinkedHashMap<>();
        actionProps.put("tieuDe", Map.of("type", "STRING"));
        actionProps.put("moTa", Map.of("type", "STRING"));
        actionProps.put("mucDoUuTien", Map.of("type", "STRING", "enum", List.of("CAO", "TRUNG_BINH", "THEO_DOI")));
        actionProps.put("duongDan", Map.of("type", "STRING"));

        Map<String, Object> rootProps = new LinkedHashMap<>();
        rootProps.put("tongQuan", Map.of("type", "STRING"));
        rootProps.put("danhGiaDoanhThu", Map.of("type", "STRING"));
        rootProps.put("danhGiaNganKho", Map.of("type", "STRING"));
        rootProps.put("danhGiaLoaiPhong", Map.of("type", "STRING"));
        rootProps.put("deXuatQuyetDinh", Map.of(
                "type", "ARRAY",
                "items", Map.of(
                        "type", "OBJECT",
                        "properties", actionProps,
                        "required", List.of("tieuDe", "moTa", "mucDoUuTien", "duongDan")
                )
        ));

        return Map.of(
                "type", "OBJECT",
                "properties", rootProps,
                "required", List.of("tongQuan", "danhGiaDoanhThu", "danhGiaNganKho", "danhGiaLoaiPhong", "deXuatQuyetDinh")
        );
    }

    private static String textOrFallback(JsonNode root, String field, String fallback) {
        String text = root.path(field).asText("").trim();
        return text.isEmpty() ? fallback : text;
    }

    private static String formatVnd(long amount) {
        return NumberFormat.getInstance(Locale.of("vi", "VN")).format(amount) + " đ";
    }

    private static String formatPeriodLabel(Integer day, Integer month, Integer year) {
        if (day != null && month != null && year != null) {
            return String.format("Ngày %02d/%02d/%d", day, month, year);
        }
        if (day == null && month != null && year != null) {
            return String.format("Tháng %02d/%d", month, year);
        }
        if (day == null && month == null && year != null) {
            return String.format("Năm %d", year);
        }
        if (day != null && month != null) {
            return String.format("Ngày %02d/%02d (tất cả năm)", day, month);
        }
        if (day != null && year != null) {
            return String.format("Ngày %02d hàng tháng · Năm %d", day, year);
        }
        if (month != null) {
            return String.format("Tháng %02d (tất cả năm)", month);
        }
        if (day != null) {
            return String.format("Ngày %02d hàng tháng (tất cả năm)", day);
        }
        return "Toàn thời gian";
    }

    private record TrendSummary(
            RevenuePointDTO latest,
            RevenuePointDTO previous,
            RevenuePointDTO peak,
            long delta,
            Double deltaPercent,
            long avgPerBooking,
            RoomTypeStatDTO topType,
            RoomTypeStatDTO smallestType,
            double topTypePercent,
            double commissionFundShare
    ) {}
}
