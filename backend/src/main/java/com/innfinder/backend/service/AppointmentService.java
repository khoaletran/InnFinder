package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentDecisionRequest;
import com.innfinder.backend.dto.appointment.AppointmentResponse;
import com.innfinder.backend.dto.appointment.DepositStatusResponse;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.TaiKhoanNganHang;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
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
public class AppointmentService {

    private final PhieuDatLichRepository phieuDatLichRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhongTroRepository phongTroRepository;
    private final ChuTroRepository chuTroRepository;
    private final TransactionService transactionService;
    private final GiaoDichRepository giaoDichRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;

    /**
     * Sinh mã phiếu đặt lịch theo chuẩn ISO: ĐL + yyyyMMdd + sequence 3 số
     * Ví dụ: DL20261106001
     */
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
        while (phieuDatLichRepository.existsById(candidate) || giaoDichRepository.existsByCandidateId(candidate)) {
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
     * Kiểm tra nhanh xem khách hàng đã nộp cọc giữ chân cho lịch hẹn này chưa
     * Tối ưu hóa: Dùng câu lệnh SQL COUNT(g) > 0 có Index thay vì kéo toàn bộ giao dịch vào memory
     */
    public boolean daNopCocChoLichHen(String maKhachHang, String maDatLich) {
        if (maKhachHang == null || maDatLich == null) return false;
        return giaoDichRepository.existsDepositByMaDatLich(maKhachHang, maDatLich);
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
                .thoiGianDat(LocalDateTime.now())
                .trangThai(TrangThaiDatLich.CHO_XAC_NHAN)
                .coc(tienCoc)
                .phiThu(phiThu)
                .daNhanLaiCoc(false)
                .khachHangDongY(null)
                .chuTroDongY(null)
                .build();

        PhieuDatLich savedPhieu = phieuDatLichRepository.save(phieu);

        return AppointmentResponse.fromEntity(savedPhieu, false);
    }

    /**
     * 2. Khách hàng nộp cọc giữ chân sau khi Chủ trọ đã xác nhận lịch (XAC_NHAN)
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public void nopTienCoc(String maDatLich, String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        // 1. Kiểm tra quyền sở hữu lịch hẹn
        if (!phieu.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // 2. Cho phép nộp cọc ngay khi tạo lịch (CHO_XAC_NHAN) hoặc sau khi Chủ trọ xác nhận (XAC_NHAN)
        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN &&
                phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
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
     * 2b. Kiểm tra nhanh trạng thái cọc của lịch hẹn (phục vụ Realtime Webhook / Polling)
     */
    @Transactional(readOnly = true)
    public DepositStatusResponse kiemTraTrangThaiCoc(String maDatLich) {
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
                || phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN
                || phieu.getTrangThai() == TrangThaiDatLich.HOAN_THANH
                || (phieu.getKhachHang() != null && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich));

        return DepositStatusResponse.builder()
                .maDatLich(phieu.getMaDatLich())
                .daNopCoc(daNop)
                .soTienCoc(phieu.getCoc())
                .trangThaiLich(phieu.getTrangThai().name())
                .build();
    }

