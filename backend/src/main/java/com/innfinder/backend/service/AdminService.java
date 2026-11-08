package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.CategoryUpdateRequest;
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
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

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

    @Transactional(readOnly = true)
    public List<RoomResponseDTO> getPendingRooms() {
        List<PhongTro> list = phongTroRepository.findByTrangThai(TrangThaiPhongTro.CHO_DUYET);
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
            return Page.empty(pageable);
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
        NguoiDung user = nguoiDungRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        boolean currentStatus = Boolean.TRUE.equals(user.getTrangThaiKhoa());
        user.setTrangThaiKhoa(!currentStatus);
        user = nguoiDungRepository.save(user);
        return toUserResponseDTO(user);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "admin_statistics", key = "'summary'")
    public AdminStatisticsResponseDTO getStatistics() {
        long tongSoPhong = phongTroRepository.count();
        long soPhongChoDuyet = phongTroRepository.countByTrangThai(TrangThaiPhongTro.CHO_DUYET);
        long soPhongDaDuyet = phongTroRepository.countByTrangThai(TrangThaiPhongTro.DA_DUYET);
        long soPhongHoanThanh = phongTroRepository.countByTrangThai(TrangThaiPhongTro.HOAN_THANH);
        long soPhongHuy = phongTroRepository.countByTrangThai(TrangThaiPhongTro.HUY);

        long tongNguoiDung = nguoiDungRepository.count();
        long soKhachHang = nguoiDungRepository.countByVaiTro(VaiTro.KHACH_HANG);
        long soChuTro = nguoiDungRepository.countByChuTro(true);

        // Doanh thu sàn chuẩn nghiệp vụ: Tổng phí hoa hồng (phiThu) từ các phiếu đặt lịch đã hoàn thành
        Long tongDoanhThu = phieuDatLichRepository.sumPhiThuByTrangThai(TrangThaiDatLich.HOAN_THANH);
        if (tongDoanhThu == null) {
            tongDoanhThu = 0L;
        }

        // --- TÍNH TOÁN NGÂN KHỐ TRUNG TÂM / KHO TIỀN THỜI GIAN THỰC ---
        Long tongThuCoc = giaoDichRepository.sumSoTienByLoaiAndTrangThai("COC_XEM_PHONG", TrangThaiGD.THANH_CONG);
        Long tongHoanCocKhach = giaoDichRepository.sumSoTienByLoaiAndTrangThai("HOAN_COC", TrangThaiGD.HOAN_TIEN);
        Long tongDaRut = giaoDichRepository.sumSoTienByLoaiAndTrangThai("RUT_TIEN", TrangThaiGD.THANH_CONG);

        long tongSoDuViChuTro = chuTroRepository.sumTotalSoDu();
        Long quyChoRut = giaoDichRepository.sumSoTienByLoaiAndTrangThai("RUT_TIEN", TrangThaiGD.CHO_THANH_TOAN);
        long soLenhRutChoDuyet = giaoDichRepository.countByLoaiGiaoDichAndTrangThai("RUT_TIEN", TrangThaiGD.CHO_THANH_TOAN);

        // Quỹ cọc giữ chân đang tạm giữ (tính từ các lịch hẹn đang XAC_NHAN mà khách đã nộp cọc)
        Long quyTamGiuCocRaw = phieuDatLichRepository.sumCocByTrangThai(TrangThaiDatLich.XAC_NHAN);
        long quyTamGiuCoc = quyTamGiuCocRaw != null ? quyTamGiuCocRaw : 0L;

        // Tổng quỹ thực tế đang nằm trong két của Sàn: Tiền thu cọc - Tiền đã hoàn cọc cho khách - Tiền đã duyệt rút
        long tongQuyThucTe = Math.max(0L, (tongThuCoc != null ? tongThuCoc : 0L)
                - (tongHoanCocKhach != null ? tongHoanCocKhach : 0L)
                - (tongDaRut != null ? tongDaRut : 0L));

        // Nghĩa vụ nợ của Sàn: Quỹ cọc tạm giữ + Số dư ví chủ trọ + Quỹ chờ duyệt rút + Doanh thu hoa hồng sàn tích lũy
        long tongNghiaVu = quyTamGiuCoc + tongSoDuViChuTro + (quyChoRut != null ? quyChoRut : 0L) + tongDoanhThu;
        long tongQuyHeThong = Math.max(tongQuyThucTe, tongNghiaVu);

        return AdminStatisticsResponseDTO.builder()
                .tongSoPhong(tongSoPhong)
                .soPhongChoDuyet(soPhongChoDuyet)
                .soPhongDaDuyet(soPhongDaDuyet)
                .soPhongHoanThanh(soPhongHoanThanh)
                .soPhongHuy(soPhongHuy)
                .tongNguoiDung(tongNguoiDung)
                .soKhachHang(soKhachHang)
                .soChuTro(soChuTro)
                .tongDoanhThu(tongDoanhThu)
                .tongQuyHeThong(tongQuyHeThong)
                .quyTamGiuCoc(quyTamGiuCoc)
                .tongSoDuViChuTro(tongSoDuViChuTro)
                .quyChoRut(quyChoRut != null ? quyChoRut : 0L)
                .soLenhRutChoDuyet(soLenhRutChoDuyet)
                .build();
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
        return giaoDichRepository.findByTrangThaiOrderByNgayGiaoDichDesc(TrangThaiGD.CHO_THANH_TOAN)
                .stream()
                .map(AdminTransactionResponseDTO::fromEntity)
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
        // 1. Khóa bản ghi giao dịch (Pessimistic Lock) để chống 2 Admin cùng duyệt
        GiaoDich gd = giaoDichRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (gd.getTrangThai() != TrangThaiGD.CHO_THANH_TOAN) {
            throw new AppException(ErrorCode.TRANSACTION_ALREADY_PROCESSED);
        }

        // 2. Kiểm tra ngân khố hệ thống
        AdminStatisticsResponseDTO stats = getStatistics();
        long soTienDuyet = gd.getSoTien() != null ? gd.getSoTien() : 0L;
        if (stats.getTongQuyHeThong() < soTienDuyet) {
            throw new AppException(ErrorCode.INSUFFICIENT_SYSTEM_TREASURY);
        }

        // 3. Phê duyệt giao dịch
        gd.setTrangThai(TrangThaiGD.THANH_CONG);
        String timeNow = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String oldNote = gd.getNoiDung() != null ? gd.getNoiDung() : "";
        gd.setNoiDung(oldNote + " [ĐÃ DUYỆT BỞI ADMIN: " + adminUsername + " lúc " + timeNow + "]");
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
            tenChuTro = pt.getChuPhongTro().getNguoiDung().getTenDangNhap();
            sdtChuTro = pt.getChuPhongTro().getNguoiDung().getSdt();
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
            throw new RuntimeException("Đơn đăng ký không ở trạng thái chờ duyệt!");
        }

        // 1. Cập nhật trạng thái đơn
        yc.setTrangThai(TrangThaiYeuCauChuTro.DA_DUYET);
        yc.setNgayDuyet(LocalDateTime.now());
        yc = yeuCauChuTroRepository.save(yc);

        // 2. Kích hoạt vai trò Chủ trọ cho người dùng
        NguoiDung user = yc.getNguoiDung();
        user.setCccd(yc.getCccd());
        user.setChuTro(true);
        nguoiDungRepository.save(user);

        // 3. Khởi tạo bản ghi ChuTro nếu chưa có (100 điểm uy tín, số dư = 0)
        chuTroRepository.findById(user.getMaNguoiDung())
                .orElseGet(() -> chuTroRepository.save(ChuTro.builder()
                        .maChuTro(user.getMaNguoiDung())
                        .nguoiDung(user)
                        .diemUyTin(100)
                        .soDu(0L)
                        .build()));

        // 4. Lưu tài khoản ngân hàng thụ hưởng
        TaiKhoanNganHang tk = TaiKhoanNganHang.builder()
                .soTaiKhoan(yc.getSoTaiKhoan())
                .tenNganHang(yc.getTenNganHang())
                .nguoiDung(user)
                .build();
        taiKhoanNganHangRepository.save(tk);

        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    public LandlordRequestResponseDTO rejectLandlordRequest(String id, RejectLandlordRequestDTO request) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));

        if (yc.getTrangThai() != TrangThaiYeuCauChuTro.CHO_DUYET) {
            throw new RuntimeException("Đơn đăng ký không ở trạng thái chờ duyệt!");
        }

        yc.setTrangThai(TrangThaiYeuCauChuTro.TU_CHOI);
        yc.setNgayDuyet(LocalDateTime.now());
        yc.setLyDoTuChoi(request != null && request.getLyDo() != null && !request.getLyDo().isBlank()
                ? request.getLyDo()
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
