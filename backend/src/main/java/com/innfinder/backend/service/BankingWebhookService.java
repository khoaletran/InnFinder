package com.innfinder.backend.service;

import com.innfinder.backend.dto.webhook.SePayWebhookPayload;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service xử lý đối soát Webhook biến động số dư tài khoản ngân hàng từ SePay
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BankingWebhookService {

    private final PhieuDatLichRepository phieuDatLichRepository;
    private final GiaoDichRepository giaoDichRepository;
    private final TransactionService transactionService;

    @Value("${sepay.api-key:sepay_innfinder_secret_key_2026}")
    private String sepayApiKey;

    // Pattern 1: IFCOC hoặc DL theo sau là 11 số (Ví dụ: IFCOC20261119001 hoặc DL20261119001)
    private static final Pattern PATTERN_PREFIX = Pattern.compile("(?i)(?:IFCOC|DL)\\s*(\\d{11})");
    // Pattern 2: Cụm 11 số độc lập có dạng ngày yyyyMMdd (VD: 20261119001)
    private static final Pattern PATTERN_DATE_SEQUENCE = Pattern.compile("\\b(20\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3})\\b");

    /**
     * Xử lý webhook từ SePay khi có biến động số dư tài khoản
     */
    @Transactional
    public Map<String, Object> xuLySePayWebhook(String authHeader, SePayWebhookPayload payload) {
        log.info("[SePay Webhook] Nhận request: referenceCode={}, amount={}, content={}",
                payload.getReferenceCode(), payload.getTransferAmount(), payload.getContent());

        // 1. Kiểm tra API Key (nếu SePay có gửi header Authorization)
        if (sepayApiKey != null && !sepayApiKey.isBlank() && authHeader != null) {
            String expected = "Apikey " + sepayApiKey.trim();
            if (!authHeader.trim().equalsIgnoreCase(expected) && !authHeader.trim().equals(sepayApiKey.trim())) {
                log.warn("[SePay Webhook] Header Authorization không khớp: {}. Dự kiến: {}", authHeader, expected);
            }
        }

        // 2. Bỏ qua giao dịch tiền ra (transferType != "in")
        if (payload.getTransferType() != null && !"in".equalsIgnoreCase(payload.getTransferType())) {
            log.info("[SePay Webhook] Bỏ qua giao dịch tiền ra: {}", payload.getTransferType());
            return Map.of("success", true, "message", "Bỏ qua giao dịch tiền ra");
        }

        // 3. Bóc tách mã phiếu đặt lịch từ content hoặc description
        String rawContent = payload.getContent() != null ? payload.getContent() : payload.getDescription();
        if (rawContent == null || rawContent.isBlank()) {
            log.warn("[SePay Webhook] Không có nội dung chuyển khoản để đối soát.");
            return Map.of("success", false, "message", "Nội dung chuyển khoản trống");
        }

        String maDatLich = extractMaDatLich(rawContent);
        if (maDatLich == null) {
            log.warn("[SePay Webhook] Không tìm thấy mã lịch hẹn trong nội dung: '{}'", rawContent);
            return Map.of("success", true, "message", "Không tìm thấy mã lịch hẹn, không thể đối soát");
        }

        // 4. Tìm kiếm lịch hẹn trong CSDL
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich).orElse(null);
        if (phieu == null) {
            log.warn("[SePay Webhook] Lịch hẹn không tồn tại trong CSDL: {}", maDatLich);
            return Map.of("success", false, "message", "Lịch hẹn không tồn tại: " + maDatLich);
        }

        // 5. Kiểm tra chống trùng lặp (Idempotency)
        boolean daNop = phieu.getKhachHang() != null &&
                giaoDichRepository.existsDepositByMaDatLich(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop) {
            log.info("[SePay Webhook] Lịch hẹn {} đã được nộp cọc trước đó. Bỏ qua ghi nhận trùng.", maDatLich);
            return Map.of("success", true, "message", "Lịch hẹn đã được nộp cọc trước đó");
        }

        // 6. Ghi nhận giao dịch cọc giữ chân vào sổ cái GiaoDich
        Long transferAmount = payload.getTransferAmount() != null && payload.getTransferAmount() > 0
                ? payload.getTransferAmount()
                : phieu.getCoc();

        String refCode = payload.getReferenceCode() != null ? payload.getReferenceCode() : String.valueOf(payload.getId());

        transactionService.taoGiaoDich(
                phieu.getKhachHang(),
                transferAmount,
                "COC_XEM_PHONG",
                "Tự động đối soát SePay cọc xem phòng " + phieu.getPhongTro().getMaPhongTro() +
                        " (Mã lịch: " + maDatLich + ", GD: " + refCode + ")",
                TrangThaiGD.THANH_CONG
        );

        log.info("[SePay Webhook] ĐỐI SOÁT THÀNH CÔNG: Lịch hẹn {} đã nhận cọc {} đ qua SePay (GD: {})",
                maDatLich, transferAmount, refCode);

        return Map.of(
                "success", true,
                "maDatLich", maDatLich,
                "amount", transferAmount,
                "message", "Đối soát cọc giữ chân thành công"
        );
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
}