    /**
     * 3. Khách hàng xem danh sách lịch hẹn của mình (kèm cờ đã nộp cọc)
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> layLichHenCuaToi(String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);

        return phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByThoiGianDatDesc(khachHang.getMaNguoiDung())
                .stream()
                .map(phieu -> {
                    boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
                            || phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN
                            || phieu.getTrangThai() == TrangThaiDatLich.HOAN_THANH
                            || daNopCocChoLichHen(khachHang.getMaNguoiDung(), phieu.getMaDatLich());
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
                    boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
                            || phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN
                            || phieu.getTrangThai() == TrangThaiDatLich.HOAN_THANH
                            || (phieu.getKhachHang() != null && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), phieu.getMaDatLich()));
                    return java.util.Map.entry(phieu, daNop);
                })
                .filter(entry -> {
                    PhieuDatLich phieu = entry.getKey();
                    boolean daNop = entry.getValue();
                    boolean coYeuCauCoc = phieu.getCoc() != null && phieu.getCoc() > 0;
                    if (coYeuCauCoc && phieu.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN) {
                        return daNop;
                    }
                    return true;
                })
                .map(entry -> AppointmentResponse.fromEntity(entry.getKey(), entry.getValue()))
                .toList();
    }

    /**
     * 5. Chủ trọ xác nhận đồng ý lịch hẹn (CHO_XAC_NHAN -> XAC_NHAN)
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public void xacNhanLichHen(String maDatLich, String username) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // RÀNG BUỘC SWIMLANE: Nếu lịch hẹn yêu cầu cọc thì khách hàng bắt buộc phải nộp cọc trước khi chủ trọ xác nhận
        if (phieu.getCoc() != null && phieu.getCoc() > 0) {
            boolean daNop = phieu.getKhachHang() != null &&
                    daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
            if (!daNop) {
                throw new AppException(ErrorCode.DEPOSIT_NOT_PAID_YET);
            }
        }

        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieuDatLichRepository.save(phieu);
    }

    /**
     * 6. Chủ trọ từ chối lịch hẹn (Hoàn cọc nếu khách đã nộp cọc)
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
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
     * 7. BƯỚC 4 SWIMLANE MỚI: Khách hàng bấm xác nhận "Đã nhận lại cọc từ Chủ trọ ngoài đời thực"
     * Quyền thụ hưởng số tiền cọc tại Hệ thống chính thức chuyển sang cho Chủ trọ ("thế chân").
     */
    @Transactional
    public AppointmentResponse khachHangXacNhanDaNhanCoc(String maDatLich, String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (!phieu.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_ALREADY_REFUNDED);
        }

        phieu.setDaNhanLaiCoc(true);
        PhieuDatLich saved = phieuDatLichRepository.save(phieu);

