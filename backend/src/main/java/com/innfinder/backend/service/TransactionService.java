package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.dto.landlord.LandlordWalletResponse;
import com.innfinder.backend.dto.landlord.WithdrawRequest;
import com.innfinder.backend.dto.user.BankAccountResponse;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.TaiKhoanNganHangRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final GiaoDichRepository giaoDichRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ChuTroRepository chuTroRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;

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
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        List<GiaoDich> dsGiaoDich = giaoDichRepository.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(user.getMaNguoiDung());
        return dsGiaoDich.stream()
                .map(TransactionResponse::fromEntity)
                .toList();
    }

    /**
     * Lấy thông tin Ví của Chủ trọ (Số dư, điểm uy tín, danh sách ngân hàng liên kết)
     */
    @Transactional(readOnly = true)
    public LandlordWalletResponse getLandlordWalletInfo(String username) {
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ChuTro chuTro = chuTroRepository.findByIdForUpdate(user.getMaNguoiDung())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));

        List<BankAccountResponse> dsBank = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                .stream()
                .map(tk -> BankAccountResponse.builder()
                        .soTaiKhoan(tk.getSoTaiKhoan())
                        .tenNganHang(tk.getTenNganHang())
                        .build())
                .toList();

        List<GiaoDich> dsGD = giaoDichRepository.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(user.getMaNguoiDung());

        long tongDaThu = dsGD.stream()
                .filter(gd -> !"RUT_TIEN".equalsIgnoreCase(gd.getLoaiGiaoDich()) && gd.getTrangThai() == TrangThaiGD.THANH_CONG)
                .mapToLong(GiaoDich::getSoTien)
                .sum();

        long tongDaRut = dsGD.stream()
                .filter(gd -> "RUT_TIEN".equalsIgnoreCase(gd.getLoaiGiaoDich()))
                .mapToLong(GiaoDich::getSoTien)
                .sum();

        return LandlordWalletResponse.builder()
                .soDu(chuTro.getSoDu() != null ? chuTro.getSoDu() : 0L)
                .diemUyTin(chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100)
                .dsTaiKhoanNganHang(dsBank)
                .tongDaThu(tongDaThu)
                .tongDaRut(tongDaRut)
                .build();
    }

    /**
     * Chủ trọ tạo yêu cầu rút tiền về tài khoản ngân hàng
     */
    @Transactional
    public TransactionResponse taoYeuCauRutTien(String username, WithdrawRequest request) {
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ChuTro chuTro = chuTroRepository.findById(user.getMaNguoiDung())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));

        long soDuHienTai = chuTro.getSoDu() != null ? chuTro.getSoDu() : 0L;
        if (request.getSoTien() > soDuHienTai) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        // Trừ số dư khả dụng
        chuTro.setSoDu(soDuHienTai - request.getSoTien());
        chuTroRepository.save(chuTro);

        // Ghi nhận giao dịch rút tiền
        String noiDung = "Rút tiền về tài khoản " + request.getTenNganHang() + " (" + request.getSoTaiKhoan() + ")";
        if (request.getGhiChu() != null && !request.getGhiChu().isBlank()) {
            noiDung += " - Ghi chú: " + request.getGhiChu().trim();
        }

        GiaoDich gd = taoGiaoDich(user, request.getSoTien(), "RUT_TIEN", noiDung, TrangThaiGD.CHO_THANH_TOAN);
        return TransactionResponse.fromEntity(gd);
    }
}
