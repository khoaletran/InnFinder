package com.innfinder.backend.service;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.innfinder.backend.dto.webhook.CassoTransactionItem;
import com.innfinder.backend.dto.webhook.CassoWebhookPayload;
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

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
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
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private CacheManager cacheManager;

    @Value("${sepay.enabled:false}")
    private boolean sepayEnabled = true;

    @Value("${sepay.api-key:sepay_innfinder_secret_key_2026}")
    private String sepayApiKey;

    @Value("${casso.enabled:true}")
    private boolean cassoEnabled = true;

    @Value("${casso.secure-token:}")
    private String cassoSecureToken;

    private static final Pattern CASSO_SIGNATURE = Pattern.compile("t=([0-9]{1,19}),\\s*v1=([0-9a-fA-F]{128})");

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

        // Kiểm tra cờ bật/tắt của cổng SePay
        if (!sepayEnabled) {
            log.warn("[SePay Webhook] Cổng SePay hiện đang bị tắt (sepay.enabled=false). Bỏ qua request.");
            return Map.of("success", false, "message", "Cổng webhook SePay hiện đang bị vô hiệu hóa (disabled)");
        }

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
        gd.setMaThamChieuNganHang(refCode);
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
     * Xử lý webhook từ Casso khi có biến động số dư tài khoản ngân hàng
     */
    @Transactional
    public Map<String, Object> xuLyCassoWebhook(String secureTokenHeader, String signature, byte[] body) {
        if (!cassoEnabled) {
            log.warn("[Casso Webhook] Cổng Casso đang tắt");
            return Map.of("success", false, "message", "Cổng webhook Casso hiện đang bị vô hiệu hóa (disabled)");
        }

        List<CassoTransactionItem> transactions;
        try {
            Map<String, Object> envelope = objectMapper.readerFor(new TypeReference<Map<String, Object>>() {})
                    .with(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readValue(body);
            if (envelope == null) {
                return Map.of("success", false, "message", "Payload Casso không hợp lệ");
            }

            if (!xacThucCasso(secureTokenHeader, signature, envelope)) {
                log.warn("[Casso Webhook] Xác thực webhook thất bại");
                return Map.of("success", false, "message", "Xác thực webhook Casso thất bại");
            }

            transactions = objectMapper.convertValue(envelope, CassoWebhookPayload.class).getTransactions();
        } catch (IOException | IllegalArgumentException e) {
            log.warn("[Casso Webhook] Payload không hợp lệ");
            return Map.of("success", false, "message", "Payload Casso không hợp lệ");
        }

        if (transactions.isEmpty()) {
            log.info("[Casso Webhook] Không có giao dịch nào trong payload data.");
            return Map.of("success", true, "message", "Không có giao dịch nào cần xử lý");
        }

        int successCount = 0;
        int total = transactions.size();

        for (CassoTransactionItem item : transactions) {
            if (item == null) continue;
            Long amount = item.getAmount() != null ? item.getAmount() : 0L;
            String rawContent = item.getDescription();

            // Tiền vào (Nộp cọc xem phòng)
            if (amount > 0) {
                String cassoMaGD = item.getId() != null ? "CASSO_" + item.getId() : transactionService.generateMaGiaoDich();
                String refCode = item.getTid() != null ? item.getTid() : String.valueOf(item.getId());

                Map<String, Object> res = xuLyTienVao(
                        "Casso",
                        cassoMaGD,
                        item.getId() != null ? String.valueOf(item.getId()) : null,
                        amount,
                        rawContent,
                        refCode
                );

                if (Boolean.TRUE.equals(res.get("success"))) {
                    successCount++;
                }
            }
        }

        return Map.of(
                "success", true,
                "error", 0,
                "processed", successCount,
                "total", total,
                "message", "Đối soát Casso webhook hoàn tất (" + successCount + "/" + total + " thành công)"
        );
    }

    private boolean xacThucCasso(String secureTokenHeader, String signature, Map<String, Object> envelope)
            throws IOException {
        if (cassoSecureToken == null || cassoSecureToken.isBlank()) {
            return false;
        }
        byte[] key = cassoSecureToken.trim().getBytes(StandardCharsets.UTF_8);
        if (signature == null) {
            return secureTokenHeader != null
                    && MessageDigest.isEqual(key, secureTokenHeader.trim().getBytes(StandardCharsets.UTF_8));
        }

        Matcher header = CASSO_SIGNATURE.matcher(signature.trim());
        if (!header.matches()) {
            return false;
        }

        // Casso V2 ký timestamp và toàn bộ JSON với các khóa được sắp xếp.
        String sortedJson = objectMapper.writer().with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                .writeValueAsString(envelope);
        byte[] signedMessage = (header.group(1) + "." + sortedJson).getBytes(StandardCharsets.UTF_8);
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            hmac.init(new SecretKeySpec(key, "HmacSHA512"));
            return MessageDigest.isEqual(hmac.doFinal(signedMessage), HexFormat.of().parseHex(header.group(2)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không thể khởi tạo xác thực Casso V2", e);
        }
    }

    /**
     * Xử lý giao dịch tiền vào tài khoản Sàn (Khách hàng nộp cọc giữ chân lịch xem phòng)
     */
    private Map<String, Object> xuLySePayTienVao(SePayWebhookPayload payload, String rawContent) {
        String sepayMaGD = payload.getId() != null ? "SEPAY_" + payload.getId() : transactionService.generateMaGiaoDich();
        String refCode = payload.getReferenceCode() != null ? payload.getReferenceCode() : String.valueOf(payload.getId());
        Long transferAmount = payload.getTransferAmount() != null && payload.getTransferAmount() > 0
                ? payload.getTransferAmount()
                : 0L;
        return xuLyTienVao("SePay", sepayMaGD, String.valueOf(payload.getId()), transferAmount, rawContent, refCode);
    }

    /**
     * Hàm đối soát tiền vào cốt lõi dùng chung cho cả SePay và Casso
     */
    private Map<String, Object> xuLyTienVao(
            String providerName,
            String maGiaoDich,
            String rawId,
            Long transferAmount,
            String rawContent,
            String refCode) {

        // 1. Kiểm tra chống xử lý lặp lại giao dịch (Idempotency ở cấp DB)
        if (giaoDichRepository.existsById(maGiaoDich)) {
            log.info("[{} Webhook] Giao dịch ID {} đã được xử lý trước đó. Bỏ qua ghi nhận trùng.", providerName, maGiaoDich);
            return Map.of("success", true, "message", "Giao dịch " + providerName + " đã được đối soát trước đó");
        }

        String maDatLich = extractMaDatLich(rawContent);
        if (maDatLich == null) {
            log.warn("[{} Webhook] Không tìm thấy mã lịch hẹn trong nội dung: '{}'", providerName, rawContent);
            return Map.of("success", true, "message", "Không tìm thấy mã lịch hẹn, không thể đối soát");
        }

        // Khóa phiếu với Pessimistic Lock để tuần tự hóa với các luồng hủy/xác nhận
        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLich).orElse(null);
        if (phieu == null) {
            log.warn("[{} Webhook] Lịch hẹn không tồn tại trong CSDL: {}. Bỏ qua.", providerName, maDatLich);
            return Map.of("success", false, "message", "Lịch hẹn không tồn tại: " + maDatLich);
        }

        // Chỉ tiếp nhận cọc khi phiếu ở trạng thái CHO_XAC_NHAN
        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            log.warn("[{} Webhook] Phiếu {} ở trạng thái {} (không phải CHO_XAC_NHAN). Bỏ qua, không xử lý.",
                    providerName, maDatLich, phieu.getTrangThai());
            return Map.of("success", true, "message", "Phiếu không ở trạng thái chờ xác nhận, bỏ qua");
        }

        // Tính hạn chốt duyệt thực tế: min(thoiGianDat + 24h, ngayHen - 2h)
        LocalDateTime thoiGianDat = phieu.getThoiGianDat() != null ? phieu.getThoiGianDat() : phieu.getNgayHen().minusHours(24);
        LocalDateTime limit24h = thoiGianDat.plusHours(24);
        LocalDateTime limitHen = phieu.getNgayHen().minusHours(2);
        LocalDateTime hanDuyet = limit24h.isBefore(limitHen) ? limit24h : limitHen;
        LocalDateTime hanNopCoc = thoiGianDat.plusMinutes(AppointmentService.PAYMENT_TIMEOUT_MINUTES);
        LocalDateTime now = LocalDateTime.now();

        boolean quaHan15Phut = phieu.getCoc() != null && phieu.getCoc() > 0 && !now.isBefore(hanNopCoc);
        boolean quaHan = !now.isBefore(hanDuyet);
        if (quaHan || quaHan15Phut) {
            log.warn("[{} Webhook] Phiếu {} đã quá hạn nộp cọc ({}). Bỏ qua, không ghi nhận.",
                    providerName, maDatLich, quaHan15Phut ? "quá 15 phút" : "quá hạn duyệt");
            return Map.of("success", true, "message", quaHan15Phut
                    ? "Phiếu đã quá hạn 15 phút nộp cọc, bỏ qua"
                    : "Phiếu đã quá hạn nộp cọc, bỏ qua");
        }

        // Kiểm tra xem lịch hẹn đã có cọc hợp lệ trước đó chưa
        boolean daCoCocHopLe = phieu.getKhachHang() != null &&
                giaoDichRepository.existsDepositByMaDatLich(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daCoCocHopLe) {
            log.info("[{} Webhook] Lịch hẹn {} đã có cọc hợp lệ trước đó. Bỏ qua không ghi nhận thêm.", providerName, maDatLich);
            return Map.of("success", true, "message", "Lịch hẹn đã có cọc hợp lệ trước đó");
        }

        Long amount = transferAmount != null && transferAmount > 0 ? transferAmount : 0L;
        Long tienCocYeuCau = phieu.getCoc() != null ? phieu.getCoc() : 0L;

        // QUY TẮC: Phải chuyển ĐÚNG VÀ ĐỦ số tiền cọc. Chuyển thiếu -> Không ghi nhận, không đền bù
        if (amount < tienCocYeuCau) {
            log.warn("[{} Webhook] Chuyển thiếu tiền cọc lịch {}: Nhận {} đ, cần {} đ. Hệ thống không ghi nhận cọc, không đền bù.",
                    providerName, maDatLich, amount, tienCocYeuCau);
            return Map.of("success", true, "message", "Chuyển thiếu tiền cọc, hệ thống không ghi nhận");
        }

        // Chuyển đúng và đủ tiền -> Ghi nhận cọc hợp lệ để chủ trọ duyệt
        String displayRef = refCode != null ? refCode : (rawId != null ? rawId : "");
        GiaoDich gdVao = GiaoDich.builder()
                .maGiaoDich(maGiaoDich)
                .phieuDatLich(phieu)
                .cocGoc(phieu.getCoc())
                .maThamChieuNganHang(displayRef.isBlank() ? null : displayRef)
                .nguoiDung(phieu.getKhachHang())
                .soTien(amount)
                .loaiGiaoDich("COC_XEM_PHONG")
                .noiDung("Tự động đối soát " + providerName + " cọc xem phòng " + phieu.getPhongTro().getMaPhongTro() +
                        " (Mã lịch: " + maDatLich + ", ID: " + (rawId != null ? rawId : "") + ", Ref: " + displayRef + ")")
                .ngayGiaoDich(LocalDateTime.now())
                .trangThai(TrangThaiGD.THANH_CONG)
                .build();
        giaoDichRepository.save(gdVao);

        evictAdminStatisticsCache();

        log.info("[{} Webhook] ĐỐI SOÁT THÀNH CÔNG: Đã ghi nhận cọc {} đ cho lịch {}", providerName, amount, maDatLich);
        return Map.of(
                "success", true,
                "maDatLich", maDatLich,
                "amount", amount,
                "message", "Nộp cọc giữ chân thành công qua " + providerName
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