        boolean daNop = daNopCocChoLichHen(khachHang.getMaNguoiDung(), maDatLich);
        return AppointmentResponse.fromEntity(saved, daNop);
    }

    /**
     * 8. BƯỚC 5a SWIMLANE MỚI: Khách hàng đưa ra quyết định độc lập (Thuê / Không thuê)
     * Ràng buộc: Bắt buộc daNhanLaiCoc = true nếu phòng có cọc > 0.
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AppointmentResponse khachHangDuaRaQuyetDinh(String maDatLich, String username, AppointmentDecisionRequest request) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (!phieu.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Bắt buộc khách đã nhận lại cọc trực tiếp ngoài đời (nếu phòng trọ có cọc > 0)
        boolean coYeuCauCoc = phieu.getCoc() != null && phieu.getCoc() > 0;
        if (coYeuCauCoc && !Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_NOT_REFUNDED_YET);
        }

        phieu.setKhachHangDongY(request.getDongY());
        if (Boolean.FALSE.equals(request.getDongY()) && request.getLiDoTuChoi() != null && !request.getLiDoTuChoi().isBlank()) {
            phieu.setLiDoHuy("Khách hàng không thuê: " + request.getLiDoTuChoi());
        }

        xuLyKetQuaLichHen(phieu);

        boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0) || daNopCocChoLichHen(khachHang.getMaNguoiDung(), maDatLich);
        return AppointmentResponse.fromEntity(phieu, daNop);
    }

    /**
     * 9. BƯỚC 5b SWIMLANE MỚI: Chủ trọ đưa ra quyết định độc lập (Đồng ý cho thuê / Từ chối cho thuê)
     * Ràng buộc: Bắt buộc daNhanLaiCoc = true nếu phòng có cọc > 0.
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AppointmentResponse chuTroDuaRaQuyetDinh(String maDatLich, String username, AppointmentDecisionRequest request) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Bắt buộc khách đã xác nhận nhận lại cọc (nếu phòng trọ có cọc > 0)
        boolean coYeuCauCoc = phieu.getCoc() != null && phieu.getCoc() > 0;
        if (coYeuCauCoc && !Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_NOT_REFUNDED_YET);
        }

        phieu.setChuTroDongY(request.getDongY());
        if (Boolean.FALSE.equals(request.getDongY()) && request.getLiDoTuChoi() != null && !request.getLiDoTuChoi().isBlank()) {
            phieu.setLiDoHuy("Chủ trọ từ chối cho thuê: " + request.getLiDoTuChoi());
        }

        xuLyKetQuaLichHen(phieu);

        boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
                || (phieu.getKhachHang() != null && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich));
        return AppointmentResponse.fromEntity(phieu, daNop);
    }

    /**
     * 10. MA TRẬN XỬ LÝ TỰ ĐỘNG THEO QUY TRÌNH SWIMLANE (BƯỚC 6):
     * - Nếu cả 2 cùng đồng ý: HOAN_THANH, giải ngân (coc - phiThu) cho chủ trọ, thu hoa hồng sàn phiThu.
     * - Nếu có ít nhất 1 bên từ chối: HUY, hoàn 100% coc cho chủ trọ (bù tiền đã ứng), thu phí = 0 VNĐ.
     */
    private void xuLyKetQuaLichHen(PhieuDatLich phieu) {
        long coc = phieu.getCoc() != null ? phieu.getCoc() : 0L;
        long phiThu = phieu.getPhiThu() != null ? phieu.getPhiThu() : 0L;
        PhongTro phongTro = phieu.getPhongTro();
        ChuTro chuTro = (phongTro != null) ? phongTro.getChuPhongTro() : null;

        // KỊCH BẢN 2: CÓ ÍT NHẤT 1 BÊN TỪ CHỐI (false) - Quyết toán ngay lập tức không để kẹt deadlock
        boolean coBenTuChoi = Boolean.FALSE.equals(phieu.getKhachHangDongY()) || Boolean.FALSE.equals(phieu.getChuTroDongY());
        if (coBenTuChoi) {
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            if (phieu.getLiDoHuy() == null || phieu.getLiDoHuy().isBlank()) {
                phieu.setLiDoHuy("Lịch hẹn kết thúc: Có bên xác nhận không thuê phòng");
            }
            phieuDatLichRepository.save(phieu);

            // Giữ nguyên trạng thái phòng trọ DA_DUYET để tiếp tục hiển thị đón khách khác
            if (phongTro != null) {
                phongTro.setTrangThai(TrangThaiPhongTro.DA_DUYET);
                phongTroRepository.save(phongTro);
            }

            // Sàn hoàn trả đủ 100% cọc (coc) vào ví Chủ trọ (Khóa bi quan để chống race condition ghi đè số dư)
            if (chuTro != null && coc > 0) {
                ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                chuTroLocked.setSoDu(chuTroLocked.getSoDu() + coc);
                chuTroRepository.save(chuTroLocked);

                transactionService.taoGiaoDich(
                        chuTroLocked.getNguoiDung(),
                        coc,
                        "HOAN_COC",
                        "Hoàn 100% cọc thế chân xem phòng " + (phongTro != null ? phongTro.getMaPhongTro() : "") +
                                " (Không thuê sau khi xem thực tế)",
                        TrangThaiGD.THANH_CONG
                );
            }
            return;
        }

        // KỊCH BẢN 1: CẢ 2 BÊN CÙNG ĐỒNG Ý THUÊ (true && true)
        if (Boolean.TRUE.equals(phieu.getKhachHangDongY()) && Boolean.TRUE.equals(phieu.getChuTroDongY())) {
            phieu.setTrangThai(TrangThaiDatLich.HOAN_THANH);
            phieuDatLichRepository.save(phieu);

            // Phòng trọ hoàn tất thuê, tự động ẩn khỏi tìm kiếm
            if (phongTro != null) {
                phongTro.setTrangThai(TrangThaiPhongTro.HOAN_THANH);
                phongTroRepository.save(phongTro);
            }

            // Giải ngân (coc - phiThu) vào ví chủ trọ (Khóa bi quan để chống race condition ghi đè số dư)
            long thucNhanChuTro = Math.max(0L, coc - phiThu);
            if (chuTro != null && thucNhanChuTro > 0) {
                ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                chuTroLocked.setSoDu(chuTroLocked.getSoDu() + thucNhanChuTro);
                chuTroRepository.save(chuTroLocked);

                transactionService.taoGiaoDich(
                        chuTroLocked.getNguoiDung(),
                        thucNhanChuTro,
                        "CONG_TIEN_COC",
                        "Tiền cọc thuê phòng " + (phongTro != null ? phongTro.getMaPhongTro() : "") +
                                " (Đã trừ hoa hồng sàn " + phiThu + " VNĐ)",
                        TrangThaiGD.THANH_CONG
                );
            }
            return;
        }

        // Nếu 1 bên chọn true còn bên kia vẫn là null: Lưu trạng thái và chờ
        phieuDatLichRepository.save(phieu);
    }

    /**
     * Backward-compatible legacy endpoints
     */
    @Transactional
    @Deprecated
    public void hoanThanhLichHen(String maDatLich, String username) {
        chuTroDuaRaQuyetDinh(maDatLich, username, new AppointmentDecisionRequest(true, null));
    }

    @Transactional
    @Deprecated
    public void khachHangXacNhanThue(String maDatLich, String username) {
        khachHangDuaRaQuyetDinh(maDatLich, username, new AppointmentDecisionRequest(true, null));
    }

    /**
     * 11. HỦY LỊCH HẸN TRƯỚC GIỜ HẸN HOẶC TRONG QUÁ TRÌNH
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
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

        // Xử lý dòng tiền hoàn cọc dựa trên cờ daNhanLaiCoc
        if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            // Khách đã nhận lại cọc từ chủ trọ ngoài đời -> tiền cọc trên sàn hoàn về ví Chủ trọ
            String nguoiHuy = isKhachHang ? "Khách hàng hủy sau khi xem" : "Chủ trọ hủy sau khi xem";
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieu.setLiDoHuy(nguoiHuy + ": " + request.getLiDoHuy());
            phieuDatLichRepository.save(phieu);

            if (phieu.getCoc() > 0 && phieu.getPhongTro().getChuPhongTro() != null) {
                ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
                ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                chuTroLocked.setSoDu(chuTroLocked.getSoDu() + phieu.getCoc());
                chuTroRepository.save(chuTroLocked);
                transactionService.taoGiaoDich(
                        chuTroLocked.getNguoiDung(),
                        phieu.getCoc(),
                        "HOAN_COC",
                        "Hoàn cọc thế chân xem phòng " + phieu.getPhongTro().getMaPhongTro() + " (Lịch bị hủy sau khi xem)",
                        TrangThaiGD.THANH_CONG
                );
            }
            return;
        }

        // Trường hợp chưa gặp mặt hoặc chưa nhận lại cọc ngoài đời thực
        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);

        if (isKhachHang) {
            // 1. Khách hàng hủy khi chờ chủ trọ duyệt (CHO_XAC_NHAN): Luôn hoàn 100% hợp lệ
            if (phieu.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN) {
                phieu.setTrangThai(TrangThaiDatLich.HUY);
                phieu.setLiDoHuy("Khách hàng hủy khi chờ duyệt: " + request.getLiDoHuy());
                phieuDatLichRepository.save(phieu);

                if (daNop && phieu.getCoc() > 0) {
                    taoGiaoDichHoanCocChoKhach(phieu, "Khách hàng hủy khi chờ duyệt");
                }
                return;
            }

            // 2. Khách hàng hủy khi đã XÁC NHẬN: Áp dụng mốc 2 tiếng
            boolean isSatGio = phieu.getNgayHen() != null && LocalDateTime.now().isAfter(phieu.getNgayHen().minusHours(2));

            if (!isSatGio) {
                // Hủy hợp lệ (trước giờ hẹn >= 2 tiếng) -> Hoàn 100% cọc
                phieu.setTrangThai(TrangThaiDatLich.HUY);
                phieu.setLiDoHuy("Khách hàng hủy hợp lệ (> 2h): " + request.getLiDoHuy());
                phieuDatLichRepository.save(phieu);

                if (daNop && phieu.getCoc() > 0) {
                    taoGiaoDichHoanCocChoKhach(phieu, "Khách hàng hủy hợp lệ (> 2h)");
                }
            } else {
                // Hủy vi phạm (sát giờ < 2 tiếng) -> Tịch thu cọc, bồi thường cho Chủ trọ
                phieu.setTrangThai(TrangThaiDatLich.HUY);
                phieu.setLiDoHuy("Khách hủy sát giờ (< 2h): " + request.getLiDoHuy() + " (Tịch thu cọc bồi thường Chủ trọ)");
                phieuDatLichRepository.save(phieu);

                if (daNop && phieu.getCoc() > 0 && phieu.getPhongTro().getChuPhongTro() != null) {
                    ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
                    ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                    chuTroLocked.setSoDu(chuTroLocked.getSoDu() + phieu.getCoc());
                    chuTroRepository.save(chuTroLocked);

                    transactionService.taoGiaoDich(
                            chuTroLocked.getNguoiDung(),
                            phieu.getCoc(),
                            "BOI_THUONG_HUY_SAT_GIO",
                            "Bồi thường tiền cọc do khách hủy sát giờ lịch " + maDatLich,
                            TrangThaiGD.THANH_CONG
                    );
                }
            }
        } else {
            // Chủ trọ hủy lịch: Luôn hoàn 100% cọc cho khách + trừ điểm uy tín nếu hủy sau khi đã duyệt
            if (phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN && phieu.getPhongTro().getChuPhongTro() != null) {
                ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
                ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                chuTroLocked.setDiemUyTin(Math.max(0, chuTroLocked.getDiemUyTin() - 5));
                chuTroRepository.save(chuTroLocked);
                phieu.setLiDoHuy("Chủ trọ hủy sau khi xác nhận: " + request.getLiDoHuy() + " (Bị trừ 5 điểm uy tín)");
            } else {
                phieu.setLiDoHuy("Chủ trọ từ chối/hủy: " + request.getLiDoHuy());
            }

            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieuDatLichRepository.save(phieu);

            if (daNop && phieu.getCoc() > 0) {
                taoGiaoDichHoanCocChoKhach(phieu, "Chủ trọ hủy lịch hẹn");
            }
        }
    }

    /**
     * Hàm phụ trợ tạo giao dịch hoàn cọc cho khách hàng để Admin đối soát duyệt
     */
    private void taoGiaoDichHoanCocChoKhach(PhieuDatLich phieu, String lyDo) {
        List<TaiKhoanNganHang> banks = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(phieu.getKhachHang().getMaNguoiDung());
        String bankNote = "";
        if (!banks.isEmpty()) {
            TaiKhoanNganHang primaryBank = banks.get(0);
            bankNote = " về TK " + primaryBank.getTenNganHang() + " - " + primaryBank.getSoTaiKhoan()
                    + (primaryBank.getTenChuTaiKhoan() != null && !primaryBank.getTenChuTaiKhoan().isBlank()
                        ? " (" + primaryBank.getTenChuTaiKhoan() + ")" : "");
        }
        transactionService.taoGiaoDich(
                phieu.getKhachHang(),
                phieu.getCoc(),
                "HOAN_COC",
                lyDo + " lịch " + phieu.getMaDatLich() + bankNote,
                TrangThaiGD.CHO_THANH_TOAN
        );
    }

    /**
     * Chủ trọ báo cáo khách không đến xem phòng (No-show) sau giờ hẹn 30 phút.
     * Tiền cọc giữ chân được bồi thường chuyển thẳng vào ví Chủ trọ.
     */
    @Transactional
    public void baoCaoNoShow(String maDatLich, String username) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username);

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Chỉ được báo sau giờ hẹn 30 phút
        if (phieu.getNgayHen() != null && LocalDateTime.now().isBefore(phieu.getNgayHen().plusMinutes(30))) {
            throw new AppException(ErrorCode.NO_SHOW_TOO_EARLY);
        }

        // Không cho báo nếu đã nhận cọc trực tiếp
        if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_ALREADY_REFUNDED);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Chủ trọ báo khách vắng mặt (No-show): Tịch thu cọc bồi thường Chủ trọ");
        phieuDatLichRepository.save(phieu);

        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() > 0 && phieu.getPhongTro().getChuPhongTro() != null) {
            ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
            ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
            chuTroLocked.setSoDu(chuTroLocked.getSoDu() + phieu.getCoc());
            chuTroRepository.save(chuTroLocked);

            transactionService.taoGiaoDich(
                    chuTroLocked.getNguoiDung(),
                    phieu.getCoc(),
                    "BOI_THUONG_NO_SHOW",
                    "Bồi thường tiền cọc do khách vắng mặt (No-show) lịch " + maDatLich,
                    TrangThaiGD.THANH_CONG
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
