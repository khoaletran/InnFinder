package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.CategoryUpdateRequest;
import com.innfinder.backend.dto.request.CreateAdminRequest;
import com.innfinder.backend.dto.request.RejectLandlordRequestDTO;
import com.innfinder.backend.dto.request.RejectRoomRequestDTO;
import com.innfinder.backend.dto.request.UpdateDepositFeeRequest;
import com.innfinder.backend.dto.response.*;
import com.innfinder.backend.dto.room.AmenityResponse;
import com.innfinder.backend.dto.room.CategoryResponse;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.security.SecurityUtils;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PhongTroRepository phongTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final YeuCauChuTroRepository yeuCauChuTroRepository;
    private final ChuTroRepository chuTroRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    private final GiaoDichRepository giaoDichRepository;
    private final LoaiPhongTroRepository loaiPhongTroRepository;
    private final CocRepository cocRepository;
    private final PhiThuRepository phiThuRepository;
    private final TienIchRepository tienIchRepository;
    private final TransactionService transactionService;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<RoomResponseDTO> getPendingRooms() {
        List<PhongTro> list = phongTroRepository.findByTrangThai(TrangThaiPhongTro.CHO_DUYET);
        List<RoomResponseDTO> result = new ArrayList<>();
        for (PhongTro pt : list) {
            result.add(toRoomResponseDTO(pt));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<RoomResponseDTO> getAllRooms() {
        List<PhongTro> list = phongTroRepository.findAllByOrderByThoiGianDangDesc();
        List<RoomResponseDTO> result = new ArrayList<>();
        for (PhongTro pt : list) {
            result.add(toRoomResponseDTO(pt));
        }
        return result;
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public RoomResponseDTO approveRoom(String id) {
        PhongTro room = phongTroRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        room.setTrangThai(TrangThaiPhongTro.DA_DUYET);
        room = phongTroRepository.save(room);

        return toRoomResponseDTO(room);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public RoomResponseDTO rejectRoom(String id, RejectRoomRequestDTO request) {
        PhongTro room = phongTroRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        room.setTrangThai(TrangThaiPhongTro.HUY);
        if (request != null && request.getLyDo() != null && !request.getLyDo().isBlank()) {
            String moTaCu = room.getMoTa() != null ? room.getMoTa() : "";
            room.setMoTa(moTaCu + " [LÝ DO TỪ CHỐI DUYỆT: " + request.getLyDo() + "]");
        }
        room = phongTroRepository.save(room);
        return toRoomResponseDTO(room);
    }

    @Transactional(readOnly = true)
    public Page<UserResponseDTO> searchUsers(String keyword, Pageable pageable) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return nguoiDungRepository.findAllByOrderByThoiGianMoTaiKhoanDesc(pageable)
                    .map(this::toUserResponseDTO);
        }
        return nguoiDungRepository.searchUsersByInfo(keyword.trim(), pageable)
                .map(this::toUserResponseDTO);
    }

    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(String id) {
        NguoiDung u = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return toUserResponseDTO(u);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        List<NguoiDung> list = nguoiDungRepository.findAll();
        List<UserResponseDTO> result = new ArrayList<>();
        for (NguoiDung u : list) {
            result.add(toUserResponseDTO(u));
        }
        return result;
    }

    @Transactional
    public UserResponseDTO toggleLockUser(String id) {
        NguoiDung user = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String currentUsername = SecurityUtils.getCurrentUsername();
        if (currentUsername != null && !"anonymousUser".equals(currentUsername)) {
            NguoiDung currentAdmin = nguoiDungRepository.findByTenDangNhap(currentUsername).orElse(null);
            if (currentAdmin != null && currentAdmin.getMaNguoiDung().equals(user.getMaNguoiDung())) {
                throw new AppException(ErrorCode.CANNOT_LOCK_SELF);
            }
        }

        boolean currentStatus = Boolean.TRUE.equals(user.getTrangThaiKhoa());
        if (!currentStatus && user.getVaiTro() == VaiTro.QUAN_TRI
                && nguoiDungRepository.countByVaiTroAndTrangThaiKhoaFalse(VaiTro.QUAN_TRI) <= 1) {
            throw new AppException(ErrorCode.CANNOT_LOCK_LAST_ADMIN);
        }

        user.setTrangThaiKhoa(!currentStatus);
        user = nguoiDungRepository.save(user);
        return toUserResponseDTO(user);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public UserResponseDTO createAdmin(CreateAdminRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();
        if (currentUsername == null || "anonymousUser".equals(currentUsername)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        NguoiDung currentAdmin = nguoiDungRepository.findByTenDangNhap(currentUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getMatKhauAdminHienTai(), currentAdmin.getMatKhau())) {
            throw new AppException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }

        String tenDangNhap = request.getTenDangNhap().trim();
        String hoVaTen = request.getHoVaTen().trim();
        String email = request.getEmail().trim();
        String sdt = request.getSdt().trim();

        if (Boolean.TRUE.equals(nguoiDungRepository.existsByTenDangNhap(tenDangNhap))) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (Boolean.TRUE.equals(nguoiDungRepository.existsByEmail(email))) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        NguoiDung newAdmin = NguoiDung.builder()
                .maNguoiDung(generateMaNguoiDung())
                .tenDangNhap(tenDangNhap)
                .hoVaTen(hoVaTen)
                .matKhau(passwordEncoder.encode(request.getMatKhau()))
                .email(email)
                .sdt(sdt)
                .cccd(null)
                .vaiTro(VaiTro.QUAN_TRI)
                .thoiGianMoTaiKhoan(LocalDate.now())
                .chuTro(false)
                .trangThaiKhoa(false)
                .build();

        NguoiDung saved = nguoiDungRepository.save(newAdmin);
        return toUserResponseDTO(saved);
    }

    private synchronized String generateMaNguoiDung() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        String prefix = "ND" + datePart;
        String maxId = nguoiDungRepository.findMaxMaNguoiDungByPrefix(prefix);

        int nextSequence = 1;
        if (maxId != null && maxId.length() == 14 && maxId.startsWith(prefix)) {
            try {
                String suffix = maxId.substring(10);
                nextSequence = Integer.parseInt(suffix) + 1;
            } catch (NumberFormatException ignored) {
                nextSequence = 1;
            }
        }

        String candidate = String.format("%s%04d", prefix, nextSequence);
        while (nguoiDungRepository.existsById(candidate)) {
            nextSequence++;
            candidate = String.format("%s%04d", prefix, nextSequence);
        }
        return candidate;
    }

    @Transactional(readOnly = true)
    public AdminStatisticsResponseDTO getStatistics() {
        return getStatistics(null, null, null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "admin_statistics", key = "T(String).format('%s-%s-%s', #day, #month, #year)")
    public AdminStatisticsResponseDTO getStatistics(Integer day, Integer month, Integer year) {
        List<PhongTro> allRooms = phongTroRepository.findAllWithLoaiPhong();
        List<NguoiDung> allUsers = nguoiDungRepository.findAll();
        List<PhieuDatLich> allAppointments = phieuDatLichRepository.findAll();
        List<GiaoDich> allTransactions = giaoDichRepository.findAll();

        // Danh sách năm thực tế có dữ liệu trong database (sắp xếp giảm dần)
        TreeSet<Integer> yearSet = new TreeSet<>(Comparator.reverseOrder());
        yearSet.add(LocalDate.now().getYear());
        for (PhieuDatLich p : allAppointments) {
            LocalDateTime t = resolveAppointmentTime(p);
            if (t != null) yearSet.add(t.getYear());
        }
        for (GiaoDich g : allTransactions) {
            if (g.getNgayGiaoDich() != null) yearSet.add(g.getNgayGiaoDich().getYear());
        }
        for (PhongTro pt : allRooms) {
            if (pt.getThoiGianDang() != null) yearSet.add(pt.getThoiGianDang().getYear());
        }
        List<Integer> cacNamCoDuLieu = new ArrayList<>(yearSet);

        // 1. Thống kê phòng trọ & cơ cấu loại phòng từ DB theo bộ lọc
        long tongSoPhong = 0;
        long soPhongChoDuyet = 0;
        long soPhongDaDuyet = 0;
        long soPhongHoanThanh = 0;
        long soPhongHuy = 0;
        Map<String, Long> roomTypeCounts = new LinkedHashMap<>();

        for (PhongTro pt : allRooms) {
            if (!matchesDateFilter(pt.getThoiGianDang(), day, month, year)) continue;
            tongSoPhong++;
            if (pt.getTrangThai() == TrangThaiPhongTro.CHO_DUYET) soPhongChoDuyet++;
            else if (pt.getTrangThai() == TrangThaiPhongTro.DA_DUYET) soPhongDaDuyet++;
            else if (pt.getTrangThai() == TrangThaiPhongTro.HOAN_THANH) soPhongHoanThanh++;
            else if (pt.getTrangThai() == TrangThaiPhongTro.HUY) soPhongHuy++;

            String typeName = (pt.getLoaiPhong() != null && pt.getLoaiPhong().getTenLoaiPhongTro() != null
                    && !pt.getLoaiPhong().getTenLoaiPhongTro().isBlank())
                    ? pt.getLoaiPhong().getTenLoaiPhongTro()
                    : "Khác";
            roomTypeCounts.merge(typeName, 1L, Long::sum);
        }

        List<AdminStatisticsResponseDTO.RoomTypeStatDTO> coCauLoaiPhong = roomTypeCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(e -> AdminStatisticsResponseDTO.RoomTypeStatDTO.builder()
                        .tenLoaiPhong(e.getKey())
                        .soLuong(e.getValue())
                        .build())
                .toList();

        // 2. Thống kê tài khoản người dùng & hàng đợi duyệt chủ trọ
        long tongNguoiDung = 0;
        long soKhachHang = 0;
        long soChuTro = 0;
        for (NguoiDung u : allUsers) {
            if (!matchesDateFilter(u.getThoiGianMoTaiKhoan(), day, month, year)) continue;
            tongNguoiDung++;
            if (u.getVaiTro() == VaiTro.KHACH_HANG) soKhachHang++;
            if (Boolean.TRUE.equals(u.getChuTro())) soChuTro++;
        }
        long soChuTroChoDuyet = yeuCauChuTroRepository.countByTrangThai(TrangThaiYeuCauChuTro.CHO_DUYET);

        // 3. Doanh thu hoa hồng sàn: SUM(phiThu) từ PhieuDatLich trạng thái HOAN_THANH (tuyệt đối không tính từ GiaoDich)
        List<PhieuDatLich> completedAppointments = new ArrayList<>();
        long tongDoanhThu = 0L;
        long quyTamGiuCoc = 0L;

        for (PhieuDatLich p : allAppointments) {
            LocalDateTime appointmentTime = resolveAppointmentTime(p);
            if (!matchesDateFilter(appointmentTime, day, month, year)) continue;

            if (p.getTrangThai() == TrangThaiDatLich.HOAN_THANH) {
                completedAppointments.add(p);
                tongDoanhThu += (p.getPhiThu() != null ? p.getPhiThu() : 0L);
            } else if (p.getTrangThai() == TrangThaiDatLich.XAC_NHAN && p.getCoc() != null && p.getCoc() > 0) {
                quyTamGiuCoc += p.getCoc();
            }
        }
        long soLichHoanThanh = completedAppointments.size();

        // 4. Đối soát ngân khố & ví chủ trọ từ sổ cái GiaoDich theo cùng bộ lọc thời gian
        long quyChoRut = 0L;
        long soLenhRutChoDuyet = 0L;
        long landlordCredits = 0L;
        long landlordDebits = 0L;

        for (GiaoDich g : allTransactions) {
            if (!matchesDateFilter(g.getNgayGiaoDich(), day, month, year)) continue;
            long amount = g.getSoTien() != null ? g.getSoTien() : 0L;
            String loai = g.getLoaiGiaoDich() != null ? g.getLoaiGiaoDich() : "";
            TrangThaiGD trangThai = g.getTrangThai();

            if ("RUT_TIEN".equalsIgnoreCase(loai)) {
                if (trangThai == TrangThaiGD.CHO_THANH_TOAN) {
                    quyChoRut += amount;
                    soLenhRutChoDuyet++;
                }
                if (trangThai == TrangThaiGD.THANH_CONG
                        || trangThai == TrangThaiGD.CHO_THANH_TOAN
                        || trangThai == TrangThaiGD.THAT_BAI) {
                    landlordDebits += amount;
                }
            }

            if (trangThai == TrangThaiGD.THANH_CONG && ("CONG_TIEN_COC".equalsIgnoreCase(loai)
                    || "HOAN_COC".equalsIgnoreCase(loai)
                    || "HOAN_TIEN_RUT".equalsIgnoreCase(loai))) {
                landlordCredits += amount;
            }
        }

        boolean hasFilter = (day != null || month != null || year != null);
        long tongSoDuViChuTro;
        if (!hasFilter) {
            Long rawTotalSoDu = chuTroRepository.sumTotalSoDu();
            tongSoDuViChuTro = rawTotalSoDu != null ? rawTotalSoDu : 0L;
        } else {
            tongSoDuViChuTro = Math.max(0L, landlordCredits - landlordDebits);
        }

        // Tổng quỹ đang luân chuyển thuộc nghĩa vụ người dùng = Cọc tạm giữ + Ví chủ trọ + Chờ duyệt rút
        long tongQuyHeThong = quyTamGiuCoc + tongSoDuViChuTro + quyChoRut;
        // Tổng tiền thực tế trong két = Quỹ đang luân chuyển + Doanh thu hoa hồng sàn tích lũy
        long tongQuyThucTe = tongQuyHeThong + tongDoanhThu;

        List<AdminStatisticsResponseDTO.RevenuePointDTO> bieuDoDoanhThu =
                buildRevenueChart(completedAppointments, day, month, year, cacNamCoDuLieu);

        return AdminStatisticsResponseDTO.builder()
                .tongSoPhong(tongSoPhong)
                .soPhongChoDuyet(soPhongChoDuyet)
                .soPhongDaDuyet(soPhongDaDuyet)
                .soPhongHoanThanh(soPhongHoanThanh)
                .soPhongHuy(soPhongHuy)
                .tongNguoiDung(tongNguoiDung)
                .soKhachHang(soKhachHang)
                .soChuTro(soChuTro)
                .soChuTroChoDuyet(soChuTroChoDuyet)
                .tongDoanhThu(tongDoanhThu)
                .soLichHoanThanh(soLichHoanThanh)
                .tongQuyHeThong(tongQuyHeThong)
                .tongQuyThucTe(tongQuyThucTe)
                .quyTamGiuCoc(quyTamGiuCoc)
                .tongSoDuViChuTro(tongSoDuViChuTro)
                .quyChoRut(quyChoRut)
                .soLenhRutChoDuyet(soLenhRutChoDuyet)
                .bieuDoDoanhThu(bieuDoDoanhThu)
                .coCauLoaiPhong(coCauLoaiPhong)
                .cacNamCoDuLieu(cacNamCoDuLieu)
                .build();
    }

    private LocalDateTime resolveAppointmentTime(PhieuDatLich p) {
        return p.getNgayHen() != null ? p.getNgayHen() : p.getThoiGianDat();
    }

    private boolean matchesDateFilter(LocalDateTime dt, Integer day, Integer month, Integer year) {
        return matchesDateFilter(dt != null ? dt.toLocalDate() : null, day, month, year);
    }

    private boolean matchesDateFilter(LocalDate date, Integer day, Integer month, Integer year) {
        if (day == null && month == null && year == null) {
            return true;
        }
        if (date == null) {
            return false;
        }
        if (year != null && date.getYear() != year) {
            return false;
        }
        if (month != null && date.getMonthValue() != month) {
            return false;
        }
        return day == null || date.getDayOfMonth() == day;
    }

    private List<AdminStatisticsResponseDTO.RevenuePointDTO> buildRevenueChart(
            List<PhieuDatLich> completedAppointments,
            Integer day,
            Integer month,
            Integer year,
            List<Integer> cacNamCoDuLieu
    ) {
        Map<String, long[]> buckets = new LinkedHashMap<>();

        if (day != null && month != null && year != null) {
            String[] slotLabels = {"00h–04h", "04h–08h", "08h–12h", "12h–16h", "16h–20h", "20h–24h"};
            for (String slot : slotLabels) {
                buckets.put(slot, new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                int idx = Math.min(5, Math.max(0, t.getHour() / 4));
                accumulateBucket(buckets, slotLabels[idx], p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (day == null && month != null && year != null) {
            if (month < 1 || month > 12 || year < 1900 || year > 2100) {
                return List.of();
            }
            int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
            for (int d = 1; d <= daysInMonth; d++) {
                buckets.put(String.format("%02d/%02d", d, month), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (day == null && month != null) {
            if (month < 1 || month > 12) {
                return List.of();
            }
            int maxDay = (month == 2) ? 29 : (month == 4 || month == 6 || month == 9 || month == 11 ? 30 : 31);
            for (int d = 1; d <= maxDay; d++) {
                buckets.put(String.format("Ngày %02d", d), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("Ngày %02d", t.getDayOfMonth());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (day == null && year != null) {
            for (int m = 1; m <= 12; m++) {
                buckets.put(String.format("%02d/%d", m, year), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (day == null) {
            YearMonth earliest = null;
            YearMonth latest = null;
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                YearMonth ym = YearMonth.from(t);
                if (earliest == null || ym.isBefore(earliest)) earliest = ym;
                if (latest == null || ym.isAfter(latest)) latest = ym;
            }
            if (latest == null) {
                latest = YearMonth.now();
                earliest = latest.minusMonths(5);
            } else if (earliest.plusMonths(5).isAfter(latest)) {
                earliest = latest.minusMonths(5);
            }
            for (YearMonth ym = earliest; !ym.isAfter(latest); ym = ym.plusMonths(1)) {
                buckets.put(String.format("%02d/%d", ym.getMonthValue(), ym.getYear()), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (month == null && year != null) {
            for (int m = 1; m <= 12; m++) {
                buckets.put(String.format("%02d/%02d", day, m), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        if (month != null) {
            List<Integer> ascYears = new ArrayList<>(cacNamCoDuLieu);
            ascYears.sort(Comparator.naturalOrder());
            for (Integer y : ascYears) {
                buckets.put(String.format("%02d/%02d/%d", day, month, y), new long[]{0L, 0L});
            }
            for (PhieuDatLich p : completedAppointments) {
                LocalDateTime t = resolveAppointmentTime(p);
                if (t == null) continue;
                String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.getPhiThu());
            }
            return toChartPoints(buckets);
        }

        // day != null && month == null && year == null
        TreeSet<LocalDate> dates = new TreeSet<>();
        for (PhieuDatLich p : completedAppointments) {
            LocalDateTime t = resolveAppointmentTime(p);
            if (t != null) dates.add(t.toLocalDate());
        }
        for (LocalDate d : dates) {
            buckets.put(String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear()),
                    new long[]{0L, 0L});
        }
        for (PhieuDatLich p : completedAppointments) {
            LocalDateTime t = resolveAppointmentTime(p);
            if (t == null) continue;
            String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
            accumulateBucket(buckets, key, p.getPhiThu());
        }
        return toChartPoints(buckets);
    }

    private void accumulateBucket(Map<String, long[]> buckets, String key, Long phiThu) {
        long[] entry = buckets.computeIfAbsent(key, k -> new long[]{0L, 0L});
        entry[0] += (phiThu != null ? phiThu : 0L);
        entry[1] += 1L;
    }

    private List<AdminStatisticsResponseDTO.RevenuePointDTO> toChartPoints(Map<String, long[]> buckets) {
        List<AdminStatisticsResponseDTO.RevenuePointDTO> points = new ArrayList<>(buckets.size());
        for (Map.Entry<String, long[]> entry : buckets.entrySet()) {
            points.add(AdminStatisticsResponseDTO.RevenuePointDTO.builder()
                    .nhan(entry.getKey())
                    .doanhThu(entry.getValue()[0])
                    .soLichHoanThanh(entry.getValue()[1])
                    .build());
        }
        return points;
    }

    // ==========================================
    // QUẢN LÝ GIAO DỊCH & DUYỆT RÚT TIỀN (NGÂN KHỐ)
    // ==========================================

    @Transactional(readOnly = true)
    public List<AdminTransactionResponseDTO> getTransactions(String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return giaoDichRepository.searchAllTransactionsByUserInfo(keyword.trim())
                    .stream()
                    .map(AdminTransactionResponseDTO::fromEntity)
                    .toList();
        }
        return giaoDichRepository.findAllByOrderByNgayGiaoDichDesc()
                .stream()
                .map(AdminTransactionResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponseDTO> getAllAppointments() {
        return phieuDatLichRepository.findAllByOrderByNgayHenDesc()
                .stream()
                .map(AdminAppointmentResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminTransactionResponseDTO> getAllTransactions() {
        return giaoDichRepository.findAllByOrderByNgayGiaoDichDesc()
                .stream()
                .map(AdminTransactionResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminTransactionResponseDTO getTransactionById(String id) {
        GiaoDich gd = giaoDichRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        return AdminTransactionResponseDTO.fromEntity(gd);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AdminTransactionResponseDTO approveTransaction(String id, String adminUsername) {
        return approveTransaction(id, adminUsername, null);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AdminTransactionResponseDTO approveTransaction(String id, String adminUsername, String bankReference) {
        // 1. Khóa bản ghi giao dịch (Pessimistic Lock) để chống 2 Admin cùng duyệt
        GiaoDich gd = giaoDichRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (gd.getTrangThai() != TrangThaiGD.CHO_THANH_TOAN) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        // 2. Kiểm tra ngân khố hệ thống
        AdminStatisticsResponseDTO stats = getStatistics();
        long soTienDuyet = gd.getSoTien() != null ? gd.getSoTien() : 0L;
        if (stats.getTongQuyThucTe() < soTienDuyet) {
            throw new AppException(ErrorCode.INSUFFICIENT_SYSTEM_TREASURY);
        }

        // 3. Phê duyệt giao dịch
        gd.setTrangThai(TrangThaiGD.THANH_CONG);
        String timeNow = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String oldNote = gd.getNoiDung() != null ? gd.getNoiDung() : "";
        gd.setNoiDung(oldNote + " [ĐÃ DUYỆT BỞI ADMIN: " + adminUsername + " lúc " + timeNow + "]");
        if (bankReference != null && !bankReference.isBlank()) {
            gd.setMaThamChieuNganHang(bankReference.trim());
        }
        gd = giaoDichRepository.save(gd);

        return AdminTransactionResponseDTO.fromEntity(gd);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AdminTransactionResponseDTO rejectTransaction(String id, String adminUsername, String lyDo) {
        // 1. Khóa bản ghi giao dịch
        GiaoDich gd = giaoDichRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (gd.getTrangThai() != TrangThaiGD.CHO_THANH_TOAN) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        // 2. Chuyển trạng thái sang THAT_BAI
        gd.setTrangThai(TrangThaiGD.THAT_BAI);
        String timeNow = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String reason = (lyDo != null && !lyDo.isBlank()) ? lyDo.trim() : "Thông tin tài khoản nhận tiền không chính xác";
        String oldNote = gd.getNoiDung() != null ? gd.getNoiDung() : "";
        gd.setNoiDung(oldNote + " [TỪ CHỐI BỞI ADMIN: " + adminUsername + " lúc " + timeNow + " - Lý do: " + reason + "]");
        gd = giaoDichRepository.save(gd);

        // 3. Hoàn lại số dư vào ví Chủ trọ (Khóa bi quan chống race condition)
        if ("RUT_TIEN".equalsIgnoreCase(gd.getLoaiGiaoDich()) && gd.getNguoiDung() != null) {
            ChuTro chuTro = chuTroRepository.findByIdForUpdate(gd.getNguoiDung().getMaNguoiDung()).orElse(null);
            if (chuTro != null) {
                long soDuHienTai = chuTro.getSoDu() != null ? chuTro.getSoDu() : 0L;
                long soTienHoan = gd.getSoTien() != null ? gd.getSoTien() : 0L;
                chuTro.setSoDu(soDuHienTai + soTienHoan);
                chuTroRepository.save(chuTro);

                // Ghi nhận giao dịch kiểm toán hoàn tiền vào ví chủ trọ
                transactionService.taoGiaoDich(
                        gd.getNguoiDung(),
                        soTienHoan,
                        "HOAN_TIEN_RUT",
                        "Hoàn lại số dư do yêu cầu rút tiền " + gd.getMaGiaoDich() + " bị từ chối: " + reason,
                        TrangThaiGD.THANH_CONG
                );
            }
        }

        return AdminTransactionResponseDTO.fromEntity(gd);
    }

    private RoomResponseDTO toRoomResponseDTO(PhongTro pt) {
        List<String> imageUrls = new ArrayList<>();
        if (pt.getHinhAnh() != null) {
            for (HinhAnh ha : pt.getHinhAnh()) {
                imageUrls.add(ha.getUrl());
            }
        }

        String tenChuTro = null;
        String sdtChuTro = null;
        if (pt.getChuPhongTro() != null && pt.getChuPhongTro().getNguoiDung() != null) {
            NguoiDung ctUser = pt.getChuPhongTro().getNguoiDung();
            tenChuTro = (ctUser.getHoVaTen() != null && !ctUser.getHoVaTen().isBlank())
                    ? ctUser.getHoVaTen()
                    : ctUser.getTenDangNhap();
            sdtChuTro = ctUser.getSdt();
        }

        String tenLoaiPhong = pt.getLoaiPhong() != null ? pt.getLoaiPhong().getTenLoaiPhongTro() : null;
        String maLoaiPhong = pt.getLoaiPhong() != null ? pt.getLoaiPhong().getMaLpt() : null;

        return RoomResponseDTO.builder()
                .maPhongTro(pt.getMaPhongTro())
                .maChuTro(pt.getChuPhongTro() != null ? pt.getChuPhongTro().getMaChuTro() : null)
                .tenChuTro(tenChuTro)
                .sdtChuTro(sdtChuTro)
                .maLoaiPhong(maLoaiPhong)
                .tenLoaiPhong(tenLoaiPhong)
                .giaThue(pt.getGiaThue())
                .dienTich(pt.getDienTich())
                .soNguoi(pt.getSoNguoi())
                .diaChi(pt.getDiaChi())
                .moTa(pt.getMoTa())
                .coc(pt.getCocPhong())
                .trangThai(pt.getTrangThai())
                .thoiGianDang(pt.getThoiGianDang())
                .hinhAnhUrls(imageUrls)
                .build();
    }

    private UserResponseDTO toUserResponseDTO(NguoiDung u) {
        return UserResponseDTO.builder()
                .maNguoiDung(u.getMaNguoiDung())
                .tenDangNhap(u.getTenDangNhap())
                .hoVaTen(u.getHoVaTen())
                .email(u.getEmail())
                .sdt(u.getSdt())
                .cccd(u.getCccd())
                .vaiTro(u.getVaiTro())
                .hinhDaiDien(u.getHinhDaiDien())
                .thoiGianMoTaiKhoan(u.getThoiGianMoTaiKhoan())
                .chuTro(u.getChuTro())
                .trangThaiKhoa(u.getTrangThaiKhoa())
                .build();
    }

    // ==========================================
    // QUẢN LÝ ĐƠN ĐĂNG KÝ CHỦ TRỌ
    // ==========================================

    @Transactional(readOnly = true)
    public List<LandlordRequestResponseDTO> getLandlordRequests() {
        return yeuCauChuTroRepository.findAllByOrderByNgayGuiDesc()
                .stream()
                .map(LandlordRequestResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public LandlordRequestResponseDTO getLandlordRequestById(String id) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));
        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public LandlordRequestResponseDTO approveLandlordRequest(String id) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));

        if (yc.getTrangThai() != TrangThaiYeuCauChuTro.CHO_DUYET) {
            throw new AppException(ErrorCode.INVALID_LANDLORD_REQUEST_STATUS);
        }

        // 1. Cập nhật trạng thái đơn
        yc.setTrangThai(TrangThaiYeuCauChuTro.DA_DUYET);
        yc.setNgayDuyet(LocalDateTime.now());
        yc = yeuCauChuTroRepository.save(yc);

        // 2. Kích hoạt vai trò Chủ trọ cho người dùng
        NguoiDung user = yc.getNguoiDung();
        user.setCccd(yc.getCccd());
        user.setChuTro(true);

        // 3. Khởi tạo bản ghi ChuTro nếu chưa có (100 điểm uy tín, số dư = 0)
        ChuTro chuTro = chuTroRepository.findById(user.getMaNguoiDung()).orElse(null);
        if (chuTro == null) {
            chuTro = ChuTro.builder()
                    .nguoiDung(user)
                    .diemUyTin(100)
                    .soDu(0L)
                    .build();
            user.setThongTinChuTro(chuTro);
            entityManager.persist(chuTro);
        }
        nguoiDungRepository.save(user);

        // 4. Lưu tài khoản ngân hàng thụ hưởng (kiểm tra tránh lưu lặp tài khoản)
        String soTaiKhoanYc = yc.getSoTaiKhoan();
        boolean daCoTk = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                .stream()
                .anyMatch(t -> soTaiKhoanYc != null && soTaiKhoanYc.equals(t.getSoTaiKhoan()));
        if (!daCoTk) {
            TaiKhoanNganHang tk = TaiKhoanNganHang.builder()
                    .soTaiKhoan(yc.getSoTaiKhoan())
                    .tenNganHang(yc.getTenNganHang())
                    .nguoiDung(user)
                    .build();
            taiKhoanNganHangRepository.save(tk);
        }

        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public LandlordRequestResponseDTO rejectLandlordRequest(String id, RejectLandlordRequestDTO request) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));

        if (yc.getTrangThai() != TrangThaiYeuCauChuTro.CHO_DUYET) {
            throw new AppException(ErrorCode.INVALID_LANDLORD_REQUEST_STATUS);
        }

        yc.setTrangThai(TrangThaiYeuCauChuTro.TU_CHOI);
        yc.setNgayDuyet(LocalDateTime.now());
        yc.setLyDoTuChoi(request != null && request.getLyDo() != null && !request.getLyDo().isBlank()
                ? request.getLyDo().trim()
                : "Hồ sơ không đáp ứng tiêu chuẩn xét duyệt");

        yc = yeuCauChuTroRepository.save(yc);
        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    public void resetUserPassword(String userId, String matKhauMoi) {
        NguoiDung user = nguoiDungRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setMatKhau(passwordEncoder.encode(matKhauMoi));
        nguoiDungRepository.save(user);
    }

    // ==========================================
    // QUẢN LÝ BIỂU PHÍ CỌC & HOA HỒNG SÀN THEO LOẠI PHÒNG
    // ==========================================

    @Transactional(readOnly = true)
    public List<RoomTypeDepositFeeResponseDTO> getRoomTypeDepositFees() {
        List<LoaiPhongTro> list = loaiPhongTroRepository.findAll();
        List<RoomTypeDepositFeeResponseDTO> result = new ArrayList<>();
        for (LoaiPhongTro lpt : list) {
            Coc coc = lpt.getCoc();
            PhiThu pt = coc != null ? coc.getPhiThu() : null;

            Integer soTienCoc = coc != null ? coc.getSoTienCoc() : 0;
            Integer phi = pt != null ? pt.getPhi() : 0;
            int thucNhan = Math.max(0, soTienCoc - phi);
            double tyLe = soTienCoc > 0 ? (double) phi * 100.0 / soTienCoc : 0.0;

            result.add(RoomTypeDepositFeeResponseDTO.builder()
                    .maLpt(lpt.getMaLpt())
                    .tenLoaiPhongTro(lpt.getTenLoaiPhongTro())
                    .moTa(lpt.getMoTa())
                    .maCoc(coc != null ? coc.getMaCoc() : null)
                    .soTienCoc(soTienCoc)
                    .maPhiThu(pt != null ? pt.getMaPhiThu() : null)
                    .phiThu(phi)
                    .thucNhanChuTro(thucNhan)
                    .tyLePhiPercent(Math.round(tyLe * 10.0) / 10.0)
                    .build());
        }
        return result;
    }

    @Transactional
    public RoomTypeDepositFeeResponseDTO updateDepositFee(String maLpt, UpdateDepositFeeRequest request) {
        LoaiPhongTro lpt = loaiPhongTroRepository.findById(maLpt)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_TYPE_NOT_FOUND));

        if (request.getPhiThu() >= request.getSoTienCoc()) {
            throw new AppException(ErrorCode.INVALID_DEPOSIT_FEE);
        }

        Coc coc = lpt.getCoc();
        if (coc == null) {
            String maxCoc = cocRepository.findMaxMaCoc();
            int nextCocNum = 1;
            if (maxCoc != null && maxCoc.startsWith("COC")) {
                try {
                    nextCocNum = Integer.parseInt(maxCoc.substring(3)) + 1;
                } catch (NumberFormatException ignored) {}
            }
            String newMaCoc = String.format("COC%03d", nextCocNum);
            coc = Coc.builder()
                    .maCoc(newMaCoc)
                    .loaiPhong(lpt)
                    .soTienCoc(request.getSoTienCoc())
                    .build();
            coc = cocRepository.save(coc);
            lpt.setCoc(coc);
        } else {
            coc.setSoTienCoc(request.getSoTienCoc());
            coc = cocRepository.save(coc);
        }

        PhiThu phiThu = coc.getPhiThu();
        if (phiThu == null) {
            String maxPt = phiThuRepository.findMaxMaPhiThu();
            int nextPtNum = 1;
            if (maxPt != null && maxPt.startsWith("PT")) {
                try {
                    nextPtNum = Integer.parseInt(maxPt.substring(2)) + 1;
                } catch (NumberFormatException ignored) {}
            }
            String newMaPt = String.format("PT%03d", nextPtNum);
            phiThu = PhiThu.builder()
                    .maPhiThu(newMaPt)
                    .coc(coc)
                    .phi(request.getPhiThu())
                    .build();
            phiThu = phiThuRepository.save(phiThu);
            coc.setPhiThu(phiThu);
        } else {
            phiThu.setPhi(request.getPhiThu());
            phiThu = phiThuRepository.save(phiThu);
        }

        int thucNhan = Math.max(0, coc.getSoTienCoc() - phiThu.getPhi());
        double tyLe = coc.getSoTienCoc() > 0 ? (double) phiThu.getPhi() * 100.0 / coc.getSoTienCoc() : 0.0;

        return RoomTypeDepositFeeResponseDTO.builder()
                .maLpt(lpt.getMaLpt())
                .tenLoaiPhongTro(lpt.getTenLoaiPhongTro())
                .moTa(lpt.getMoTa())
                .maCoc(coc.getMaCoc())
                .soTienCoc(coc.getSoTienCoc())
                .maPhiThu(phiThu.getMaPhiThu())
                .phiThu(phiThu.getPhi())
                .thucNhanChuTro(thucNhan)
                .tyLePhiPercent(Math.round(tyLe * 10.0) / 10.0)
                .build();
    }

    @Transactional
    public CategoryResponse updateRoomType(String maLpt, CategoryUpdateRequest request) {
        LoaiPhongTro lpt = loaiPhongTroRepository.findById(maLpt)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_TYPE_NOT_FOUND));
        lpt.setTenLoaiPhongTro(request.getTen().trim());
        if (request.getMoTa() != null) {
            lpt.setMoTa(request.getMoTa().trim());
        }
        lpt = loaiPhongTroRepository.save(lpt);
        return CategoryResponse.fromEntity(lpt);
    }

    @Transactional
    public AmenityResponse updateAmenity(String maTienIch, CategoryUpdateRequest request) {
        TienIch ti = tienIchRepository.findById(maTienIch)
                .orElseThrow(() -> new AppException(ErrorCode.AMENITY_NOT_FOUND));
        ti.setTenTienIch(request.getTen().trim());
        if (request.getMoTa() != null) {
            ti.setMoTa(request.getMoTa().trim());
        }
        ti = tienIchRepository.save(ti);
        return AmenityResponse.fromEntity(ti);
    }
}
