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
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.realtime.RealtimePublisher;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.security.SecurityUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RealtimePublisher realtimePublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AiUsageLogRepository aiUsageLogRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AiTrackingService aiTrackingService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ReputationService reputationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private LichSuBieuPhiRepository lichSuBieuPhiRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private PhieuKhieuNaiRepository phieuKhieuNaiRepository;

    private static final Pattern BOOKING_CODE_PATTERN = Pattern.compile("DL[A-Za-z0-9_]+");

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
    public AdminRoomPageResponseDTO getRoomsPaged(TrangThaiPhongTro trangThai, Pageable pageable) {
        Page<PhongTro> pageData = trangThai != null
                ? phongTroRepository.findByTrangThaiOrderByThoiGianDangDesc(trangThai, pageable)
                : phongTroRepository.findAllByOrderByThoiGianDangDesc(pageable);

        Map<TrangThaiPhongTro, Long> statusCounts = new EnumMap<>(TrangThaiPhongTro.class);
        for (TrangThaiPhongTro st : TrangThaiPhongTro.values()) {
            statusCounts.put(st, 0L);
        }
        for (Object[] row : phongTroRepository.countRoomsGroupByTrangThai()) {
            if (row != null && row.length >= 2 && row[0] instanceof TrangThaiPhongTro st && row[1] instanceof Number cnt) {
                statusCounts.put(st, cnt.longValue());
            }
        }

        return AdminRoomPageResponseDTO.builder()
                .content(pageData.getContent().stream().map(this::toRoomResponseDTO).toList())
                .totalElements(pageData.getTotalElements())
                .totalPages(Math.max(pageData.getTotalPages(), 1))
                .size(pageData.getSize())
                .number(pageData.getNumber())
                .statusCounts(statusCounts)
                .build();
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public RoomResponseDTO approveRoom(String id) {
        PhongTro room = phongTroRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        room.setTrangThai(TrangThaiPhongTro.DA_DUYET);
        room = phongTroRepository.save(room);
        if (realtimePublisher != null) realtimePublisher.roomUpdated(room, true);

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
        if (realtimePublisher != null) realtimePublisher.roomUpdated(room, true);
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
    public AdminUserDetailResponseDTO getUserDetail(String id) {
        NguoiDung u = nguoiDungRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        UserResponseDTO userDto = toUserResponseDTO(u);
        ChuTro landlord = chuTroRepository.findById(u.getMaNguoiDung()).orElse(null);

        List<AdminUserDetailResponseDTO.BankAccountInfo> bankAccounts = taiKhoanNganHangRepository
                .findByNguoiDung_MaNguoiDung(u.getMaNguoiDung())
                .stream()
                .map(b -> AdminUserDetailResponseDTO.BankAccountInfo.builder()
                        .id(b.getId())
                        .soTaiKhoan(b.getSoTaiKhoan())
                        .tenNganHang(b.getTenNganHang())
                        .tenChuTaiKhoan(b.getTenChuTaiKhoan())
                        .macDinh(b.isMacDinh())
                        .build())
                .toList();

        List<AdminTransactionResponseDTO> transactions = toAdminTransactionDTOs(
                giaoDichRepository.findTop50ByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(u.getMaNguoiDung())
        );

        java.util.Map<String, AdminAppointmentResponseDTO> appointmentMap = new java.util.LinkedHashMap<>();
        phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByThoiGianDatDesc(u.getMaNguoiDung())
                .forEach(p -> appointmentMap.put(p.getMaDatLich(), AdminAppointmentResponseDTO.fromEntity(p)));
        if (landlord != null) {
            phieuDatLichRepository.findAppointmentsByLandlordId(landlord.getMaChuTro())
                    .forEach(p -> appointmentMap.putIfAbsent(p.getMaDatLich(), AdminAppointmentResponseDTO.fromEntity(p)));
        }
        List<AdminAppointmentResponseDTO> appointments = appointmentMap.values().stream()
                .sorted((a, b) -> {
                    if (a.getNgayHen() == null && b.getNgayHen() == null) return 0;
                    if (a.getNgayHen() == null) return 1;
                    if (b.getNgayHen() == null) return -1;
                    return b.getNgayHen().compareTo(a.getNgayHen());
                })
                .limit(50)
                .toList();

        List<RoomResponseDTO> rooms = landlord != null
                ? phongTroRepository.findByChuPhongTro_MaChuTro(landlord.getMaChuTro())
                        .stream()
                        .map(this::toRoomResponseDTO)
                        .toList()
                : List.of();

        List<ReputationHistoryResponseDTO> reputationHistory = (reputationService != null && landlord != null)
                ? reputationService.getHistoryByLandlordId(landlord.getMaChuTro())
                : List.of();

        return AdminUserDetailResponseDTO.builder()
                .user(userDto)
                .soDu(landlord != null && landlord.getSoDu() != null ? landlord.getSoDu() : 0L)
                .diemUyTin(landlord != null ? landlord.getDiemUyTin() : null)
                .tamAnDen(landlord != null ? landlord.getTamAnDen() : null)
                .lichSuDiemUyTin(reputationHistory)
                .taiKhoanNganHang(bankAccounts)
                .giaoDich(transactions)
                .lichXemPhong(appointments)
                .phongChoThue(rooms)
                .build();
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
        if (currentStatus && !Boolean.TRUE.equals(user.getTrangThaiKhoa())
                && Boolean.TRUE.equals(user.getChuTro()) && reputationService != null) {
            reputationService.restoreOnAdminUnlock(user, currentUsername);
        }
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

    private record AppointmentStatRow(
            String maDatLich,
            TrangThaiDatLich trangThai,
            Long phiThu,
            Long coc,
            LocalDateTime ngayHen,
            LocalDateTime thoiGianDat,
            Boolean daNhanLaiCoc,
            Boolean khachHangDongY,
            Boolean chuTroDongY,
            String liDoHuy,
            String tenLoaiPhong
    ) {
        LocalDateTime resolveTime() {
            return ngayHen != null ? ngayHen : thoiGianDat;
        }
    }

    private static long toLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "admin_statistics", key = "T(String).format('%s-%s-%s', #day, #month, #year)")
    public AdminStatisticsResponseDTO getStatistics(Integer day, Integer month, Integer year) {
        boolean hasFilter = (day != null || month != null || year != null);
        List<Object[]> roomRows = phongTroRepository.findRoomStatsRows();
        List<Object[]> userAggRows = nguoiDungRepository.aggregateUserCounts(hasFilter, day, month, year);
        List<Object[]> appointmentRows = phieuDatLichRepository.findAppointmentStatsRows();
        List<Integer> txYears = giaoDichRepository.findDistinctTransactionYears();
        List<Object[]> ledgerAggRows = giaoDichRepository.aggregateLedgerStats(hasFilter, day, month, year);
        List<Object[]> aiTrackingRows = aiUsageLogRepository != null
                ? aiUsageLogRepository.aggregateTrackingSummaryForStats(hasFilter, day, month, year)
                : List.of();

        Map<String, String> roomTypeByRoomId = new LinkedHashMap<>();
        Map<String, String> roomTypeIdByName = new LinkedHashMap<>();
        Map<String, Long> approvedSupplyByType = new LinkedHashMap<>();
        TreeSet<Integer> yearSet = new TreeSet<>(Comparator.reverseOrder());
        yearSet.add(LocalDate.now().getYear());

        long tongSoPhong = 0;
        long soPhongChoDuyet = 0;
        long soPhongDaDuyet = 0;
        long soPhongHoanThanh = 0;
        long soPhongHuy = 0;
        Map<String, Long> roomTypeCounts = new LinkedHashMap<>();

        for (Object[] row : roomRows) {
            if (row == null || row.length < 6) continue;
            String maPhong = row[0] != null ? String.valueOf(row[0]) : null;
            String maLpt = row[1] != null ? String.valueOf(row[1]) : null;
            String rawTypeName = row[2] != null ? String.valueOf(row[2]) : null;
            String typeName = (rawTypeName != null && !rawTypeName.isBlank()) ? rawTypeName : "Khác";
            TrangThaiPhongTro trangThai = row[3] instanceof TrangThaiPhongTro st ? st : null;
            boolean tamAn = Boolean.TRUE.equals(row[4]);
            LocalDateTime thoiGianDang = row[5] instanceof LocalDateTime dt ? dt : null;

            if (maPhong != null) {
                roomTypeByRoomId.put(maPhong, typeName);
            }
            if (maLpt != null) {
                roomTypeIdByName.putIfAbsent(typeName, maLpt);
            }
            if (trangThai == TrangThaiPhongTro.DA_DUYET && !tamAn) {
                approvedSupplyByType.merge(typeName, 1L, Long::sum);
            }
            if (thoiGianDang != null) {
                yearSet.add(thoiGianDang.getYear());
            }

            if (!matchesDateFilter(thoiGianDang, day, month, year)) continue;
            tongSoPhong++;
            if (trangThai == TrangThaiPhongTro.CHO_DUYET) soPhongChoDuyet++;
            else if (trangThai == TrangThaiPhongTro.DA_DUYET) soPhongDaDuyet++;
            else if (trangThai == TrangThaiPhongTro.HOAN_THANH) soPhongHoanThanh++;
            else if (trangThai == TrangThaiPhongTro.HUY) soPhongHuy++;
            roomTypeCounts.merge(typeName, 1L, Long::sum);
        }

        List<AppointmentStatRow> allAppointments = new ArrayList<>(appointmentRows.size());
        for (Object[] row : appointmentRows) {
            if (row == null || row.length < 11) continue;
            String rawType = row[10] != null ? String.valueOf(row[10]) : null;
            String typeName = (rawType != null && !rawType.isBlank()) ? rawType : "Khác";
            AppointmentStatRow item = new AppointmentStatRow(
                    row[0] != null ? String.valueOf(row[0]) : null,
                    row[1] instanceof TrangThaiDatLich st ? st : null,
                    row[2] instanceof Number n ? n.longValue() : null,
                    row[3] instanceof Number n ? n.longValue() : null,
                    row[4] instanceof LocalDateTime dt ? dt : null,
                    row[5] instanceof LocalDateTime dt ? dt : null,
                    row[6] instanceof Boolean b ? b : null,
                    row[7] instanceof Boolean b ? b : null,
                    row[8] instanceof Boolean b ? b : null,
                    row[9] != null ? String.valueOf(row[9]) : null,
                    typeName
            );
            allAppointments.add(item);
            LocalDateTime t = item.resolveTime();
            if (t != null) yearSet.add(t.getYear());
        }
        if (txYears != null) {
            for (Integer y : txYears) {
                if (y != null) yearSet.add(y);
            }
        }
        List<Integer> cacNamCoDuLieu = new ArrayList<>(yearSet);

        // 2. Thống kê tài khoản người dùng & hàng đợi duyệt chủ trọ / khiếu nại
        long tongNguoiDung = 0;
        long soKhachHang = 0;
        long soChuTro = 0;
        if (userAggRows != null && !userAggRows.isEmpty() && userAggRows.get(0) != null && userAggRows.get(0).length >= 3) {
            Object[] uRow = userAggRows.get(0);
            tongNguoiDung = toLong(uRow[0]);
            soKhachHang = toLong(uRow[1]);
            soChuTro = toLong(uRow[2]);
        }
        long soChuTroChoDuyet = yeuCauChuTroRepository.countByTrangThai(TrangThaiYeuCauChuTro.CHO_DUYET);
        long soKhieuNaiChoDuyet = phieuKhieuNaiRepository != null
                ? phieuKhieuNaiRepository.countByTrangThai(TrangThaiKhieuNai.CHO_DUYET)
                : 0L;

        // 3. Doanh thu hoa hồng sàn: SUM(phiThu) từ PhieuDatLich trạng thái HOAN_THANH
        List<AppointmentStatRow> periodAppointments = new ArrayList<>();
        List<AppointmentStatRow> completedAppointments = new ArrayList<>();
        List<AppointmentStatRow> heldDepositCandidates = new ArrayList<>();
        long tongDoanhThu = 0L;
        long quyTamGiuCoc = 0L;
        long soLichDatCoc = 0L;
        long soLichDaXem = 0L;
        long soLichHuy = 0L;
        long soLichKhachTuChoi = 0L;
        long soLichChuTroTuChoi = 0L;
        long soCaNoShow = 0L;

        Map<String, Long> bookingsByType = new LinkedHashMap<>();
        Map<String, Long> completedByType = new LinkedHashMap<>();
        Map<String, Long> revenueByType = new LinkedHashMap<>();

        for (AppointmentStatRow p : allAppointments) {
            LocalDateTime appointmentTime = p.resolveTime();
            if (!matchesDateFilter(appointmentTime, day, month, year)) continue;
            periodAppointments.add(p);

            String roomTypeName = p.tenLoaiPhong();
            roomTypeCounts.putIfAbsent(roomTypeName, 0L);
            bookingsByType.merge(roomTypeName, 1L, Long::sum);
            if ((p.coc() != null && p.coc() > 0) || p.trangThai() != TrangThaiDatLich.HUY) {
                soLichDatCoc++;
            }
            if (Boolean.TRUE.equals(p.daNhanLaiCoc()) || p.trangThai() == TrangThaiDatLich.HOAN_THANH) {
                soLichDaXem++;
            }

            if (p.trangThai() == TrangThaiDatLich.HOAN_THANH) {
                completedAppointments.add(p);
                long fee = p.phiThu() != null ? p.phiThu() : 0L;
                tongDoanhThu += fee;
                completedByType.merge(roomTypeName, 1L, Long::sum);
                revenueByType.merge(roomTypeName, fee, Long::sum);
            } else if (p.trangThai() == TrangThaiDatLich.HUY) {
                soLichHuy++;
                if (Boolean.FALSE.equals(p.khachHangDongY())) soLichKhachTuChoi++;
                if (Boolean.FALSE.equals(p.chuTroDongY())) soLichChuTroTuChoi++;
                String reason = p.liDoHuy() != null ? p.liDoHuy().toLowerCase(Locale.ROOT) : "";
                if (reason.contains("vắng mặt") || reason.contains("no-show") || reason.contains("no show")) {
                    soCaNoShow++;
                }
            } else if ((p.trangThai() == TrangThaiDatLich.XAC_NHAN || p.trangThai() == TrangThaiDatLich.CHO_XAC_NHAN)
                    && p.coc() != null && p.coc() > 0 && p.maDatLich() != null) {
                heldDepositCandidates.add(p);
            }
        }

        if (!heldDepositCandidates.isEmpty()) {
            List<String> paidDepositNotes = giaoDichRepository.findPaidDepositNotes();
            Set<String> paidBookingCodes = new HashSet<>();
            for (String note : paidDepositNotes) {
                if (note == null) continue;
                Matcher m = BOOKING_CODE_PATTERN.matcher(note);
                while (m.find()) {
                    paidBookingCodes.add(m.group());
                }
            }
            for (AppointmentStatRow p : heldDepositCandidates) {
                String code = p.maDatLich();
                boolean matched = paidBookingCodes.contains(code)
                        || (!code.startsWith("DL") && paidDepositNotes.stream().anyMatch(n -> n != null && n.contains(code)));
                if (matched) {
                    quyTamGiuCoc += p.coc();
                }
            }
        }
        long soLichHoanThanh = completedAppointments.size();

        // 4. Đối soát ngân khố & ví chủ trọ từ sổ cái GiaoDich (aggregate trực tiếp trong SQL)
        long quyChoRut = 0L;
        long soLenhRutChoDuyet = 0L;
        long landlordCredits = 0L;
        long landlordDebits = 0L;
        if (ledgerAggRows != null && !ledgerAggRows.isEmpty() && ledgerAggRows.get(0) != null && ledgerAggRows.get(0).length >= 5) {
            Object[] lRow = ledgerAggRows.get(0);
            quyTamGiuCoc += toLong(lRow[0]);
            quyChoRut = toLong(lRow[1]);
            soLenhRutChoDuyet = toLong(lRow[2]);
            landlordCredits = toLong(lRow[3]);
            landlordDebits = toLong(lRow[4]);
        }

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
                buildRevenueChart(completedAppointments, periodAppointments, day, month, year, cacNamCoDuLieu);

        // 5. Tracking phễu hành vi & Ma trận Cung-Cầu-Hoa hồng theo loại phòng
        long luotTimKiemAi = 0L;
        long luotHienThiGoiY = 0L;
        long luotClickGoiY = 0L;
        long luotXemChiTiet = 0L;
        long luotXemTour360 = 0L;
        Map<String, Long> viewsByType = new LinkedHashMap<>();
        Map<String, Long> clicksByType = new LinkedHashMap<>();

        for (Object[] row : aiTrackingRows) {
            if (row == null || row.length < 3) continue;
            String feature = row[0] != null ? String.valueOf(row[0]) : "";
            String roomId = row[1] != null ? String.valueOf(row[1]) : null;
            long count = toLong(row[2]);
            String typeName = roomId != null ? roomTypeByRoomId.getOrDefault(roomId, "Khác") : null;

            switch (feature) {
                case "AI_SEARCH" -> luotTimKiemAi += count;
                case "RECOMMEND_IMPRESSION" -> luotHienThiGoiY += count;
                case "RECOMMEND_CLICK" -> {
                    luotClickGoiY += count;
                    if (typeName != null) clicksByType.merge(typeName, count, Long::sum);
                }
                case "ROOM_VIEW" -> {
                    luotXemChiTiet += count;
                    if (typeName != null) viewsByType.merge(typeName, count, Long::sum);
                }
                case "TOUR_360_VIEW" -> {
                    luotXemTour360 += count;
                    if (typeName != null) viewsByType.merge(typeName, count, Long::sum);
                }
                default -> { }
            }
        }

        long luotYeuThich = 0L;
        for (Object[] row : phongTroRepository.countFavoritesByRoom()) {
            if (row != null && row.length >= 2 && row[1] instanceof Number cnt) {
                luotYeuThich += cnt.longValue();
            }
        }

        List<AdminStatisticsResponseDTO.RoomTypeStatDTO> coCauLoaiPhong = roomTypeCounts.entrySet().stream()
                .filter(e -> e.getValue() > 0 || bookingsByType.getOrDefault(e.getKey(), 0L) > 0 || viewsByType.getOrDefault(e.getKey(), 0L) > 0)
                .sorted(Comparator
                        .<Map.Entry<String, Long>>comparingLong(e -> revenueByType.getOrDefault(e.getKey(), 0L)).reversed()
                        .thenComparing(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(e -> {
                    String name = e.getKey();
                    long booked = bookingsByType.getOrDefault(name, 0L);
                    long completed = completedByType.getOrDefault(name, 0L);
                    return AdminStatisticsResponseDTO.RoomTypeStatDTO.builder()
                            .maLoaiPhong(roomTypeIdByName.get(name))
                            .tenLoaiPhong(name)
                            .soLuong(e.getValue())
                            .soPhongDangHienThi(approvedSupplyByType.getOrDefault(name, 0L))
                            .luotXem(viewsByType.getOrDefault(name, 0L))
                            .luotClickGoiY(clicksByType.getOrDefault(name, 0L))
                            .soLichDat(booked)
                            .soLichHoanThanh(completed)
                            .doanhThuHoaHong(revenueByType.getOrDefault(name, 0L))
                            .tyLeChot(booked > 0 ? round1(completed * 100.0 / booked) : 0.0)
                            .build();
                })
                .toList();

        AdminStatisticsResponseDTO.ConversionFunnelDTO pheuChuyenDoi =
                AdminStatisticsResponseDTO.ConversionFunnelDTO.builder()
                        .luotTimKiemAi(luotTimKiemAi)
                        .luotHienThiGoiY(luotHienThiGoiY)
                        .luotClickGoiY(luotClickGoiY)
                        .ctrGoiYPercent(luotHienThiGoiY > 0 ? round1(luotClickGoiY * 100.0 / luotHienThiGoiY) : 0.0)
                        .luotXemChiTiet(luotXemChiTiet)
                        .luotXemTour360(luotXemTour360)
                        .luotYeuThich(luotYeuThich)
                        .soLichDatCoc(soLichDatCoc)
                        .soLichDaXem(soLichDaXem)
                        .soLichHoanThanh(soLichHoanThanh)
                        .soLichHuy(soLichHuy)
                        .soLichKhachTuChoi(soLichKhachTuChoi)
                        .soLichChuTroTuChoi(soLichChuTroTuChoi)
                        .soCaNoShow(soCaNoShow)
                        .tyLeChotTuDatLichPercent(soLichDatCoc > 0 ? round1(soLichHoanThanh * 100.0 / soLichDatCoc) : 0.0)
                        .tyLeChotTuXemThucTePercent(soLichDaXem > 0 ? round1(soLichHoanThanh * 100.0 / soLichDaXem) : 0.0)
                        .build();

        AdminStatisticsResponseDTO.PeriodComparisonDTO soSanhKyTruoc =
                buildPeriodComparison(allAppointments, bieuDoDoanhThu, day, month, year, tongDoanhThu, soLichHoanThanh);

        AdminStatisticsResponseDTO.AiBusinessSummaryDTO tongQuanAiTracking =
                buildAiBusinessSummary(tongDoanhThu, day, month, year);

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
                .soKhieuNaiChoDuyet(soKhieuNaiChoDuyet)
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
                .soSanhKyTruoc(soSanhKyTruoc)
                .pheuChuyenDoi(pheuChuyenDoi)
                .tongQuanAiTracking(tongQuanAiTracking)
                .build();
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
            List<AppointmentStatRow> completedAppointments,
            List<AppointmentStatRow> periodAppointments,
            Integer day,
            Integer month,
            Integer year,
            List<Integer> cacNamCoDuLieu
    ) {
        Map<String, long[]> buckets = new LinkedHashMap<>();

        if (day != null && month != null && year != null) {
            String[] slotLabels = {"00h–04h", "04h–08h", "08h–12h", "12h–16h", "16h–20h", "20h–24h"};
            for (String slot : slotLabels) {
                buckets.put(slot, new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                int idx = Math.min(5, Math.max(0, t.getHour() / 4));
                accumulateBucket(buckets, slotLabels[idx], p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                int idx = Math.min(5, Math.max(0, t.getHour() / 4));
                accumulateBookingBucket(buckets, slotLabels[idx]);
            }
            return toChartPoints(buckets);
        }

        if (day == null && month != null && year != null) {
            if (month < 1 || month > 12 || year < 1900 || year > 2100) {
                return List.of();
            }
            int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
            for (int d = 1; d <= daysInMonth; d++) {
                buckets.put(String.format("%02d/%02d", d, month), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBookingBucket(buckets, key);
            }
            return toChartPoints(buckets);
        }

        if (day == null && month != null) {
            if (month < 1 || month > 12) {
                return List.of();
            }
            int maxDay = (month == 2) ? 29 : (month == 4 || month == 6 || month == 9 || month == 11 ? 30 : 31);
            for (int d = 1; d <= maxDay; d++) {
                buckets.put(String.format("Ngày %02d", d), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("Ngày %02d", t.getDayOfMonth());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("Ngày %02d", t.getDayOfMonth());
                accumulateBookingBucket(buckets, key);
            }
            return toChartPoints(buckets);
        }

        if (day == null && year != null) {
            for (int m = 1; m <= 12; m++) {
                buckets.put(String.format("%02d/%d", m, year), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                accumulateBookingBucket(buckets, key);
            }
            return toChartPoints(buckets);
        }

        if (day == null) {
            YearMonth earliest = null;
            YearMonth latest = null;
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
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
                buckets.put(String.format("%02d/%d", ym.getMonthValue(), ym.getYear()), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%d", t.getMonthValue(), t.getYear());
                if (buckets.containsKey(key)) {
                    accumulateBookingBucket(buckets, key);
                }
            }
            return toChartPoints(buckets);
        }

        if (month == null && year != null) {
            for (int m = 1; m <= 12; m++) {
                buckets.put(String.format("%02d/%02d", day, m), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d", t.getDayOfMonth(), t.getMonthValue());
                accumulateBookingBucket(buckets, key);
            }
            return toChartPoints(buckets);
        }

        if (month != null) {
            List<Integer> ascYears = new ArrayList<>(cacNamCoDuLieu);
            ascYears.sort(Comparator.naturalOrder());
            for (Integer y : ascYears) {
                buckets.put(String.format("%02d/%02d/%d", day, month, y), new long[]{0L, 0L, 0L});
            }
            for (AppointmentStatRow p : completedAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
                accumulateBucket(buckets, key, p.phiThu());
            }
            for (AppointmentStatRow p : periodAppointments) {
                LocalDateTime t = p.resolveTime();
                if (t == null) continue;
                String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
                accumulateBookingBucket(buckets, key);
            }
            return toChartPoints(buckets);
        }

        // day != null && month == null && year == null
        TreeSet<LocalDate> dates = new TreeSet<>();
        for (AppointmentStatRow p : completedAppointments) {
            LocalDateTime t = p.resolveTime();
            if (t != null) dates.add(t.toLocalDate());
        }
        for (LocalDate d : dates) {
            buckets.put(String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear()),
                    new long[]{0L, 0L, 0L});
        }
        for (AppointmentStatRow p : completedAppointments) {
            LocalDateTime t = p.resolveTime();
            if (t == null) continue;
            String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
            accumulateBucket(buckets, key, p.phiThu());
        }
        for (AppointmentStatRow p : periodAppointments) {
            LocalDateTime t = p.resolveTime();
            if (t == null) continue;
            String key = String.format("%02d/%02d/%d", t.getDayOfMonth(), t.getMonthValue(), t.getYear());
            if (buckets.containsKey(key)) {
                accumulateBookingBucket(buckets, key);
            }
        }
        return toChartPoints(buckets);
    }

    private void accumulateBucket(Map<String, long[]> buckets, String key, Long phiThu) {
        long[] entry = buckets.computeIfAbsent(key, k -> new long[]{0L, 0L, 0L});
        entry[0] += (phiThu != null ? phiThu : 0L);
        entry[1] += 1L;
    }

    private void accumulateBookingBucket(Map<String, long[]> buckets, String key) {
        long[] entry = buckets.computeIfAbsent(key, k -> new long[]{0L, 0L, 0L});
        entry[2] += 1L;
    }

    private List<AdminStatisticsResponseDTO.RevenuePointDTO> toChartPoints(Map<String, long[]> buckets) {
        List<AdminStatisticsResponseDTO.RevenuePointDTO> points = new ArrayList<>(buckets.size());
        for (Map.Entry<String, long[]> entry : buckets.entrySet()) {
            points.add(AdminStatisticsResponseDTO.RevenuePointDTO.builder()
                    .nhan(entry.getKey())
                    .doanhThu(entry.getValue()[0])
                    .soLichHoanThanh(entry.getValue()[1])
                    .soLichDat(entry.getValue()[2])
                    .build());
        }
        return points;
    }

    private AdminStatisticsResponseDTO.PeriodComparisonDTO buildPeriodComparison(
            List<AppointmentStatRow> allAppointments,
            List<AdminStatisticsResponseDTO.RevenuePointDTO> chartPoints,
            Integer day,
            Integer month,
            Integer year,
            long currentRevenue,
            long currentCompleted
    ) {
        if (day != null && month != null && year != null) {
            try {
                LocalDate prevDate = LocalDate.of(year, month, day).minusDays(1);
                return compareWithFilter(allAppointments, prevDate.getDayOfMonth(), prevDate.getMonthValue(), prevDate.getYear(), currentRevenue, currentCompleted);
            } catch (RuntimeException ignored) {
                return AdminStatisticsResponseDTO.PeriodComparisonDTO.builder().coSoSanh(false).build();
            }
        }
        if (day == null && month != null && year != null) {
            YearMonth prevYm = YearMonth.of(year, month).minusMonths(1);
            return compareWithFilter(allAppointments, null, prevYm.getMonthValue(), prevYm.getYear(), currentRevenue, currentCompleted);
        }
        if (day == null && month == null && year != null) {
            return compareWithFilter(allAppointments, null, null, year - 1, currentRevenue, currentCompleted);
        }
        if (day == null && month == null && year == null && chartPoints != null && chartPoints.size() >= 2) {
            var latest = chartPoints.get(chartPoints.size() - 1);
            var prev = chartPoints.get(chartPoints.size() - 2);
            return AdminStatisticsResponseDTO.PeriodComparisonDTO.builder()
                    .coSoSanh(true)
                    .doanhThuKyTruoc(prev.getDoanhThu())
                    .phanTramBienDongDoanhThu(calcDeltaPct(latest.getDoanhThu(), prev.getDoanhThu()))
                    .soLichHoanThanhKyTruoc(prev.getSoLichHoanThanh())
                    .phanTramBienDongLich(calcDeltaPct(latest.getSoLichHoanThanh(), prev.getSoLichHoanThanh()))
                    .build();
        }
        return AdminStatisticsResponseDTO.PeriodComparisonDTO.builder().coSoSanh(false).build();
    }

    private AdminStatisticsResponseDTO.PeriodComparisonDTO compareWithFilter(
            List<AppointmentStatRow> allAppointments,
            Integer prevDay,
            Integer prevMonth,
            Integer prevYear,
            long currentRevenue,
            long currentCompleted
    ) {
        long prevRev = 0L;
        long prevCompleted = 0L;
        for (AppointmentStatRow p : allAppointments) {
            if (p.trangThai() != TrangThaiDatLich.HOAN_THANH) continue;
            LocalDateTime t = p.resolveTime();
            if (!matchesDateFilter(t, prevDay, prevMonth, prevYear)) continue;
            prevCompleted++;
            prevRev += (p.phiThu() != null ? p.phiThu() : 0L);
        }
        return AdminStatisticsResponseDTO.PeriodComparisonDTO.builder()
                .coSoSanh(true)
                .doanhThuKyTruoc(prevRev)
                .phanTramBienDongDoanhThu(calcDeltaPct(currentRevenue, prevRev))
                .soLichHoanThanhKyTruoc(prevCompleted)
                .phanTramBienDongLich(calcDeltaPct(currentCompleted, prevCompleted))
                .build();
    }

    private Double calcDeltaPct(long current, long previous) {
        if (previous <= 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return round1((current - previous) * 100.0 / previous);
    }

    private AdminStatisticsResponseDTO.AiBusinessSummaryDTO buildAiBusinessSummary(
            long tongDoanhThu,
            Integer day,
            Integer month,
            Integer year
    ) {
        if (aiTrackingService == null) {
            return null;
        }
        int days = 30;
        if (day != null && month != null && year != null) days = 1;
        else if (year != null && month == null) days = 90;

        try {
            AiTrackingSummaryResponse ai = aiTrackingService.getSummary(days);
            if (ai == null) return null;
            long aiCostVnd = ai.getEstimatedCostVnd();
            long netMargin = tongDoanhThu - aiCostVnd;
            double costRatio = tongDoanhThu > 0 ? round1(aiCostVnd * 100.0 / tongDoanhThu) : 0.0;
            List<AdminStatisticsResponseDTO.IntentStatDTO> topIntents = ai.getIntentBreakdown() == null
                    ? List.of()
                    : ai.getIntentBreakdown().stream()
                    .limit(6)
                    .map(i -> AdminStatisticsResponseDTO.IntentStatDTO.builder()
                            .intent(i.getIntent())
                            .count(i.getCount())
                            .build())
                    .toList();

            var quota = ai.getQuotaStatus();
            var vector = ai.getVectorHealth();
            return AdminStatisticsResponseDTO.AiBusinessSummaryDTO.builder()
                    .tongLuotGoiProvider(ai.getProviderCalls())
                    .tongLuotBypass(ai.getLocalBypassCalls())
                    .tyLeTietKiemBypassPercent(ai.getCostSavingsPercent())
                    .tyLeThanhCongPercent(ai.getSuccessRatePercent())
                    .tongToken(ai.getTotalTokens())
                    .chiPhiUocTinhUsd(ai.getEstimatedCostUsd())
                    .chiPhiUocTinhVnd(aiCostVnd)
                    .pricingConfigured(ai.isPricingConfigured())
                    .bienLoiNhuanSauAiVnd(netMargin)
                    .tyLeChiPhiAiTrenDoanhThuPercent(costRatio)
                    .dailyTokensUsed(quota != null ? quota.getDailyTokensUsed() : 0L)
                    .dailyTokenLimit(quota != null ? quota.getDailyTokenLimit() : 0L)
                    .quotaUsagePercent(quota != null ? quota.getQuotaUsagePercent() : 0.0)
                    .quotaWarning(quota != null && quota.isWarning())
                    .totalApprovedRooms(vector != null ? vector.getTotalApprovedRooms() : 0L)
                    .indexedRooms(vector != null ? vector.getIndexedRooms() : 0L)
                    .vectorCoveragePercent(vector != null ? vector.getCoveragePercent() : 0.0)
                    .semanticSearchCount(vector != null ? vector.getSemanticSearchCount() : 0L)
                    .filteredFallbackCount(vector != null ? vector.getFilteredFallbackCount() : 0L)
                    .topIntents(topIntents)
                    .build();
        } catch (Exception ex) {
            return null;
        }
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    // ==========================================
    // QUẢN LÝ GIAO DỊCH & DUYỆT RÚT TIỀN (NGÂN KHỐ)
    // ==========================================

    @Transactional(readOnly = true)
    public AdminTransactionPageResponseDTO getTransactionsPaged(
            String keyword,
            String filterType,
            TrangThaiGD trangThai,
            Pageable pageable
    ) {
        String trimmedKeyword = keyword != null ? keyword.trim() : "";
        String normalizedFilter = "ALL";
        if ("WITHDRAWAL".equalsIgnoreCase(filterType)) {
            normalizedFilter = "WITHDRAWAL";
        } else if ("DEPOSIT".equalsIgnoreCase(filterType)) {
            normalizedFilter = "DEPOSIT";
        }

        final String finalFilter = normalizedFilter;
        Specification<GiaoDich> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if ("WITHDRAWAL".equals(finalFilter)) {
                predicates.add(cb.upper(cb.coalesce(root.get("loaiGiaoDich"), ""))
                        .in(List.of("YEU_CAU_RUT_TIEN", "RUT_TIEN")));
            } else if ("DEPOSIT".equals(finalFilter)) {
                predicates.add(cb.like(cb.upper(cb.coalesce(root.get("loaiGiaoDich"), "")), "%COC%"));
            }
            if (trangThai != null) {
                predicates.add(cb.equal(root.get("trangThai"), trangThai));
            }
            if (!trimmedKeyword.isEmpty()) {
                Join<GiaoDich, NguoiDung> userJoin = root.join("nguoiDung", JoinType.LEFT);
                String lowerKw = trimmedKeyword.toLowerCase(Locale.ROOT);
                String likeKw = "%" + lowerKw + "%";
                predicates.add(cb.or(
                        cb.equal(cb.lower(cb.coalesce(userJoin.get("maNguoiDung"), "")), lowerKw),
                        cb.equal(cb.coalesce(userJoin.get("sdt"), ""), trimmedKeyword),
                        cb.equal(cb.lower(cb.coalesce(userJoin.get("email"), "")), lowerKw),
                        cb.equal(cb.lower(cb.coalesce(userJoin.get("tenDangNhap"), "")), lowerKw),
                        cb.like(cb.lower(cb.coalesce(userJoin.get("hoVaTen"), "")), likeKw),
                        cb.equal(cb.coalesce(userJoin.get("cccd"), ""), trimmedKeyword),
                        cb.equal(cb.lower(root.get("maGiaoDich")), lowerKw)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "ngayGiaoDich")
        );
        Page<GiaoDich> pageData = giaoDichRepository.findAll(spec, sortedPageable);

        Map<TrangThaiGD, Long> statusCounts = new EnumMap<>(TrangThaiGD.class);
        for (TrangThaiGD st : TrangThaiGD.values()) {
            statusCounts.put(st, 0L);
        }
        for (Object[] row : giaoDichRepository.countByTrangThaiFiltered(finalFilter, trimmedKeyword)) {
            if (row != null && row.length >= 2 && row[0] instanceof TrangThaiGD st && row[1] instanceof Number cnt) {
                statusCounts.put(st, cnt.longValue());
            }
        }

        return AdminTransactionPageResponseDTO.builder()
                .content(toAdminTransactionDTOs(pageData.getContent()))
                .totalElements(pageData.getTotalElements())
                .totalPages(Math.max(pageData.getTotalPages(), 1))
                .size(pageData.getSize())
                .number(pageData.getNumber())
                .statusCounts(statusCounts)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponseDTO> getAllAppointments(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return List.of();
        }
        return phieuDatLichRepository.searchByCodeOrPhone(keyword.trim(), PageRequest.of(0, 100))
                .stream()
                .map(AdminAppointmentResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminTransactionResponseDTO getTransactionById(String id) {
        GiaoDich gd = giaoDichRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        return toAdminTransactionDTO(gd);
    }

    private List<AdminTransactionResponseDTO> toAdminTransactionDTOs(List<GiaoDich> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return List.of();
        }
        List<AdminTransactionResponseDTO> dtos = new ArrayList<>(transactions.size());
        Set<String> missingBankUserIds = new HashSet<>();

        for (GiaoDich gd : transactions) {
            AdminTransactionResponseDTO dto = AdminTransactionResponseDTO.fromEntity(gd);
            dtos.add(dto);
            if ((dto.getSoTaiKhoan() == null || dto.getSoTaiKhoan().isBlank())
                    && gd.getNguoiDung() != null
                    && gd.getNguoiDung().getMaNguoiDung() != null
                    && ("HOAN_COC".equalsIgnoreCase(gd.getLoaiGiaoDich()) || "RUT_TIEN".equalsIgnoreCase(gd.getLoaiGiaoDich()))) {
                missingBankUserIds.add(gd.getNguoiDung().getMaNguoiDung());
            }
        }

        if (!missingBankUserIds.isEmpty()) {
            Map<String, TaiKhoanNganHang> primaryBankByUser = new HashMap<>();
            for (TaiKhoanNganHang bank : taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDungIn(missingBankUserIds)) {
                if (bank.getNguoiDung() == null || bank.getNguoiDung().getMaNguoiDung() == null) continue;
                String uid = bank.getNguoiDung().getMaNguoiDung();
                TaiKhoanNganHang existing = primaryBankByUser.get(uid);
                if (existing == null || (bank.isMacDinh() && !existing.isMacDinh())) {
                    primaryBankByUser.put(uid, bank);
                }
            }
            for (int i = 0; i < transactions.size(); i++) {
                AdminTransactionResponseDTO dto = dtos.get(i);
                if (dto.getSoTaiKhoan() != null && !dto.getSoTaiKhoan().isBlank()) continue;
                GiaoDich gd = transactions.get(i);
                if (gd.getNguoiDung() == null || gd.getNguoiDung().getMaNguoiDung() == null) continue;
                if (!"HOAN_COC".equalsIgnoreCase(gd.getLoaiGiaoDich()) && !"RUT_TIEN".equalsIgnoreCase(gd.getLoaiGiaoDich())) {
                    continue;
                }
                TaiKhoanNganHang primary = primaryBankByUser.get(gd.getNguoiDung().getMaNguoiDung());
                if (primary != null) {
                    dto.setTenNganHang(primary.getTenNganHang());
                    dto.setSoTaiKhoan(primary.getSoTaiKhoan());
                    if (primary.getTenChuTaiKhoan() != null && !primary.getTenChuTaiKhoan().isBlank()) {
                        dto.setTenChuTaiKhoan(primary.getTenChuTaiKhoan());
                    }
                }
            }
        }
        return dtos;
    }

    private AdminTransactionResponseDTO toAdminTransactionDTO(GiaoDich gd) {
        return toAdminTransactionDTOs(List.of(gd)).get(0);
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

        // 2. Kiểm tra ngân khố hệ thống bằng aggregate SQL (không quét 4 bảng khi đang giữ lock)
        long tongQuyThucTe = calculateTotalActualTreasury();
        long soTienDuyet = gd.getSoTien() != null ? gd.getSoTien() : 0L;
        if (tongQuyThucTe < soTienDuyet) {
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

        // Nếu là lệnh bồi thường No-show: Giải ngân tiền từ Sàn vào ví Chủ trọ
        if ("BOI_THUONG_NO_SHOW".equalsIgnoreCase(gd.getLoaiGiaoDich()) && gd.getNguoiDung() != null) {
            ChuTro chuTro = chuTroRepository.findByIdForUpdate(gd.getNguoiDung().getMaNguoiDung()).orElse(null);
            if (chuTro != null) {
                chuTro.setSoDu(chuTro.getSoDu() + soTienDuyet);
                chuTroRepository.save(chuTro);
            }
        }

        if (realtimePublisher != null) realtimePublisher.walletUpdated(gd.getNguoiDung() != null ? gd.getNguoiDung().getMaNguoiDung() : null, true);
        return AdminTransactionResponseDTO.fromEntity(gd);
    }

    private long calculateTotalActualTreasury() {
        long soDuViChuTro = safeLong(chuTroRepository.sumTotalSoDu());
        long tongDoanhThu = safeLong(phieuDatLichRepository.sumPhiThuByTrangThai(TrangThaiDatLich.HOAN_THANH));
        long cocTamGiu = safeLong(phieuDatLichRepository.sumActiveHeldDeposit())
                + safeLong(giaoDichRepository.sumPendingRefundAndNoShow());
        long quyChoRut = safeLong(giaoDichRepository.sumSoTienByLoaiAndTrangThai("RUT_TIEN", TrangThaiGD.CHO_THANH_TOAN));
        return cocTamGiu + soDuViChuTro + quyChoRut + tongDoanhThu;
    }

    private long safeLong(Long value) {
        return value != null ? value : 0L;
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public AdminTransactionResponseDTO approveTransaction(String id, String adminUsername) {
        return approveTransaction(id, adminUsername, null);
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

        if (realtimePublisher != null) realtimePublisher.walletUpdated(gd.getNguoiDung() != null ? gd.getNguoiDung().getMaNguoiDung() : null, true);
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
                    .tenChuTaiKhoan(yc.getTenChuTaiKhoan())
                    .nguoiDung(user)
                    .build();
            taiKhoanNganHangRepository.save(tk);
        }

        if (realtimePublisher != null) realtimePublisher.adminQueueUpdated(user.getMaNguoiDung(), "LANDLORD_REQUEST");
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
        if (realtimePublisher != null) realtimePublisher.adminQueueUpdated(yc.getNguoiDung() != null ? yc.getNguoiDung().getMaNguoiDung() : null, "LANDLORD_REQUEST");
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
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public RoomTypeDepositFeeResponseDTO updateDepositFee(String maLpt, UpdateDepositFeeRequest request) {
        String currentUsername = SecurityUtils.getCurrentUsername();
        if (currentUsername == null || "anonymousUser".equals(currentUsername)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung currentAdmin = nguoiDungRepository.findByTenDangNhap(currentUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!passwordEncoder.matches(request.getMatKhauAdmin(), currentAdmin.getMatKhau())) {
            throw new AppException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }

        int soTienCoc = request.getSoTienCoc();
        int phiMoi = request.getPhiThu();
        if (soTienCoc < 50_000 || soTienCoc > 2_000_000 || phiMoi < 0 || phiMoi >= soTienCoc) {
            throw new AppException(ErrorCode.INVALID_DEPOSIT_FEE);
        }
        if (soTienCoc % 1000 != 0 || phiMoi % 1000 != 0) {
            throw new AppException(ErrorCode.DEPOSIT_AMOUNT_STEP_INVALID);
        }
        if ((long) phiMoi * 100L > (long) soTienCoc * 30L) {
            throw new AppException(ErrorCode.COMMISSION_RATE_EXCEEDED);
        }

        LoaiPhongTro lpt = loaiPhongTroRepository.findByIdForUpdate(maLpt)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_TYPE_NOT_FOUND));

        Coc existingCoc = lpt.getCoc();
        PhiThu existingPhi = existingCoc != null ? existingCoc.getPhiThu() : null;
        int cocCu = existingCoc != null && existingCoc.getSoTienCoc() != null ? existingCoc.getSoTienCoc() : 0;
        int phiCu = existingPhi != null && existingPhi.getPhi() != null ? existingPhi.getPhi() : 0;

        if (existingCoc != null && existingPhi != null && cocCu == soTienCoc && phiCu == phiMoi) {
            throw new AppException(ErrorCode.DEPOSIT_FEE_UNCHANGED);
        }

        Coc coc = existingCoc;
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
                    .soTienCoc(soTienCoc)
                    .build();
            coc = cocRepository.save(coc);
            lpt.setCoc(coc);
        } else {
            coc.setSoTienCoc(soTienCoc);
            coc = cocRepository.save(coc);
        }

        PhiThu phiThu = existingPhi;
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
                    .phi(phiMoi)
                    .build();
            phiThu = phiThuRepository.save(phiThu);
            coc.setPhiThu(phiThu);
        } else {
            phiThu.setPhi(phiMoi);
            phiThu = phiThuRepository.save(phiThu);
        }

        if (lichSuBieuPhiRepository != null) {
            String nguoiSua = (currentAdmin.getHoVaTen() != null && !currentAdmin.getHoVaTen().isBlank())
                    ? currentAdmin.getHoVaTen() + " (@" + currentAdmin.getTenDangNhap() + ")"
                    : "@" + currentAdmin.getTenDangNhap();
            lichSuBieuPhiRepository.save(LichSuBieuPhi.builder()
                    .maLpt(lpt.getMaLpt())
                    .tenLoaiPhong(lpt.getTenLoaiPhongTro())
                    .cocCu(cocCu)
                    .cocMoi(soTienCoc)
                    .phiCu(phiCu)
                    .phiMoi(phiMoi)
                    .lyDo(request.getLyDo().trim())
                    .nguoiSua(nguoiSua)
                    .thoiGian(LocalDateTime.now())
                    .build());
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

    @Transactional(readOnly = true)
    public List<DepositFeeHistoryResponseDTO> getDepositFeeHistory(String maLpt) {
        if (lichSuBieuPhiRepository == null) {
            return List.of();
        }
        List<LichSuBieuPhi> list = (maLpt != null && !maLpt.isBlank())
                ? lichSuBieuPhiRepository.findTop50ByMaLptOrderByThoiGianDesc(maLpt.trim())
                : lichSuBieuPhiRepository.findTop50ByOrderByThoiGianDesc();
        return list.stream().map(DepositFeeHistoryResponseDTO::fromEntity).toList();
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
