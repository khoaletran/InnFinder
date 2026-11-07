package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentResponse;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final PhieuDatLichRepository phieuDatLichRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhongTroRepository phongTroRepository;
    private final ChuTroRepository chuTroRepository;
    private final TransactionService transactionService;
    private final GiaoDichRepository giaoDichRepository;

    private synchronized String generateMaDatLich() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "DL" + datePart;
        String maxId = phieuDatLichRepository.findMaxMaDatLichByPrefix(prefix);

        int nextSequence = 1;
        if (maxId != null && maxId.length() == 13 && maxId.startsWith(prefix)) {
            try {
                String suffix = maxId.substring(10); // 3 số cuối
                nextSequence = Integer.parseInt(suffix) + 1;
            } catch (NumberFormatException ignored) {
                nextSequence = 1;
            }
        }

        String candidate = String.format("%s%03d", prefix, nextSequence);
        while (phieuDatLichRepository.existsById(candidate)) {
            nextSequence++;
            candidate = String.format("%s%03d", prefix, nextSequence);
        }
        return candidate;
    }

    /**
     * Hàm helper lấy NguoiDung từ username đăng nhập trong Token
     */
    private NguoiDung getNguoiDungByUsername(String username) {
        return nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * Kiểm tra xem khách hàng đã nộp cọc giữ chân cho lịch hẹn này chưa
     */
    private boolean daNopCocChoLichHen(String maKhachHang, String maDatLich) {
        return giaoDichRepository.findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(maKhachHang)
                .stream()
                .anyMatch(gd -> "COC_XEM_PHONG".equals(gd.getLoaiGiaoDich()) &&
                        gd.getNoiDung() != null &&
                        gd.getNoiDung().contains(maDatLich));
    }

    /**
     * 1. Khách hàng tạo lịch hẹn xem phòng (Chưa trừ tiền cọc, chờ chủ trọ xác nhận)
     */
    @Transactional
    public AppointmentResponse taoDatLich(String username, AppointmentCreateRequest request) {
        // Validate thời gian hẹn
        if (request.getNgayHen().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.APPOINTMENT_TIME_INVALID);
        }

        NguoiDung khachHang = getNguoiDungByUsername(username);

        PhongTro phongTro = phongTroRepository.findByMaPhongTro(request.getMaPhongTro())
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        // Không cho phép chủ nhà tự đặt phòng của chính mình
        if (phongTro.getChuPhongTro() != null &&
                phongTro.getChuPhongTro().getMaChuTro().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.CANNOT_BOOK_OWN_ROOM);
        }

        // Lấy tiền cọc giữ chân và phí thu hoa hồng theo Loại phòng -> Cọc
        Long tienCoc = 0L;
        Long phiThu = 0L;
        if (phongTro.getLoaiPhong() != null && phongTro.getLoaiPhong().getCoc() != null) {
            tienCoc = (long) phongTro.getLoaiPhong().getCoc().getSoTienCoc();
            if (phongTro.getLoaiPhong().getCoc().getPhiThu() != null) {
                phiThu = (long) phongTro.getLoaiPhong().getCoc().getPhiThu().getPhi();
            }
        }
        String maDatLich = generateMaDatLich();
        PhieuDatLich phieu = PhieuDatLich.builder()
                .maDatLich(maDatLich)
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(request.getNgayHen())
                .trangThai(TrangThaiDatLich.CHO_XAC_NHAN)
                .coc(tienCoc)
                .phiThu(phiThu)
                .build();

        PhieuDatLich savedPhieu = phieuDatLichRepository.save(phieu);

        return AppointmentResponse.fromEntity(savedPhieu, false);
    }

    /**
     * 2. Khách hàng nộp cọc giữ chân sau khi Chủ trọ đã xác nhận lịch (XAC_NHAN)
     */
    @Transactional
    public void nopTienCoc(String maDatLich, String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        // 1. Kiểm tra quyền sở hữu lịch hẹn
        if (!phieu.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED  );
        }

        // 2. Chỉ được nộp cọc khi Chủ trọ đã xác nhận lịch (XAC_NHAN)
        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // 3. Tránh nộp cọc trùng lặp
        boolean daNop = daNopCocChoLichHen(khachHang.getMaNguoiDung(), maDatLich);
        if (daNop) {
            return;
        }

        // 4. Ghi nhận giao dịch cọc giữ chân vào sổ cái GiaoDich
        if (phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    khachHang,
                    phieu.getCoc(),
                    "COC_XEM_PHONG",
                    "Tạm giữ cọc xem phòng " + phieu.getPhongTro().getMaPhongTro() + " (Mã lịch: " + maDatLich + ")",
                    TrangThaiGD.THANH_CONG
            );
        }
    }

    /**
     * 3. Khách hàng xem danh sách lịch hẹn của mình (kèm cờ đã nộp cọc)
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> layLichHenCuaToi(String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        List<GiaoDich> userTransactions = giaoDichRepository
                .findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(khachHang.getMaNguoiDung());

        return phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByNgayHenDesc(khachHang.getMaNguoiDung())
                .stream()
                .map(phieu -> {
                    boolean daNop = userTransactions.stream().anyMatch(gd ->
                            "COC_XEM_PHONG".equals(gd.getLoaiGiaoDich()) &&
                            gd.getNoiDung() != null &&
                            gd.getNoiDung().contains(phieu.getMaDatLich())
                    );
                    return AppointmentResponse.fromEntity(phieu, daNop);
                })
                .toList();
    }

    /**
     * 4. Chủ trọ xem danh sách khách hẹn xem các phòng của mình (kèm cờ đã nộp cọc)
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> layLichHenChoChuTro(String username) {
        NguoiDung chuTro = getNguoiDungByUsername(username);
        return phieuDatLichRepository.findAppointmentsByLandlordId(chuTro.getMaNguoiDung())
                .stream()
                .map(phieu -> {
                    boolean daNop = phieu.getKhachHang() != null &&
                            daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), phieu.getMaDatLich());
                    return AppointmentResponse.fromEntity(phieu, daNop);
                })
                .toList();
    }

    /**
     * 5. Chủ trọ xác nhận đồng ý lịch hẹn
     */
    @Transactional
    public void xacNhanLichHen(String maDatLich, String username) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieuDatLichRepository.save(phieu);
    }

    /**
     * 6. Chủ trọ từ chối lịch hẹn (Hoàn cọc nếu khách đã nộp cọc)
     */
    @Transactional
    public void tuChoiLichHen(String maDatLich, String username, AppointmentCancelRequest request) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Chủ trọ từ chối: " + request.getLiDoHuy());
        phieuDatLichRepository.save(phieu);

        // Chỉ hoàn cọc nếu khách hàng đã thực sự nộp cọc trước đó
        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC",
                    "Hoàn cọc do chủ trọ từ chối lịch hẹn " + maDatLich,
                    TrangThaiGD.HOAN_TIEN
            );
        }
    }

    /**
     * 7. Chủ trọ xác nhận khách đã đến xem xong (Hoàn tất & Hoàn cọc cho khách, thu hoa hồng)
     */
    @Transactional
    public void hoanThanhLichHen(String maDatLich, String username) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // 1. Cập nhật phiếu đặt lịch sang HOAN_THANH
        phieu.setTrangThai(TrangThaiDatLich.HOAN_THANH);
        phieuDatLichRepository.save(phieu);

        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);

        // 2. Hoàn trả 100% cọc giữ chân cho khách hàng (nếu khách đã nộp cọc)
        if (daNop && phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC",
                    "Hoàn 100% cọc giữ chân xem phòng " + phieu.getPhongTro().getMaPhongTro(),
                    TrangThaiGD.HOAN_TIEN
            );
        }

        // 3. Nếu hai bên chốt thuê thành công:
        // Cập nhật trạng thái phòng trọ sang HOAN_THANH (ẩn khỏi tìm kiếm)
        PhongTro phongTro = phieu.getPhongTro();
        phongTro.setTrangThai(TrangThaiPhongTro.HOAN_THANH);
        phongTroRepository.save(phongTro);

        // Chuyển tiền (tiền cọc - phí hoa hồng hệ thống) vào ví chủ trọ (nếu khách đã nộp cọc)
        long thucNhanChuTro = phieu.getCoc() - phieu.getPhiThu();
        if (daNop && thucNhanChuTro > 0 && phongTro.getChuPhongTro() != null) {
            ChuTro chuTro = phongTro.getChuPhongTro();
            chuTro.setSoDu(chuTro.getSoDu() + thucNhanChuTro);
            chuTroRepository.save(chuTro);

            transactionService.taoGiaoDich(
                    chuTro.getNguoiDung(),
                    thucNhanChuTro,
                    "CONG_TIEN_COC",
                    "Tiền cọc thuê phòng từ khách (đã trừ phí hoa hồng " + phieu.getPhiThu() + " VNĐ)",
                    TrangThaiGD.THANH_CONG
            );
        }
    }

    /**
     * 8. Hủy lịch hẹn (Dành cho Khách hàng hoặc Chủ trọ hủy)
     */
    @Transactional
    public void huyLichHen(String maDatLich, String username, AppointmentCancelRequest request) {
        NguoiDung currentUser = getNguoiDungByUsername(username);
        String currentUserId = currentUser.getMaNguoiDung();

        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        boolean isKhachHang = phieu.getKhachHang().getMaNguoiDung().equals(currentUserId);
        boolean isChuTro = phieu.getPhongTro().getChuPhongTro() != null &&
                phieu.getPhongTro().getChuPhongTro().getMaChuTro().equals(currentUserId);

        if (!isKhachHang && !isChuTro) {
            throw new AppException(ErrorCode.NOT_APPOINTMENT_OWNER);
        }

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN &&
                phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        String nguoiHuy = isKhachHang ? "Khách hàng hủy" : "Chủ trọ hủy";
        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy(nguoiHuy + ": " + request.getLiDoHuy());
        phieuDatLichRepository.save(phieu);

        // Chỉ hoàn cọc nếu khách hàng đã thực sự nộp cọc trước đó
        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC",
                    nguoiHuy + " lịch hẹn " + maDatLich,
                    TrangThaiGD.HOAN_TIEN
            );
        }
    }

    /**
     * Hàm phụ trợ kiểm tra lịch tồn tại và người gọi có đúng là chủ sở hữu phòng trọ
     */
    private PhieuDatLich getPhieuDatLichVaKiemTraQuyenChuTro(String maDatLich, String username) {
        NguoiDung chuTro = getNguoiDungByUsername(username);

        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (phieu.getPhongTro().getChuPhongTro() == null ||
                !phieu.getPhongTro().getChuPhongTro().getMaChuTro().equals(chuTro.getMaNguoiDung())) {
            throw new AppException(ErrorCode.NOT_APPOINTMENT_OWNER);
        }
        return phieu;
    }
}
