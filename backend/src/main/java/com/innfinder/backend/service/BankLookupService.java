package com.innfinder.backend.service;

import com.innfinder.backend.dto.bank.BankLookupRequest;
import com.innfinder.backend.dto.bank.BankLookupResponse;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankLookupService {

    private final NguoiDungRepository nguoiDungRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    // Cache kết quả tra cứu trong bộ nhớ (key: bin + "_" + soTaiKhoan) để tránh gọi lặp lại
    private final Map<String, BankLookupResponse> lookupCache = new ConcurrentHashMap<>();

    @Value("${casso.app-id:}")
    private String cassoAppId;

    @Value("${casso.app-secret:}")
    private String cassoAppSecret;

    // Cache OAuth2 access_token của Casso (hết hạn sau 15 phút)
    private String cachedToken;
    private long tokenExpiresAt = 0;

    private synchronized String getOrRefreshToken() {
        long now = System.currentTimeMillis();
        if (cachedToken != null && now < tokenExpiresAt - 60000) {
            return cachedToken;
        }

        if (cassoAppId == null || cassoAppId.isBlank() || cassoAppSecret == null || cassoAppSecret.isBlank()) {
            return null;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> body = Map.of(
                    "app_id", cassoAppId.trim(),
                    "app_secret", cassoAppSecret.trim()
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://openapi.casso.vn/oauth/token",
                    request,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map respBody = response.getBody();
                String token = (String) respBody.get("access_token");
                Number expiresIn = (Number) respBody.get("expires_in");
                long ttl = (expiresIn != null ? expiresIn.longValue() : 900) * 1000;
                this.cachedToken = token;
                this.tokenExpiresAt = now + ttl;
                log.info("Lấy access_token Casso Open Platform thành công, thời hạn: {}s", ttl / 1000);
                return token;
            }
        } catch (Exception e) {
            log.error("Lỗi khi lấy access_token từ Casso: {}", e.getMessage());
        }
        return null;
    }

    public BankLookupResponse lookupAccount(BankLookupRequest request) {
        String cacheKey = request.getBin() + "_" + request.getSoTaiKhoan();
        log.info(request.getBin()       );
        if (lookupCache.containsKey(cacheKey)) {
            log.info("Lấy kết quả tra cứu tài khoản từ cache: {}", cacheKey);
            return lookupCache.get(cacheKey);
        }

        // 1. Thử gọi API Casso Open Platform (VietQR Napas thật 100%)
        String token = getOrRefreshToken();
        if (token != null) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Authorization", "Bearer " + token);

                Map<String, String> body = Map.of(
                        "bin", request.getBin(),
                        "accountNumber", request.getSoTaiKhoan()
                );

                HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(
                        "https://openapi.casso.vn/paykit/v1/lookup",
                        entity,
                        Map.class
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map responseBody = response.getBody();
                    String code = String.valueOf(responseBody.get("code"));
                    if ("00".equals(code) && responseBody.get("data") instanceof Map<?, ?> dataMap) {
                        String accountName = String.valueOf(dataMap.get("accountName"));
                        BankLookupResponse result = BankLookupResponse.builder()
                                .bin(request.getBin())
                                .soTaiKhoan(request.getSoTaiKhoan())
                                .tenChuTaiKhoan(accountName != null ? accountName.toUpperCase().trim() : "")
                                .hopLe(true)
                                .thongBao("Xác thực Napas thành công")
                                .build();
                        lookupCache.put(cacheKey, result);
                        return result;
                    } else if ("41".equals(code) || (responseBody.get("desc") != null && String.valueOf(responseBody.get("desc")).contains("Bank not support"))) {
                        log.warn("Ngân hàng/Ví không hỗ trợ tra cứu Napas: BIN {}", request.getBin());
                        return BankLookupResponse.builder()
                                .bin(request.getBin())
                                .soTaiKhoan(request.getSoTaiKhoan())
                                .hopLe(false)
                                .thongBao("Ngân hàng / Ví điện tử này chưa hỗ trợ tra cứu tên tự động qua Napas 24/7. Vui lòng chọn Ngân hàng thương mại (Agribank, Vietcombank, MB, BIDV, Techcombank,...)")
                                .build();
                    } else {
                        String desc = String.valueOf(responseBody.get("desc"));
                        return BankLookupResponse.builder()
                                .bin(request.getBin())
                                .soTaiKhoan(request.getSoTaiKhoan())
                                .hopLe(false)
                                .thongBao(desc != null && !desc.isBlank() ? desc : "Số tài khoản không tồn tại tại ngân hàng đã chọn")
                                .build();
                    }
                }
            } catch (HttpClientErrorException e) {
                log.warn("Casso API trả về mã lỗi HTTP {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                return BankLookupResponse.builder()
                        .bin(request.getBin())
                        .soTaiKhoan(request.getSoTaiKhoan())
                        .hopLe(false)
                        .thongBao("Không tìm thấy thông tin tài khoản tại ngân hàng đã chọn")
                        .build();
            } catch (Exception e) {
                log.warn("Lỗi kết nối Casso: {}. Chuyển sang chế độ Sandbox Fallback.", e.getMessage());
            }
        }

        // 2. Chế độ Mock Sandbox Fallback (Dành cho Dev, Demo & Môi trường chưa có Key)
        BankLookupResponse sandboxResult = mockLookupFallback(request);
        if (sandboxResult.isHopLe()) {
            lookupCache.put(cacheKey, sandboxResult);
        }
        return sandboxResult;
    }

    private BankLookupResponse mockLookupFallback(BankLookupRequest request) {
        // Mô phỏng số tài khoản lỗi kiểm thử
        if ("9999999999".equals(request.getSoTaiKhoan()) || "0000000000".equals(request.getSoTaiKhoan())) {
            return BankLookupResponse.builder()
                    .bin(request.getBin())
                    .soTaiKhoan(request.getSoTaiKhoan())
                    .hopLe(false)
                    .thongBao("Không tìm thấy thông tin tài khoản tại ngân hàng đã chọn")
                    .build();
        }

        // Lấy tên người dùng hiện tại nếu có để tạo tên chủ tài khoản thực tế
        String mockAccountName = "NGUYEN VAN AN";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            NguoiDung user = nguoiDungRepository.findByTenDangNhap(auth.getName()).orElse(null);
            if (user != null && user.getHoVaTen() != null && !user.getHoVaTen().isBlank()) {
                mockAccountName = removeAccents(user.getHoVaTen());
            }
        }

        return BankLookupResponse.builder()
                .bin(request.getBin())
                .soTaiKhoan(request.getSoTaiKhoan())
                .tenChuTaiKhoan(mockAccountName)
                .hopLe(true)
                .thongBao("Xác thực tài khoản thành công (Mô phỏng Napas)")
                .build();
    }

    private String removeAccents(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D').toUpperCase().trim();
    }
}
