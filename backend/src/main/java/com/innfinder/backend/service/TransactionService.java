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
import org.springframework.cache.annotation.CacheEvict;
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

    public synchronized String generateMaGiaoDich() {
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
    @CacheEvict(value = "admin_statistics", allEntries = true)
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
     * Tối ưu hóa: Dùng câu lệnh SQL aggregate tính toán trực tiếp dưới DB thay vì load toàn bộ giao dịch vào memory
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

        Long tongDaThu = giaoDichRepository.sumSoTienByNguoiDungAndLoaiGiaoDichNotAndTrangThai(
                user.getMaNguoiDung(), "RUT_TIEN", TrangThaiGD.THANH_CONG);

        // Chỉ tính các lệnh rút tiền đã được phê duyệt THANH_CONG
        Long tongDaRut = giaoDichRepository.sumSoTienByNguoiDungAndLoaiGiaoDichAndTrangThai(
                user.getMaNguoiDung(), "RUT_TIEN", TrangThaiGD.THANH_CONG);

        return LandlordWalletResponse.builder()
                .soDu(chuTro.getSoDu() != null ? chuTro.getSoDu() : 0L)
                .diemUyTin(chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100)
                .dsTaiKhoanNganHang(dsBank)
                .tongDaThu(tongDaThu != null ? tongDaThu : 0L)
                .tongDaRut(tongDaRut != null ? tongDaRut : 0L)
                .build();
    }

    /**
     * Chủ trọ tạo yêu cầu rút tiền về tài khoản ngân hàng
     * Sử dụng Khóa bi quan findByIdForUpdate để chống Double Spending khi gửi nhiều request rút tiền cùng lúc
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public TransactionResponse taoYeuCauRutTien(String username, WithdrawRequest request) {
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ChuTro chuTro = chuTroRepository.findByIdForUpdate(user.getMaNguoiDung())
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

    /**
     * Khách hàng cập nhật lại thông tin STK khi yêu cầu hoàn cọc trước đó bị từ chối do sai STK
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public TransactionResponse capNhatLaiStkHoanCoc(String username, String maGiaoDich, com.innfinder.backend.dto.appointment.RetryRefundRequest request) {
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        GiaoDich gd = giaoDichRepository.findByIdForUpdate(maGiaoDich)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (!gd.getNguoiDung().getMaNguoiDung().equals(user.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (!"HOAN_COC".equalsIgnoreCase(gd.getLoaiGiaoDich())) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        if (gd.getTrangThai() != TrangThaiGD.THAT_BAI && gd.getTrangThai() != TrangThaiGD.CHO_THANH_TOAN) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        String tenNganHang = request.getTenNganHang().trim();
        String soTaiKhoan = request.getSoTaiKhoan().trim();
        String tenChuTaiKhoan = (request.getTenChuTaiKhoan() != null && !request.getTenChuTaiKhoan().isBlank())
                ? request.getTenChuTaiKhoan().trim().toUpperCase()
                : (user.getHoVaTen() != null ? user.getHoVaTen() : user.getTenDangNhap());

        // Tự động lưu/liên kết tài khoản ngân hàng mới này nếu chưa có
        try {
            com.innfinder.backend.entity.TaiKhoanNganHang newBank = com.innfinder.backend.entity.TaiKhoanNganHang.builder()
                    .nguoiDung(user)
                    .tenNganHang(tenNganHang)
                    .soTaiKhoan(soTaiKhoan)
                    .tenChuTaiKhoan(tenChuTaiKhoan)
                    .build();
            boolean alreadyExists = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                    .stream()
                    .anyMatch(b -> b.getSoTaiKhoan().equalsIgnoreCase(soTaiKhoan));
            if (!alreadyExists) {
                taiKhoanNganHangRepository.save(newBank);
            }
        } catch (Exception ignored) {}

        String timeNow = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String oldNote = gd.getNoiDung() != null ? gd.getNoiDung() : "";
        if (oldNote.contains(" [TỪ CHỐI")) {
            oldNote = oldNote.substring(0, oldNote.indexOf(" [TỪ CHỐI")).trim();
        }
        if (oldNote.contains(" về TK ")) {
            oldNote = oldNote.substring(0, oldNote.indexOf(" về TK ")).trim();
        }

        String newNote = oldNote + " về TK " + tenNganHang + " - " + soTaiKhoan + " (" + tenChuTaiKhoan + ")"
                + " [KHÁCH ĐÃ CẬP NHẬT LẠI STK lúc " + timeNow + "]";

        gd.setNoiDung(newNote);
        gd.setTrangThai(TrangThaiGD.CHO_THANH_TOAN);
        gd = giaoDichRepository.save(gd);

        return TransactionResponse.fromEntity(gd);
    }
}
