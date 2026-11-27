package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.ComplaintRequestDTO;
import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.response.ComplaintResponseDTO;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.realtime.RealtimePublisher;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.repository.PhieuKhieuNaiRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final PhieuKhieuNaiRepository phieuKhieuNaiRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ChuTroRepository chuTroRepository;
    private final PhongTroRepository phongTroRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final GiaoDichRepository giaoDichRepository;
    private final AppointmentService appointmentService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RealtimePublisher realtimePublisher;

    @Transactional
    public ComplaintResponseDTO createComplaint(ComplaintRequestDTO request) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null || "anonymousUser".equals(username)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung nguoiGui = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String target = request.getDoiTuongKhieuNai().trim();
        NguoiDung doiTuong = nguoiDungRepository.findById(target)
                .or(() -> nguoiDungRepository.findByTenDangNhap(target))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (nguoiGui.getMaNguoiDung().equals(doiTuong.getMaNguoiDung())) {
            throw new AppException(ErrorCode.CANNOT_COMPLAINT_SELF);
        }

        String maKhieuNai = "KN" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai(maKhieuNai)
                .nguoiGui(nguoiGui)
                .doiTuongKhieuNai(doiTuong)
                .vanDe(request.getVanDe())
                .hinhAnh(request.getHinhAnh())
                .ngayGui(LocalDateTime.now())
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoUuTien(request.getMucDoUuTien() != null ? request.getMucDoUuTien() : 1)
                .mucDoViPham(MucDoViPham.NHE)
                .build();

        kn = phieuKhieuNaiRepository.save(kn);
        if (realtimePublisher != null) realtimePublisher.complaintUpdated(kn);

        return toResponseDTO(kn, false);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getAllComplaints() {
        List<PhieuKhieuNai> list = phieuKhieuNaiRepository.findAllByOrderByNgayGuiDesc();
        List<ComplaintResponseDTO> result = new ArrayList<>();
        for (PhieuKhieuNai kn : list) {
            result.add(toResponseDTO(kn, true));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getMyComplaints(String type) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung currentUser = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<PhieuKhieuNai> list;
        if ("SENT".equalsIgnoreCase(type)) {
            list = phieuKhieuNaiRepository.findByNguoiGui_MaNguoiDungOrderByNgayGuiDesc(currentUser.getMaNguoiDung());
        } else {
            // Mặc định RECEIVED: Khiếu nại gửi đến tôi
            list = phieuKhieuNaiRepository.findByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(currentUser.getMaNguoiDung());
        }

        List<ComplaintResponseDTO> result = new ArrayList<>();
        for (PhieuKhieuNai kn : list) {
            result.add(toResponseDTO(kn, false));
        }
        return result;
    }

    @Transactional
    @CacheEvict(value = "admin_statistics", allEntries = true)
    public ComplaintResponseDTO resolveComplaint(String id, ComplaintResolveDTO request) {
        PhieuKhieuNai kn = phieuKhieuNaiRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COMPLAINT_NOT_FOUND));

        if (kn.getTrangThai() == TrangThaiKhieuNai.DA_XU_LI) {
            throw new AppException(ErrorCode.COMPLAINT_ALREADY_RESOLVED);
        }

        String adminUsername = SecurityUtils.getCurrentUsername();
        if (adminUsername == null || "anonymousUser".equals(adminUsername)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung nguoiDuyet = nguoiDungRepository.findByTenDangNhap(adminUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        kn.setNguoiDuyet(nguoiDuyet);

        if (request.getTrangThai() != null) {
            kn.setTrangThai(request.getTrangThai());
        }
        if (request.getKetQua() != null && !request.getKetQua().isBlank()) {
            kn.setKetQua(request.getKetQua());
        }
        if (request.getMucDoViPham() != null) {
            kn.setMucDoViPham(request.getMucDoViPham());
        }

        // Chỉ thực thi chế tài & hoàn cọc đúng một lần khi Admin chốt trạng thái Đã xử lý (DA_XU_LI)
        if (kn.getTrangThai() == TrangThaiKhieuNai.DA_XU_LI && kn.getDoiTuongKhieuNai() != null) {
            MucDoViPham mucDo = kn.getMucDoViPham();
            if (mucDo == MucDoViPham.TRUNG_BINH) {
                chuTroRepository.findById(kn.getDoiTuongKhieuNai().getMaNguoiDung()).ifPresent(chuTro -> {
                    int diemHienTai = chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100;
                    chuTro.setDiemUyTin(Math.max(0, diemHienTai - 10));
                    chuTroRepository.save(chuTro);
                });
            } else if (mucDo == MucDoViPham.NANG) {
                NguoiDung doiTuong = kn.getDoiTuongKhieuNai();
                doiTuong.setTrangThaiKhoa(true);
                nguoiDungRepository.save(doiTuong);

                List<PhongTro> landlordRooms = phongTroRepository.findByChuPhongTro_MaChuTro(doiTuong.getMaNguoiDung());
                if (landlordRooms != null && !landlordRooms.isEmpty()) {
                    List<PhongTro> roomsToHide = landlordRooms.stream()
                            .filter(r -> r.getTrangThai() == TrangThaiPhongTro.DA_DUYET
                                    || r.getTrangThai() == TrangThaiPhongTro.CHO_DUYET)
                            .peek(r -> r.setTrangThai(TrangThaiPhongTro.HUY))
                            .toList();
                    if (!roomsToHide.isEmpty()) {
                        phongTroRepository.saveAll(roomsToHide);
                    }
                }
            }

            if (Boolean.TRUE.equals(request.getHoanCoc())) {
                refundDepositForComplaint(kn, request.getMaDatLichHoanCoc());
            }
        }

        kn = phieuKhieuNaiRepository.save(kn);
        if (realtimePublisher != null) realtimePublisher.complaintUpdated(kn);

        return toResponseDTO(kn, true);
    }

    private void refundDepositForComplaint(PhieuKhieuNai kn, String maDatLichHoanCoc) {
        if (maDatLichHoanCoc == null || maDatLichHoanCoc.isBlank() || kn.getNguoiGui() == null || kn.getDoiTuongKhieuNai() == null) {
            throw new AppException(ErrorCode.APPOINTMENT_NOT_FOUND);
        }

        PhieuDatLich phieu = phieuDatLichRepository.findByIdForUpdate(maDatLichHoanCoc.trim())
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        String customerId = kn.getNguoiGui().getMaNguoiDung();
        String landlordId = kn.getDoiTuongKhieuNai().getMaNguoiDung();

        boolean belongsToComplaintParties = phieu.getKhachHang() != null
                && customerId.equals(phieu.getKhachHang().getMaNguoiDung())
                && phieu.getPhongTro() != null
                && phieu.getPhongTro().getChuPhongTro() != null
                && landlordId.equals(phieu.getPhongTro().getChuPhongTro().getMaChuTro());

        if (!belongsToComplaintParties) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        boolean daNopCoc = giaoDichRepository.existsDepositByMaDatLich(customerId, phieu.getMaDatLich());
        if (!isRefundEligible(phieu, daNopCoc)) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Hoàn cọc theo phán quyết khiếu nại #" + kn.getMaKhieuNai());
        phieuDatLichRepository.save(phieu);

        appointmentService.taoGiaoDichHoanCocChoKhach(phieu,
                "Hoàn cọc theo phán quyết khiếu nại #" + kn.getMaKhieuNai(), null);
    }

    private boolean isRefundEligible(PhieuDatLich phieu, boolean daNopCoc) {
        return phieu.getCoc() != null
                && phieu.getCoc() > 0
                && daNopCoc
                && !Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())
                && (phieu.getTrangThai() == TrangThaiDatLich.CHO_XAC_NHAN
                || phieu.getTrangThai() == TrangThaiDatLich.XAC_NHAN);
    }

    private List<ComplaintResponseDTO.RelatedAppointmentDTO> loadRelatedAppointments(PhieuKhieuNai kn) {
        if (kn.getNguoiGui() == null || kn.getDoiTuongKhieuNai() == null) {
            return List.of();
        }
        String customerId = kn.getNguoiGui().getMaNguoiDung();
        String landlordId = kn.getDoiTuongKhieuNai().getMaNguoiDung();
        List<PhieuDatLich> bookings = phieuDatLichRepository
                .findByKhachHang_MaNguoiDungAndPhongTro_ChuPhongTro_MaChuTroAndCocGreaterThanOrderByNgayHenDesc(
                        customerId, landlordId, 0L
                );
        if (bookings == null || bookings.isEmpty()) {
            return List.of();
        }
        List<ComplaintResponseDTO.RelatedAppointmentDTO> result = new ArrayList<>();
        for (PhieuDatLich p : bookings) {
            boolean daNopCoc = giaoDichRepository.existsDepositByMaDatLich(customerId, p.getMaDatLich());
            String tenPhong = buildRoomLabel(p.getPhongTro());
            result.add(ComplaintResponseDTO.RelatedAppointmentDTO.builder()
                    .maDatLich(p.getMaDatLich())
                    .maPhongTro(p.getPhongTro() != null ? p.getPhongTro().getMaPhongTro() : null)
                    .tenPhongTro(tenPhong)
                    .ngayHen(p.getNgayHen())
                    .tienCoc(p.getCoc())
                    .trangThai(p.getTrangThai())
                    .daNopCoc(daNopCoc)
                    .daNhanLaiCoc(Boolean.TRUE.equals(p.getDaNhanLaiCoc()))
                    .duDieuKienHoanCoc(isRefundEligible(p, daNopCoc))
                    .build());
        }
        return result;
    }

    private String buildRoomLabel(PhongTro room) {
        if (room == null) {
            return "Phòng trọ";
        }
        String typeName = room.getLoaiPhong() != null && room.getLoaiPhong().getTenLoaiPhongTro() != null
                ? room.getLoaiPhong().getTenLoaiPhongTro()
                : "Phòng #" + room.getMaPhongTro();
        if (room.getDiaChi() != null && !room.getDiaChi().isBlank()) {
            return typeName + " - " + room.getDiaChi();
        }
        return typeName;
    }

    private String displayName(NguoiDung user) {
        if (user == null) {
            return null;
        }
        return (user.getHoVaTen() != null && !user.getHoVaTen().isBlank())
                ? user.getHoVaTen()
                : user.getTenDangNhap();
    }

    private ComplaintResponseDTO toResponseDTO(PhieuKhieuNai kn, boolean includeAppointments) {
        return ComplaintResponseDTO.builder()
                .maKhieuNai(kn.getMaKhieuNai())
                .maNguoiGui(kn.getNguoiGui() != null ? kn.getNguoiGui().getMaNguoiDung() : null)
                .tenNguoiGui(displayName(kn.getNguoiGui()))
                .doiTuongKhieuNai(kn.getDoiTuongKhieuNai() != null ? kn.getDoiTuongKhieuNai().getMaNguoiDung() : null)
                .tenDoiTuongKhieuNai(displayName(kn.getDoiTuongKhieuNai()))
                .nguoiDuyet(kn.getNguoiDuyet() != null ? kn.getNguoiDuyet().getMaNguoiDung() : null)
                .tenNguoiDuyet(displayName(kn.getNguoiDuyet()))
                .vanDe(kn.getVanDe())
                .hinhAnh(kn.getHinhAnh())
                .ngayGui(kn.getNgayGui())
                .trangThai(kn.getTrangThai())
                .mucDoUuTien(kn.getMucDoUuTien())
                .mucDoViPham(kn.getMucDoViPham())
                .ketQua(kn.getKetQua())
                .lichHenLienQuan(includeAppointments ? loadRelatedAppointments(kn) : List.of())
                .build();
    }
}
