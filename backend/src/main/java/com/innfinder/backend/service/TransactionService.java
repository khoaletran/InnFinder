package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final GiaoDichRepository giaoDichRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private synchronized String generateMaGiaoDich() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "GD" + datePart;
        String maxId = giaoDichRepository.findMaxMaGiaoDichByPrefix(prefix);

        int nextSequence = 1;
        if (maxId != null && maxId.length() == 13 && maxId.startsWith(prefix)) {
            try {
                String suffix = maxId.substring(10);
                nextSequence = Integer.parseInt(suffix) + 1;
            } catch (NumberFormatException ignored) {
                nextSequence = 1;
            }
        }

        String candidate = String.format("%s%03d", prefix, nextSequence);
        while (giaoDichRepository.existsById(candidate)) {
            nextSequence++;
            candidate = String.format("%s%03d", prefix, nextSequence);
        }
        return candidate;
    }
    /**
     * Hàm phụ trợ ghi nhận giao dịch vào CSDL
     */
    @Transactional
    public GiaoDich taoGiaoDich(NguoiDung nguoiDung, Long soTien, String loaiGiaoDich, String noiDung, TrangThaiGD trangThai) {
        GiaoDich gd = GiaoDich.builder()
                .maGiaoDich(generateMaGiaoDich())
                .nguoiDung(nguoiDung)
                .soTien(soTien)
                .loaiGiaoDich(loaiGiaoDich)
                .noiDung(noiDung)
                .ngayGiaoDich(LocalDateTime.now())
                .trangThai(trangThai)
                .build();
        return giaoDichRepository.save(gd);
    }
    /**
     * Tra cứu lịch sử giao dịch của người dùng đang đăng nhập
     * Dùng cho endpoint: GET /api/transactions/my-history
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> layLichSuGiaoDich(String username) {
        // Tìm NguoiDung từ username trong Token để lấy đúng mã định danh ND...
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        List<GiaoDich> dsGiaoDich = giaoDichRepository.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(user.getMaNguoiDung());
        return dsGiaoDich.stream()
                .map(TransactionResponse::fromEntity)
                .toList();
    }
}
