package com.innfinder.backend.service;

import com.innfinder.backend.dto.webhook.SePayWebhookPayload;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service xử lý đối soát Webhook biến động số dư tài khoản ngân hàng từ SePay
 * Hỗ trợ cả 2 chiều:
 * 1. Tiền vào (in): Khách hàng nộp cọc giữ chân lịch xem phòng.
 * 2. Tiền ra (out): Admin/Sàn chuyển khoản hoàn cọc hoặc chi trả tiền rút về ngân hàng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BankingWebhookService {

    private final PhieuDatLichRepository phieuDatLichRepository;
    private final GiaoDichRepository giaoDichRepository;
    private final TransactionService transactionService;

    @Autowired(required = false)
    private CacheManager cacheManager;

    @Value("${sepay.api-key:sepay_innfinder_secret_key_2026}")
    private String sepayApiKey;

    // Pattern 1: IFCOC hoặc DL theo sau là 11 số (Ví dụ: IFCOC20261119001 hoặc DL20261119001)
    private static final Pattern PATTERN_PREFIX = Pattern.compile("(?i)(?:IFCOC|DL)\\s*(\\d{11})");
    // Pattern 2: Cụm 11 số độc lập có dạng ngày yyyyMMdd (VD: 20261119001)
    private static final Pattern PATTERN_DATE_SEQUENCE = Pattern.compile("\\b(20\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3})\\b");

    // Pattern nhận diện mã giao dịch tiền ra: GD + 11 số (Ví dụ: GD20261122001)
    private static final Pattern PATTERN_GD_PREFIX = Pattern.compile("(?i)(?:GD)\\s*(\\d{11})");
    private static final Pattern PATTERN_GD_FULL = Pattern.compile("(?i)\\b(GD20\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3})\\b");

    /**
     * Xử lý webhook từ SePay khi có biến động số dư tài khoản
     */
    @Transactional
    public Map<String, Object> xuLySePayWebhook(String authHeader, SePayWebhookPayload payload) {
        log.info("[SePay Webhook] Nhận request: referenceCode={}, transferType={}, amount={}, content={}",
                payload.getReferenceCode(), payload.getTransferType(), payload.getTransferAmount(), payload.getContent());

        // 1. Kiểm tra API Key (nếu SePay có gửi header Authorization)
        if (sepayApiKey != null && !sepayApiKey.isBlank() && authHeader != null) {
            String expected = "Apikey " + sepayApiKey.trim();
            if (!authHeader.trim().equalsIgnoreCase(expected) && !authHeader.trim().equals(sepayApiKey.trim())) {
                log.warn("[SePay Webhook] Header Authorization không khớp: {}. Dự kiến: {}", authHeader, expected);
            }
        }

        String rawContent = payload.getContent() != null ? payload.getContent() : payload.getDescription();
        if (rawContent == null || rawContent.isBlank()) {
            log.warn("[SePay Webhook] Không có nội dung chuyển khoản để đối soát.");
            return Map.of("success", false, "message", "Nội dung chuyển khoản trống");
        }

        String transferType = payload.getTransferType() != null ? payload.getTransferType().trim().toLowerCase() : "in";

        // =========================================================================
        // NHÁNH 1: TIỀN RA (transferType == "out") - Tự động đối soát Hoàn cọc & Rút tiền
        // =========================================================================
        if ("out".equalsIgnoreCase(transferType)) {
            return xuLySePayTienRa(payload, rawContent);
        }

        // =========================================================================
        // NHÁNH 2: TIỀN VÀO (transferType == "in") - Tự động đối soát Nộp cọc xem phòng
        // =========================================================================
        return xuLySePayTienVao(payload, rawContent);
    }

    /**
     * Xử lý giao dịch tiền ra khỏi tài khoản Sàn (Admin chuyển khoản hoàn cọc hoặc duyệt rút tiền)
     */
    private Map<String, Object> xuLySePayTienRa(SePayWebhookPayload payload, String rawContent) {
        String maGiaoDich = extractMaGiaoDich(rawContent);
        if (maGiaoDich == null) {
            log.info("[SePay Webhook] Bỏ qua giao dịch tiền ra không tìm thấy mã GD: '{}'", rawContent);
            return Map.of("success", true, "message", "Bỏ qua giao dịch tiền ra không có mã GD");
        }

        GiaoDich gd = giaoDichRepository.findById(maGiaoDich).orElse(null);
        if (gd == null) {
            log.warn("[SePay Webhook] Mã giao dịch tiền ra không tồn tại trong CSDL: {}", maGiaoDich);
            return Map.of("success", false, "message", "Giao dịch không tồn tại: " + maGiaoDich);
        }

        if (gd.getTrangThai() == TrangThaiGD.THANH_CONG || gd.getTrangThai() == TrangThaiGD.HOAN_TIEN) {
            log.info("[SePay Webhook] Giao dịch {} đã được đối soát hoàn tất trước đó.", maGiaoDich);
            return Map.of("success", true, "message", "Giao dịch đã hoàn tất trước đó");
        }

        // Tự động chuyển trạng thái sang THANH_CONG
        gd.setTrangThai(TrangThaiGD.THANH_CONG);
        String timeNow = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String refCode = payload.getReferenceCode() != null ? payload.getReferenceCode() : String.valueOf(payload.getId());
        String oldNote = gd.getNoiDung() != null ? gd.getNoiDung() : "";
        gd.setNoiDung(oldNote + " [ĐÃ TỰ ĐỘNG ĐỐI SOÁT SEPAY TIỀN RA lúc " + timeNow + " - Mã SePay: " + refCode + "]");
        giaoDichRepository.save(gd);

        // Xóa cache thống kê Admin để cập nhật số liệu
        evictAdminStatisticsCache();

        log.info("[SePay Webhook] ĐỐI SOÁT THÀNH CÔNG TIỀN RA: Giao dịch {} đã hoàn tất chuyển tiền (GD: {})",
                maGiaoDich, refCode);

        return Map.of(
                "success", true,
                "maGiaoDich", maGiaoDich,
                "amount", payload.getTransferAmount() != null ? payload.getTransferAmount() : gd.getSoTien(),
                "message", "Đối soát tiền ra thành công"
        );
    }

    /**
     * Xử lý giao dịch tiền vào tài khoản Sàn (Khách hàng nộp cọc giữ chân lịch xem phòng)
     */
    private Map<String, Object> xuLySePayTienVao(SePayWebhookPayload payload, String rawContent) {
        String sepayMaGD = payload.getId() != null ? "SEPAY_" + payload.getId() : transactionService.generateMaGiaoDich();

        // 1. Kiểm tra chống xử lý lặp lại giao dịch SePay (Idempotency ở cấp DB)
        if (giaoDichRepository.existsById(sepayMaGD)) {
            log.info("[SePay Webhook] Giao dịch SePay ID {} đã được xử lý trước đó. Bỏ qua ghi nhận trùng.", payload.getId());
            return Map.of("success", true, "message", "Giao dịch SePay đã được đối soát trước đó");
        }

        String maDatLich = extractMaDatLich(rawContent);
        if (maDatLich == null) {
            log.warn("[SePay Webhook] Không tìm thấy mã lịch hẹn trong nội dung: '{}'", rawContent);
            return Map.of("success", true, "message", "Không tìm thấy mã lịch hẹn, không thể đối soát");
        }

        // Khóa phiếu với Pessimistic Lock để tuần tự hóa với các luồng hủy/xác nhận
        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLich).orElse(null);
        if (phieu == null) {
            log.warn("[SePay Webhook] Lịch hẹn không tồn tại trong CSDL: {}", maDatLich);
            return Map.of("success", false, "message", "Lịch hẹn không tồn tại: " + maDatLich);
        }

        String refCode = payload.getReferenceCode() != null ? payload.getReferenceCode() : String.valueOf(payload.getId());
        Long transferAmount = payload.getTransferAmount() != null && payload.getTransferAmount() > 0
                ? payload.getTransferAmount()
                : 0L;
        Long tienCocYeuCau = phieu.getCoc() != null ? phieu.getCoc() : 0L;

        // Tính hạn chốt duyệt thực tế: min(thoiGianDat + 24h, ngayHen - 2h)
        LocalDateTime thoiGianDat = phieu.getThoiGianDat() != null ? phieu.getThoiGianDat() : phieu.getNgayHen().minusHours(24);
        LocalDateTime limit24h = thoiGianDat.plusHours(24);
        LocalDateTime limitHen = phieu.getNgayHen().minusHours(2);
        LocalDateTime hanDuyet = limit24h.isBefore(limitHen) ? limit24h : limitHen;
        boolean quaHan = LocalDateTime.now().isAfter(hanDuyet) || LocalDateTime.now().isEqual(hanDuyet);

        // Kiểm tra xem lịch hẹn đã có cọc hợp lệ trước đó chưa
        boolean daCoCocHopLe = phieu.getKhachHang() != null &&
                giaoDichRepository.existsDepositByMaDatLich(phieu.getKhachHang().getMaNguoiDung(), maDatLich);

        // =========================================================================
        // KỊCH BẢN 1: KHÁCH CHUYỂN CỌC THỪA / CHUYỂN LẦN 2 (Đã có cọc hợp lệ trước đó)
        // =========================================================================
        if (daCoCocHopLe) {
            log.info("[SePay Webhook] Lịch hẹn {} đã có cọc hợp lệ. Ghi nhận tiền chuyển lần 2/thừa và tạo lệnh hoàn cọc.", maDatLich);
            GiaoDich gdVao = GiaoDich.builder()
                    .maGiaoDich(sepayMaGD)
                    .nguoiDung(phieu.getKhachHang())
                    .soTien(transferAmount)
                    .loaiGiaoDich("COC_CHUYEN_THUA")
                    .noiDung("Tiền chuyển cọc thừa/lần 2 cho lịch " + maDatLich + " (SePay ID: " + payload.getId() + ", Ref: " + refCode + ")")
                    .ngayGiaoDich(LocalDateTime.now())
                    .trangThai(TrangThaiGD.THANH_CONG)
                    .build();
            giaoDichRepository.save(gdVao);

            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    transferAmount,
                    "HOAN_COC",
                    "Hoàn trả tiền cọc chuyển thừa/lần 2 cho lịch " + maDatLich + " (Cần Admin chuyển khoản lại khách)",
                    TrangThaiGD.CHO_THANH_TOAN
            );
            evictAdminStatisticsCache();
            return Map.of("success", true, "message", "Ghi nhận tiền chuyển thừa và tạo lệnh hoàn trả");
        }

        // =========================================================================
        // KỊCH BẢN 2: TIỀN ĐẾN MUỘN (Phiếu đã HUY hoặc đã QUÁ HẠN DUYỆT)
        // =========================================================================
        if (phieu.getTrangThai() == TrangThaiDatLich.HUY || quaHan) {
            if (phieu.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN) {
                phieu.setTrangThai(TrangThaiDatLich.HUY);
                phieu.setLiDoHuy("Tự động hủy: Tiền cọc chuyển sau khi đã quá hạn duyệt lịch");
                phieuDatLichRepository.save(phieu);
            }
            log.warn("[SePay Webhook] Tiền cọc chuyển vào phiếu đã hủy/quá hạn: {}. Tạo lệnh hoàn tiền theo thực nhận.", maDatLich);
            GiaoDich gdVao = GiaoDich.builder()
                    .maGiaoDich(sepayMaGD)
                    .nguoiDung(phieu.getKhachHang())
                    .soTien(transferAmount)
                    .loaiGiaoDich("TIEN_VAO_DON_HUY")
                    .noiDung("Tiền cọc chuyển vào phiếu đã hủy/quá hạn " + maDatLich + " (SePay ID: " + payload.getId() + ", Ref: " + refCode + ")")
                    .ngayGiaoDich(LocalDateTime.now())
                    .trangThai(TrangThaiGD.THANH_CONG)
                    .build();
            giaoDichRepository.save(gdVao);

            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    transferAmount,
                    "HOAN_COC",
                    "Hoàn tiền cọc nộp muộn cho lịch hẹn đã hủy " + maDatLich + " (Cần Admin chuyển khoản lại khách)",
                    TrangThaiGD.CHO_THANH_TOAN
            );
            evictAdminStatisticsCache();
            return Map.of("success", true, "message", "Phiếu đã hủy/quá hạn - đã ghi nhận và tạo lệnh hoàn cọc");
        }

        // =========================================================================
        // KỊCH BẢN 3: CHUYỂN THIẾU TIỀN CỌC (transferAmount < tienCocYeuCau)
        // =========================================================================
        if (transferAmount < tienCocYeuCau) {
            log.warn("[SePay Webhook] Chuyển thiếu tiền cọc lịch {}: Nhận {} đ, cần {} đ. Tạo lệnh hoàn tiền.",
                    maDatLich, transferAmount, tienCocYeuCau);
            GiaoDich gdVao = GiaoDich.builder()
                    .maGiaoDich(sepayMaGD)
                    .nguoiDung(phieu.getKhachHang())
                    .soTien(transferAmount)
                    .loaiGiaoDich("COC_THIEU")
                    .noiDung("Chuyển thiếu tiền cọc lịch " + maDatLich + " (Nhận " + transferAmount + " đ / Cần " + tienCocYeuCau + " đ - SePay ID: " + payload.getId() + ", Ref: " + refCode + ")")
                    .ngayGiaoDich(LocalDateTime.now())
                    .trangThai(TrangThaiGD.THANH_CONG)
                    .build();
            giaoDichRepository.save(gdVao);

            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    transferAmount,
                    "HOAN_COC",
                    "Hoàn tiền do nộp cọc thiếu cho lịch " + maDatLich + " (Cần Admin chuyển khoản lại khách)",
                    TrangThaiGD.CHO_THANH_TOAN
            );
            evictAdminStatisticsCache();
            return Map.of("success", true, "message", "Nộp thiếu cọc - đã ghi nhận và tạo lệnh hoàn cọc");
        }

        // =========================================================================
        // KỊCH BẢN 4: NỘP CỌC HỢP LỆ CHO LỊCH HẸN (Đủ điều kiện để chủ trọ duyệt)
        // =========================================================================
        GiaoDich gdVao = GiaoDich.builder()
                .maGiaoDich(sepayMaGD)
                .nguoiDung(phieu.getKhachHang())
                .soTien(transferAmount)
                .loaiGiaoDich("COC_XEM_PHONG")
                .noiDung("Tự động đối soát SePay cọc xem phòng " + phieu.getPhongTro().getMaPhongTro() +
                        " (Mã lịch: " + maDatLich + ", SePay ID: " + payload.getId() + ", Ref: " + refCode + ")")
                .ngayGiaoDich(LocalDateTime.now())
                .trangThai(TrangThaiGD.THANH_CONG)
                .build();
        giaoDichRepository.save(gdVao);

        // Nếu chuyển thừa tiền so với cọc yêu cầu, tự động hoàn phần thừa
        if (transferAmount > tienCocYeuCau && tienCocYeuCau > 0) {
            long soTienThua = transferAmount - tienCocYeuCau;
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    soTienThua,
                    "HOAN_COC",
                    "Hoàn phần tiền cọc chuyển thừa cho lịch " + maDatLich + " (Cần Admin chuyển khoản lại khách)",
                    TrangThaiGD.CHO_THANH_TOAN
            );
        }

        evictAdminStatisticsCache();

        log.info("[SePay Webhook] ĐỐI SOÁT THÀNH CÔNG: Lịch hẹn {} đã nhận cọc {} đ qua SePay (GD: {})",
                maDatLich, transferAmount, refCode);

        return Map.of(
                "success", true,
                "maDatLich", maDatLich,
                "amount", transferAmount,
                "message", "Đối soát cọc giữ chân thành công"
        );
    }

    private void evictAdminStatisticsCache() {
        try {
            if (cacheManager != null && cacheManager.getCache("admin_statistics") != null) {
                cacheManager.getCache("admin_statistics").clear();
            }
        } catch (Exception ignored) {}
    }

    /**
     * Bóc tách mã lịch hẹn theo định dạng DLyyyyMMddxxx từ nội dung bất kỳ
     */
    public String extractMaDatLich(String content) {
        if (content == null) return null;

        // Ưu tiên 1: IFCOC<11_SO> hoặc DL<11_SO>
        Matcher m1 = PATTERN_PREFIX.matcher(content);
        if (m1.find()) {
            return "DL" + m1.group(1);
        }

        // Ưu tiên 2: 11 số độc lập dạng ngày tháng sequence (yyyyMMddxxx)
        Matcher m2 = PATTERN_DATE_SEQUENCE.matcher(content);
        if (m2.find()) {
            return "DL" + m2.group(1);
        }

        return null;
    }

    /**
     * Bóc tách mã giao dịch theo định dạng GDyyyyMMddxxx từ nội dung bất kỳ
     */
    public String extractMaGiaoDich(String content) {
        if (content == null) return null;

        Matcher m1 = PATTERN_GD_PREFIX.matcher(content);
        if (m1.find()) {
            return "GD" + m1.group(1);
        }

        Matcher m2 = PATTERN_GD_FULL.matcher(content);
        if (m2.find()) {
            return m2.group(1).toUpperCase();
        }

        return null;
    }
}

