package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentDecisionRequest;
import com.innfinder.backend.dto.appointment.AppointmentResponse;
import com.innfinder.backend.dto.appointment.BookedSlotsResponse;
import com.innfinder.backend.dto.appointment.DepositStatusResponse;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.GiaoDich;
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

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    public static final int PAYMENT_TIMEOUT_MINUTES = 15;
    public static final int SLOT_BUFFER_MINUTES = 120;

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
        LocalDateTime now = LocalDateTime.now();
        // RÀNG BUỘC TOÀN SÀN: Lịch xem phòng phải được đặt trước giờ hẹn tối thiểu 3 giờ
        if (request.getNgayHen().isBefore(now.plusHours(3))) {
            throw new AppException(ErrorCode.APPOINTMENT_MINIMUM_ADVANCE_TIME);
        }

        NguoiDung khachHang = getNguoiDungByUsername(username);

        // Khóa bi quan phòng trọ (Pessimistic Lock) để chống tạo trùng đồng thời & kiểm tra trạng thái
        PhongTro phongTro = phongTroRepository.findByIdForUpdate(request.getMaPhongTro())
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (phongTro.getTrangThai() != TrangThaiPhongTro.DA_DUYET) {
            throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE);
        }

        // Không cho phép chủ nhà tự đặt phòng của chính mình
        if (phongTro.getChuPhongTro() != null &&
                phongTro.getChuPhongTro().getMaChuTro().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.CANNOT_BOOK_OWN_ROOM);
        }

        // Mỗi khách hàng chỉ được giữ tối đa 1 lịch hẹn đang hoạt động cho 1 phòng trọ (trừ khi lịch cũ đã HUY)
        List<PhieuDatLich> existingCustomerRoomTickets = phieuDatLichRepository
                .findByKhachHang_MaNguoiDungAndPhongTro_MaPhongTroAndTrangThaiIn(
                        khachHang.getMaNguoiDung(),
                        phongTro.getMaPhongTro(),
                        List.of(TrangThaiDatLich.CHO_XAC_NHAN, TrangThaiDatLich.XAC_NHAN)
                );
        for (PhieuDatLich existingTicket : existingCustomerRoomTickets) {
            PhieuDatLich checked = kiemTraVaTuDongHuyQuaHan(existingTicket);
            if (checked.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN ||
                    checked.getTrangThai() == TrangThaiDatLich.XAC_NHAN) {
                throw new AppException(ErrorCode.DUPLICATE_APPOINTMENT);
            }
        }

        // Kiểm tra xung đột khung giờ toàn phòng (kèm khoảng đệm 2 giờ)
        LocalDateTime bufferStart = request.getNgayHen().minusMinutes(SLOT_BUFFER_MINUTES);
        LocalDateTime bufferEnd = request.getNgayHen().plusMinutes(SLOT_BUFFER_MINUTES);
        List<PhieuDatLich> roomCandidates = phieuDatLichRepository.findAppointmentsByRoomAndTimeRange(
                phongTro.getMaPhongTro(),
                bufferStart,
                bufferEnd,
                List.of(TrangThaiDatLich.CHO_XAC_NHAN, TrangThaiDatLich.XAC_NHAN)
        );
        for (PhieuDatLich existing : roomCandidates) {
            if (existing.getNgayHen() == null) continue;
            long diffMinutes = Math.abs(Duration.between(existing.getNgayHen(), request.getNgayHen()).toMinutes());
            if (diffMinutes < SLOT_BUFFER_MINUTES && isActivelyHoldingSlot(existing, now)) {
                boolean sameUser = existing.getKhachHang() != null &&
                        existing.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung());
                throw new AppException(sameUser ? ErrorCode.DUPLICATE_APPOINTMENT : ErrorCode.APPOINTMENT_SLOT_CONFLICT);
            }
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
                .thoiGianDat(now)
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
    @Transactional
    public DepositStatusResponse kiemTraTrangThaiCoc(String maDatLich) {
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        phieu = kiemTraVaTuDongHuyQuaHan(phieu);

        boolean hasDeposit = phieu.getCoc() != null && phieu.getCoc() > 0;
        boolean daNop = !hasDeposit
                || (phieu.getKhachHang() != null && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich));

        // Hạn duyệt thực tế: min(thoiGianDat + 24h, ngayHen - 2h)
        LocalDateTime thoiGianDat = phieu.getThoiGianDat() != null ? phieu.getThoiGianDat() : phieu.getNgayHen().minusHours(24);
        LocalDateTime limit24h = thoiGianDat.plusHours(24);
        LocalDateTime limitHen = phieu.getNgayHen().minusHours(2);
        LocalDateTime hanDuyet = limit24h.isBefore(limitHen) ? limit24h : limitHen;
        LocalDateTime hanNopCoc = thoiGianDat.plusMinutes(PAYMENT_TIMEOUT_MINUTES);

        LocalDateTime now = LocalDateTime.now();
        boolean conHieuLuc = phieu.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN
                && now.isBefore(hanDuyet)
                && (!hasDeposit || daNop || now.isBefore(hanNopCoc));

        return DepositStatusResponse.builder()
                .maDatLich(phieu.getMaDatLich())
                .daNopCoc(daNop)
                .soTienCoc(phieu.getCoc())
                .trangThaiLich(phieu.getTrangThai().name())
                .hanDuyet(hanDuyet)
                .hanNopCoc(hanNopCoc)
                .conHieuLuc(conHieuLuc)
                .build();
    }

    /**
     * Lấy danh sách các khung giờ đang được giữ chỗ hợp lệ của phòng trong ngày
     */
    @Transactional(readOnly = true)
    public BookedSlotsResponse layKhungGioDaDat(String maPhongTro, LocalDate date) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusSeconds(1);
        LocalDateTime queryStart = dayStart.minusMinutes(SLOT_BUFFER_MINUTES);
        LocalDateTime queryEnd = dayEnd.plusMinutes(SLOT_BUFFER_MINUTES);
        LocalDateTime now = LocalDateTime.now();

        List<PhieuDatLich> candidates = phieuDatLichRepository.findAppointmentsByRoomAndTimeRange(
                maPhongTro,
                queryStart,
                queryEnd,
                List.of(TrangThaiDatLich.CHO_XAC_NHAN, TrangThaiDatLich.XAC_NHAN)
        );

        List<LocalDateTime> activeDateTimes = candidates.stream()
                .filter(p -> p.getNgayHen() != null && isActivelyHoldingSlot(p, now))
                .map(PhieuDatLich::getNgayHen)
                .sorted()
                .toList();

        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        List<String> bookedTimesOnDate = activeDateTimes.stream()
                .filter(dt -> dt.toLocalDate().equals(date))
                .map(dt -> dt.format(timeFormatter))
                .distinct()
                .toList();

        return BookedSlotsResponse.builder()
                .maPhongTro(maPhongTro)
                .date(date.toString())
                .bufferMinutes(SLOT_BUFFER_MINUTES)
                .bookedTimes(bookedTimesOnDate)
                .bookedDateTimes(activeDateTimes)
                .build();
    }

    private boolean isActivelyHoldingSlot(PhieuDatLich phieu, LocalDateTime now) {
        if (phieu == null) return false;
        if (phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN) {
            return true;
        }
        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            return false;
        }
        LocalDateTime thoiGianDat = phieu.getThoiGianDat() != null
                ? phieu.getThoiGianDat()
                : (phieu.getNgayHen() != null ? phieu.getNgayHen().minusHours(24) : now);
        LocalDateTime limit24h = thoiGianDat.plusHours(24);
        LocalDateTime limitHen = phieu.getNgayHen() != null ? phieu.getNgayHen().minusHours(2) : limit24h;
        LocalDateTime hanDuyet = limit24h.isBefore(limitHen) ? limit24h : limitHen;
        if (!now.isBefore(hanDuyet)) {
            return false;
        }
        boolean hasDeposit = phieu.getCoc() != null && phieu.getCoc() > 0;
        if (!hasDeposit) {
            return true;
        }
        boolean daNop = phieu.getKhachHang() != null &&
                daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), phieu.getMaDatLich());
        if (daNop) {
            return true;
        }
        // Chưa nộp cọc chỉ giữ chỗ tạm tối đa 15 phút để nhường suất cho khách khác nếu bỏ ngang
        return now.isBefore(thoiGianDat.plusMinutes(PAYMENT_TIMEOUT_MINUTES));
    }

    /**
     * Tự động kiểm tra và chuyển trạng thái HUY đối với các lịch hẹn CHO_XAC_NHAN quá hạn:
     * 1. Quá 15 phút kể từ lúc đặt mà chưa nộp cọc (nếu phòng yêu cầu cọc > 0)
     * 2. Quá 24 giờ kể từ thời điểm gửi yêu cầu (thoiGianDat + 24h)
     * 3. Hoặc thời điểm hiện tại chỉ còn cách giờ hẹn dưới 2 tiếng (now >= ngayHen - 2h)
     */
    @Transactional
    public PhieuDatLich kiemTraVaTuDongHuyQuaHan(PhieuDatLich phieu) {
        if (phieu == null || phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            return phieu;
        }

        LocalDateTime now = LocalDateTime.now();
        boolean hasDeposit = phieu.getCoc() != null && phieu.getCoc() > 0;
        boolean daNop = (phieu.getKhachHang() != null) && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), phieu.getMaDatLich());

        boolean qua15PhutChuaCoc = hasDeposit && !daNop && phieu.getThoiGianDat() != null
                && !now.isBefore(phieu.getThoiGianDat().plusMinutes(PAYMENT_TIMEOUT_MINUTES));
        if (qua15PhutChuaCoc) {
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieu.setLiDoHuy("Hệ thống tự động hủy do quá thời hạn 15 phút nộp cọc giữ chân");
            return phieuDatLichRepository.save(phieu);
        }

        boolean qua24h = phieu.getThoiGianDat() != null && now.isAfter(phieu.getThoiGianDat().plusHours(24));
        boolean satGioHen = phieu.getNgayHen() != null && now.isAfter(phieu.getNgayHen().minusHours(2));

        if (qua24h || satGioHen) {
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieu.setLiDoHuy("Hệ thống tự động hủy do chủ trọ quá hạn phản hồi");
            phieu = phieuDatLichRepository.save(phieu);

            if (daNop && hasDeposit) {
                taoGiaoDichHoanCocChoKhach(phieu, "Tự động hoàn cọc do quá hạn phản hồi", null);
            }
        }
        return phieu;
    }

    /**
     * 3. Khách hàng xem danh sách lịch hẹn của mình (kèm cờ đã nộp cọc)
     */
    @Transactional
    public List<AppointmentResponse> layLichHenCuaToi(String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);

        return phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByThoiGianDatDesc(khachHang.getMaNguoiDung())
                .stream()
                .map(this::kiemTraVaTuDongHuyQuaHan)
                .map(phieu -> {
                    boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
                            || daNopCocChoLichHen(khachHang.getMaNguoiDung(), phieu.getMaDatLich());
                    AppointmentResponse resp = AppointmentResponse.fromEntity(phieu, daNop);
                    if (phieu.getTrangThai() == TrangThaiDatLich.HUY && daNop && !Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())
                            && phieu.getCoc() != null && phieu.getCoc() > 0) {
                        List<GiaoDich> refunds = giaoDichRepository.findRefundTransactions(khachHang.getMaNguoiDung(), phieu.getMaDatLich());
                        if (!refunds.isEmpty()) {
                            resp.setThongTinHoanCoc(refunds.get(0));
                        }
                    }
                    return resp;
                })
                .toList();
    }

    /**
     * 4. Chủ trọ xem danh sách khách hẹn xem các phòng của mình (kèm cờ đã nộp cọc)
     */
    @Transactional
    public List<AppointmentResponse> layLichHenChoChuTro(String username) {
        NguoiDung chuTro = getNguoiDungByUsername(username);
        return phieuDatLichRepository.findAppointmentsByLandlordId(chuTro.getMaNguoiDung())
                .stream()
                .map(this::kiemTraVaTuDongHuyQuaHan)
                .map(phieu -> {
                    boolean daNop = (phieu.getCoc() == null || phieu.getCoc() == 0)
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
     * Trả về false nếu lịch hẹn đã quá hạn duyệt (transaction tự động commit việc chuyển HUY và hoàn cọc)
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public boolean xacNhanLichHen(String maDatLich, String username) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username, true);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Tính hạn duyệt thực tế: min(thoiGianDat + 24h, ngayHen - 2h)
        LocalDateTime thoiGianDat = phieu.getThoiGianDat() != null ? phieu.getThoiGianDat() : phieu.getNgayHen().minusHours(24);
        LocalDateTime limit24h = thoiGianDat.plusHours(24);
        LocalDateTime limitHen = phieu.getNgayHen().minusHours(2);
        LocalDateTime hanDuyet = limit24h.isBefore(limitHen) ? limit24h : limitHen;

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(hanDuyet) || now.isEqual(hanDuyet)) {
            // ĐÃ QUÁ HẠN DUYỆT: Tự động hủy và hoàn cọc (nếu có) ngay trong transaction này
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieu.setLiDoHuy("Tự động hủy: Chủ trọ quá hạn phản hồi duyệt lịch hẹn");
            phieuDatLichRepository.save(phieu);

            boolean daNop = phieu.getKhachHang() != null &&
                    daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
            if (daNop && phieu.getCoc() != null && phieu.getCoc() > 0) {
                taoGiaoDichHoanCocChoKhach(phieu, "Hoàn cọc do chủ trọ quá hạn duyệt lịch", null);
            }
            return false; // Hết hạn, transaction đã commit HUY và hoàn cọc an toàn
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
        return true;
    }

    /**
     * 6. Chủ trọ từ chối lịch hẹn (Hoàn cọc nếu khách đã nộp cọc)
     */
    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public void tuChoiLichHen(String maDatLich, String username, AppointmentCancelRequest request) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username, true);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Chủ trọ từ chối: " + request.getLiDoHuy());
        phieuDatLichRepository.save(phieu);

        // Chỉ hoàn cọc nếu khách hàng đã thực sự nộp cọc trước đó
        boolean daNop = daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() > 0) {
            taoGiaoDichHoanCocChoKhach(phieu, "Hoàn cọc do chủ trọ từ chối", null);
        }
    }

    /**
     * 7. BƯỚC 4 SWIMLANE MỚI: Khách hàng bấm xác nhận "Đã nhận lại cọc từ Chủ trọ ngoài đời thực"
     * Quyền thụ hưởng số tiền cọc tại Hệ thống chính thức chuyển sang cho Chủ trọ ("thế chân").
     */
    @Transactional
    public AppointmentResponse khachHangXacNhanDaNhanCoc(String maDatLich, String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);
        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLich)
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

        // Nếu có cọc thì bắt buộc khách phải nộp cọc trước đó
        if (phieu.getCoc() != null && phieu.getCoc() > 0) {
            boolean daNop = daNopCocChoLichHen(khachHang.getMaNguoiDung(), maDatLich);
            if (!daNop) {
                throw new AppException(ErrorCode.DEPOSIT_NOT_PAID_YET);
            }
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
        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLich)
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

        if (phieu.getKhachHangDongY() != null) {
            throw new AppException(ErrorCode.DECISION_ALREADY_MADE);
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
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username, true);

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Bắt buộc khách đã xác nhận nhận lại cọc (nếu phòng trọ có cọc > 0)
        boolean coYeuCauCoc = phieu.getCoc() != null && phieu.getCoc() > 0;
        if (coYeuCauCoc && !Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_NOT_REFUNDED_YET);
        }

        if (phieu.getChuTroDongY() != null) {
            throw new AppException(ErrorCode.DECISION_ALREADY_MADE);
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

            // Nhánh Không thuê: Giữ nguyên trạng thái phòng trọ, không cập nhật gì thêm

            // Sàn hoàn trả đủ 100% cọc (coc) vào ví Chủ trọ (Khóa bi quan để chống race condition ghi đè số dư)
            if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc()) && chuTro != null && coc > 0) {
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
            // Khóa phòng với Pessimistic Lock để tuần tự hóa hai phiếu cùng chốt một phòng
            PhongTro phongTroLocked = (phongTro != null)
                    ? phongTroRepository.findByIdForUpdate(phongTro.getMaPhongTro()).orElse(phongTro)
                    : null;

            // KIỂM TRA CHỐNG XUNG ĐỘT: Chỉ phòng còn DA_DUYET mới được chốt thuê
            if (phongTroLocked == null || phongTroLocked.getTrangThai() != TrangThaiPhongTro.DA_DUYET) {
                // PHIẾU NÀY LÀ PHIẾU THUA CUỘC: Phòng đã được người khác chốt thuê trước (hoặc không khả dụng)
                phieu.setTrangThai(TrangThaiDatLich.HUY);
                phieu.setLiDoHuy("Phòng trọ đã được khách hàng khác chốt thuê thành công trước đó");
                phieuDatLichRepository.save(phieu);

                // Hoàn lại cọc thế chân 100% cho chủ trọ (vì chủ trọ đã ứng trả khách), sàn không thu hoa hồng
                if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc()) && chuTro != null && coc > 0) {
                    ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                    chuTroLocked.setSoDu(chuTroLocked.getSoDu() + coc);
                    chuTroRepository.save(chuTroLocked);

                    transactionService.taoGiaoDich(
                            chuTroLocked.getNguoiDung(),
                            coc,
                            "HOAN_COC",
                            "Hoàn 100% cọc thế chân do phòng " + (phongTro != null ? phongTro.getMaPhongTro() : "") +
                                    " đã được khách khác chốt trước",
                            TrangThaiGD.THANH_CONG
                    );
                }
                return;
            }

            // Phòng còn DA_DUYET: Chốt thuê thành công!
            phongTroLocked.setTrangThai(TrangThaiPhongTro.HOAN_THANH);
            phongTroRepository.save(phongTroLocked);

            phieu.setTrangThai(TrangThaiDatLich.HOAN_THANH);
            phieuDatLichRepository.save(phieu);

            // Tự động HỦY DÂY CHUYỀN các lịch hẹn còn lại của phòng này và hoàn 100% cọc
            List<PhieuDatLich> otherAppointments = phieuDatLichRepository.findOtherActiveAppointmentsByRoom(
                    phongTroLocked.getMaPhongTro(),
                    List.of(TrangThaiDatLich.CHO_XAC_NHAN, TrangThaiDatLich.XAC_NHAN),
                    phieu.getMaDatLich()
            );

            for (PhieuDatLich other : otherAppointments) {
                other.setTrangThai(TrangThaiDatLich.HUY);
                other.setLiDoHuy("Phòng trọ đã được khách hẹn xem sớm hơn chốt thuê thành công");
                phieuDatLichRepository.save(other);

                if (Boolean.TRUE.equals(other.getDaNhanLaiCoc())) {
                    if (chuTro != null && other.getCoc() != null && other.getCoc() > 0) {
                        ChuTro chuTroLocked = chuTroRepository.findByIdForUpdate(chuTro.getMaChuTro()).orElse(chuTro);
                        chuTroLocked.setSoDu(chuTroLocked.getSoDu() + other.getCoc());
                        chuTroRepository.save(chuTroLocked);

                        transactionService.taoGiaoDich(
                                chuTroLocked.getNguoiDung(),
                                other.getCoc(),
                                "HOAN_COC",
                                "Hoàn 100% cọc thế chân do phòng " + phongTroLocked.getMaPhongTro() + " đã có khách chốt trước",
                                TrangThaiGD.THANH_CONG
                        );
                    }
                } else {
                    boolean daNop = other.getKhachHang() != null &&
                            daNopCocChoLichHen(other.getKhachHang().getMaNguoiDung(), other.getMaDatLich());
                    if (daNop && other.getCoc() != null && other.getCoc() > 0) {
                        taoGiaoDichHoanCocChoKhach(other, "Hoàn cọc do phòng đã có khách trước chốt thuê", null);
                    }
                }
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
                        "Tiền cọc thuê phòng " + phongTroLocked.getMaPhongTro() +
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

        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLich)
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
            if (isKhachHang) {
                if (Boolean.TRUE.equals(phieu.getKhachHangDongY())) {
                    throw new AppException(ErrorCode.DECISION_ALREADY_MADE);
                }
                throw new AppException(ErrorCode.CANNOT_CANCEL_AFTER_DEPOSIT_RETURN);
            }

            // Khách đã nhận lại cọc từ chủ trọ ngoài đời -> tiền cọc trên sàn hoàn về ví Chủ trọ
            String nguoiHuy = "Chủ trọ hủy sau khi xem";
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
                    taoGiaoDichHoanCocChoKhach(phieu, "Khách hàng hủy khi chờ duyệt", request);
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
                    taoGiaoDichHoanCocChoKhach(phieu, "Khách hàng hủy hợp lệ (> 2h)", request);
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
                taoGiaoDichHoanCocChoKhach(phieu, "Chủ trọ hủy lịch hẹn", null);
            }
        }
    }

    /**
     * Hàm phụ trợ tạo giao dịch hoàn cọc cho khách hàng để Admin đối soát duyệt
     * Tiếp nhận thông tin tài khoản ngân hàng từ request (nếu có) hoặc từ bảng TaiKhoanNganHang
     */
    private void taoGiaoDichHoanCocChoKhach(PhieuDatLich phieu, String lyDo, AppointmentCancelRequest request) {
        String bankNote = "";
        String tenNganHang = null;
        String soTaiKhoan = null;
        String tenChuTaiKhoan = null;

        if (request != null && request.getSoTaiKhoan() != null && !request.getSoTaiKhoan().isBlank()) {
            tenNganHang = request.getTenNganHang() != null ? request.getTenNganHang().trim() : "Ngân hàng";
            soTaiKhoan = request.getSoTaiKhoan().trim();
            tenChuTaiKhoan = (request.getTenChuTaiKhoan() != null && !request.getTenChuTaiKhoan().isBlank())
                    ? request.getTenChuTaiKhoan().trim()
                    : (phieu.getKhachHang() != null ? phieu.getKhachHang().getHoVaTen() : "");

            // Tự động lưu hoặc liên kết tài khoản ngân hàng này cho người dùng nếu chưa có
            try {
                if (phieu.getKhachHang() != null) {
                    List<TaiKhoanNganHang> existing = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(phieu.getKhachHang().getMaNguoiDung());
                    boolean alreadyExists = existing.stream().anyMatch(b -> b.getSoTaiKhoan().equalsIgnoreCase(request.getSoTaiKhoan().trim()));
                    if (!alreadyExists) {
                        TaiKhoanNganHang newBank = TaiKhoanNganHang.builder()
                                .nguoiDung(phieu.getKhachHang())
                                .tenNganHang(tenNganHang)
                                .soTaiKhoan(soTaiKhoan)
                                .tenChuTaiKhoan(tenChuTaiKhoan)
                                .build();
                        taiKhoanNganHangRepository.save(newBank);
                    }
                }
            } catch (Exception ignored) {}
        } else {
            // Lấy từ danh mục ngân hàng đã liên kết
            List<TaiKhoanNganHang> banks = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(phieu.getKhachHang().getMaNguoiDung());
            if (!banks.isEmpty()) {
                TaiKhoanNganHang primaryBank = banks.get(0);
                tenNganHang = primaryBank.getTenNganHang();
                soTaiKhoan = primaryBank.getSoTaiKhoan();
                tenChuTaiKhoan = primaryBank.getTenChuTaiKhoan();
            }
        }

        if (tenNganHang != null && soTaiKhoan != null) {
            bankNote = " về TK " + tenNganHang + " - " + soTaiKhoan
                    + (tenChuTaiKhoan != null && !tenChuTaiKhoan.isBlank() ? " (" + tenChuTaiKhoan + ")" : "");
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
     * Tiền cọc được lập lệnh bồi thường CHO_THANH_TOAN (đóng băng tại Sàn 24h để đối soát khiếu nại).
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
        phieu.setLiDoHuy("Chủ trọ báo khách vắng mặt (No-show): Chờ đối soát 24h để bồi thường cọc");
        phieuDatLichRepository.save(phieu);

        boolean daNop = (phieu.getKhachHang() != null) && daNopCocChoLichHen(phieu.getKhachHang().getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() != null && phieu.getCoc() > 0 && phieu.getPhongTro().getChuPhongTro() != null) {
            ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
            // Đóng băng tiền cọc: Tạo giao dịch CHO_THANH_TOAN chờ 24h đối soát / Admin duyệt
            transactionService.taoGiaoDich(
                    chuTro.getNguoiDung(),
                    phieu.getCoc(),
                    "BOI_THUONG_NO_SHOW",
                    "Bồi thường tiền cọc (chờ đối soát 24h) do khách vắng mặt (No-show) lịch " + maDatLich,
                    TrangThaiGD.CHO_THANH_TOAN
            );
        }
    }

    /**
     * Khách hàng báo cáo Chủ trọ vắng mặt (No-show) sau giờ hẹn 30 phút.
     * Tiền cọc được lập lệnh hoàn trả 100% cho Khách hàng (CHO_THANH_TOAN chờ đối soát duyệt).
     * Trừ 10 điểm uy tín của Chủ trọ để răn đe hành vi bỏ rơi khách.
     */
    @Transactional
    public void khachBaoCaoNoShow(String maDatLich, String username) {
        NguoiDung khachHang = getNguoiDungByUsername(username);

        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (!phieu.getKhachHang().getMaNguoiDung().equals(khachHang.getMaNguoiDung())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        // Chỉ được báo sau giờ hẹn 30 phút
        if (phieu.getNgayHen() != null && LocalDateTime.now().isBefore(phieu.getNgayHen().plusMinutes(30))) {
            throw new AppException(ErrorCode.NO_SHOW_TOO_EARLY);
        }

        // Không cho báo nếu đã nhận lại cọc
        if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
            throw new AppException(ErrorCode.DEPOSIT_ALREADY_REFUNDED);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Khách báo chủ trọ vắng mặt (No-show)");

        // Trừ 10 điểm uy tín của chủ trọ
        if (phieu.getPhongTro() != null && phieu.getPhongTro().getChuPhongTro() != null) {
            ChuTro chuTro = phieu.getPhongTro().getChuPhongTro();
            chuTro.setDiemUyTin(Math.max(0, (chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100) - 10));
            chuTroRepository.save(chuTro);
        }

        phieuDatLichRepository.save(phieu);

        boolean daNop = daNopCocChoLichHen(khachHang.getMaNguoiDung(), maDatLich);
        if (daNop && phieu.getCoc() != null && phieu.getCoc() > 0) {
            taoGiaoDichHoanCocChoKhach(phieu, "Hoàn cọc do chủ trọ vắng mặt (No-show)", null);
        }
    }

    /**
     * Hàm phụ trợ kiểm tra lịch tồn tại và người gọi có đúng là chủ sở hữu phòng trọ
     */
    private PhieuDatLich getPhieuDatLichVaKiemTraQuyenChuTro(String maDatLich, String username) {
        return getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, username, false);
    }

    private PhieuDatLich getPhieuDatLichVaKiemTraQuyenChuTro(String maDatLich, String username, boolean forUpdate) {
        NguoiDung chuTro = getNguoiDungByUsername(username);

        PhieuDatLich phieu = (forUpdate
                ? phieuDatLichRepository.findByIdForUpdate(maDatLich)
                : phieuDatLichRepository.findById(maDatLich))
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (phieu.getPhongTro().getChuPhongTro() == null ||
                !phieu.getPhongTro().getChuPhongTro().getMaChuTro().equals(chuTro.getMaNguoiDung())) {
            throw new AppException(ErrorCode.NOT_APPOINTMENT_OWNER);
        }
        return phieu;
    }
}
