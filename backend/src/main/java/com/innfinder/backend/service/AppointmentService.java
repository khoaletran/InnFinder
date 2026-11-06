package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.AppointmentCancelRequest;
import com.innfinder.backend.dto.appointment.AppointmentCreateRequest;
import com.innfinder.backend.dto.appointment.AppointmentResponse;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final PhieuDatLichRepository phieuDatLichRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final TransactionService transactionService;

    // Lưu ý: Đảm bảo bạn có PhongTroRepository trong project (do Thành viên 2 tạo, hoặc bạn tự tạo interface tạm thời kế thừa JpaRepository<PhongTro, String>)
     private final PhongTroRepository phongTroRepository;
    // Tạm thời nếu bạn muốn query phòng trọ, dùng entityManager hoặc PhongTroRepository:
//    private final jakarta.persistence.EntityManager entityManager;

    /**
     * 1. Khách hàng tạo lịch hẹn xem phòng
     */
    @Transactional
    public AppointmentResponse taoDatLich(String maKhachHang, AppointmentCreateRequest request) {
        // Validate thời gian
        if (request.getNgayHen().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.APPOINTMENT_TIME_INVALID);
        }

        NguoiDung khachHang = nguoiDungRepository.findById(maKhachHang)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        PhongTro phongTro = phongTroRepository.findByMaPhongTro(request.getMaPhongTro()).orElse(null);
        if (phongTro == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }

        // Không cho phép chủ nhà tự đặt phòng của chính mình
        if (phongTro.getChuPhongTro() != null &&
                phongTro.getChuPhongTro().getMaChuTro().equals(maKhachHang)) {
            throw new AppException(ErrorCode.CANNOT_BOOK_OWN_ROOM);
        }


        String maDatLich = "APPT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Long tienCoc = 0L;
        Long phiThu = 0L;
        if (phongTro.getLoaiPhong() != null && phongTro.getLoaiPhong().getCoc() != null) {
            tienCoc = (long) phongTro.getLoaiPhong().getCoc().getSoTienCoc();
            if (phongTro.getLoaiPhong().getCoc().getPhiThu() != null) {
                phiThu = (long) phongTro.getLoaiPhong().getCoc().getPhiThu().getPhi();
            }
        }
        // Lưu phiếu với giá trị cọc và phí thu lấy từ cấu hình hệ thống
        PhieuDatLich phieu = PhieuDatLich.builder()
                .maDatLich(maDatLich)
                .khachHang(khachHang)
                .phongTro(phongTro)
                .ngayHen(request.getNgayHen())
                .trangThai(TrangThaiDatLich.CHO_XAC_NHAN)
                .coc(tienCoc)
                .phiThu(phiThu)   // <-- Cập nhật thêm trường này
                .build();

        PhieuDatLich savedPhieu = phieuDatLichRepository.save(phieu);

        // Ghi nhận giao dịch giữ cọc nếu phòng có yêu cầu cọc
        if (tienCoc > 0) {
            transactionService.taoGiaoDich(
                    khachHang,
                    tienCoc,
                    "DAT_COC",
                    "Tạm giữ cọc đặt lịch xem phòng " + phongTro.getMaPhongTro(),
                    TrangThaiGD.THANH_CONG
            );
        }

        return AppointmentResponse.fromEntity(savedPhieu);
    }

    /**
     * 2. Khách hàng xem danh sách lịch hẹn của mình
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> layLichHenCuaToi(String maKhachHang) {
        return phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByNgayHenDesc(maKhachHang)
                .stream()
                .map(AppointmentResponse::fromEntity)
                .toList();
    }

    /**
     * 3. Chủ trọ xem danh sách khách hẹn xem các phòng của mình
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> layLichHenChoChuTro(String maChuTro) {
        return phieuDatLichRepository.findAppointmentsByLandlordId(maChuTro)
                .stream()
                .map(AppointmentResponse::fromEntity)
                .toList();
    }

    /**
     * 4. Chủ trọ xác nhận đồng ý lịch hẹn
     */
    @Transactional
    public void xacNhanLichHen(String maDatLich, String maChuTro) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, maChuTro);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieuDatLichRepository.save(phieu);
    }

    /**
     * 5. Chủ trọ từ chối lịch hẹn (Hoàn 100% cọc cho khách)
     */
    @Transactional
    public void tuChoiLichHen(String maDatLich, String maChuTro, AppointmentCancelRequest request) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, maChuTro);

        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy("Chủ trọ từ chối: " + request.getLiDoHuy());
        phieuDatLichRepository.save(phieu);

        // Hoàn cọc cho khách hàng nếu có cọc
        if (phieu.getCoc() > 0) {
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
     * 6. Chủ trọ xác nhận khách đã đến xem xong (Hoàn tất & Hoàn trả cọc)
     */
    @Transactional
    public void hoanThanhLichHen(String maDatLich, String maChuTro) {
        PhieuDatLich phieu = getPhieuDatLichVaKiemTraQuyenChuTro(maDatLich, maChuTro);
        if (phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }
        // 1. Cập nhật trạng thái phiếu hẹn
        phieu.setTrangThai(TrangThaiDatLich.HOAN_THANH);
        phieuDatLichRepository.save(phieu);
        // 2. Hoàn trả 100% cọc giữ chân cho khách hàng
        if (phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC_XEM_PHONG",
                    "Hoàn 100% tiền cọc giữ chân xem phòng " + phieu.getPhongTro().getMaPhongTro(),
                    TrangThaiGD.HOAN_TIEN
            );
        }
        // 3. Nếu chốt thuê thành công: Trích phí hoa hồng và cộng tiền cho chủ trọ
        // Số tiền chủ trọ thực nhận = Tiền cọc phòng - Phí hoa hồng sàn thu
        long thucNhanChuTro = phieu.getCoc() - phieu.getPhiThu();
        if (thucNhanChuTro > 0 && phieu.getPhongTro().getChuPhongTro() != null) {
            var chuTro = phieu.getPhongTro().getChuPhongTro();
            chuTro.setSoDu(chuTro.getSoDu() + thucNhanChuTro); // Cộng ví cho chủ trọ

            transactionService.taoGiaoDich(
                    chuTro.getNguoiDung(),
                    thucNhanChuTro,
                    "CONG_TIEN_COC",
                    "Tiền cọc thuê phòng từ khách (đã trừ phí sàn " + phieu.getPhiThu() + " VNĐ)",
                    TrangThaiGD.THANH_CONG
            );
        }
    }

    /**
     * 7. Hủy lịch hẹn (Dành cho Khách hàng hoặc Chủ trọ hủy trước giờ hẹn)
     */
    @Transactional
    public void huyLichHen(String maDatLich, String currentUserId, AppointmentCancelRequest request) {
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        boolean isKhachHang = phieu.getKhachHang().getMaNguoiDung().equals(currentUserId);
        boolean isChuTro = phieu.getPhongTro().getChuPhongTro() != null &&
                phieu.getPhongTro().getChuPhongTro().getMaChuTro().equals(currentUserId);

        // Không phải khách và cũng không phải chủ trọ của lịch hẹn này
        if (!isKhachHang && !isChuTro) {
            throw new AppException(ErrorCode.NOT_APPOINTMENT_OWNER);
        }

        // Chỉ được hủy khi lịch đang CHO_XAC_NHAN hoặc XAC_NHAN
        if (phieu.getTrangThai() != TrangThaiDatLich.CHO_XAC_NHAN &&
                phieu.getTrangThai() != TrangThaiDatLich.XAC_NHAN) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        String nguoiHuy = isKhachHang ? "Khách hàng hủy" : "Chủ trọ hủy";
        phieu.setTrangThai(TrangThaiDatLich.HUY);
        phieu.setLiDoHuy(nguoiHuy + ": " + request.getLiDoHuy());
        phieuDatLichRepository.save(phieu);

        // Xử lý cọc: Nếu Chủ trọ hủy -> Hoàn 100% cọc cho khách
        if (isChuTro && phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC",
                    "Hoàn cọc do chủ trọ hủy lịch hẹn " + maDatLich,
                    TrangThaiGD.HOAN_TIEN
            );
        }
        // Nếu khách hủy: Tùy chính sách, ở đây hoàn cọc nếu hủy trước giờ hẹn
        else if (isKhachHang && phieu.getCoc() > 0) {
            transactionService.taoGiaoDich(
                    phieu.getKhachHang(),
                    phieu.getCoc(),
                    "HOAN_COC",
                    "Khách hàng hủy lịch hẹn " + maDatLich,
                    TrangThaiGD.HOAN_TIEN
            );
        }
    }

    /**
     * Hàm private phụ trợ kiểm tra lịch tồn tại và người gọi có đúng là chủ trọ sở hữu phòng
     */
    private PhieuDatLich getPhieuDatLichVaKiemTraQuyenChuTro(String maDatLich, String maChuTro) {
        PhieuDatLich phieu = phieuDatLichRepository.findById(maDatLich)
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

        if (phieu.getPhongTro().getChuPhongTro() == null ||
                !phieu.getPhongTro().getChuPhongTro().getMaChuTro().equals(maChuTro)) {
            throw new AppException(ErrorCode.NOT_APPOINTMENT_OWNER);
        }
        return phieu;
    }
}