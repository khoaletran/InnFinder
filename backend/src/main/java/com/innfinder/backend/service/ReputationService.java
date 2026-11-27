package com.innfinder.backend.service;

import com.innfinder.backend.dto.landlord.LandlordReputationSummaryDTO;
import com.innfinder.backend.dto.request.AdminReputationAdjustRequest;
import com.innfinder.backend.dto.response.ReputationHistoryResponseDTO;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.realtime.RealtimePublisher;
import com.innfinder.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReputationService {

    public static final String EVENT_OVERDUE_RESPONSE = "QUA_HAN_PHAN_HOI";
    public static final String EVENT_CANCEL_CONFIRMED = "HUY_LICH_SAU_XAC_NHAN";
    public static final String EVENT_LANDLORD_NO_SHOW = "NO_SHOW_CHU_TRO";
    public static final String EVENT_MILD_WARNING = "CANH_CAO_NHE";
    public static final String EVENT_MILD_WARNING_STACKED = "CONG_DON_CANH_CAO_NHE";
    public static final String EVENT_MEDIUM_COMPLAINT = "KHIEU_NAI_TRUNG_BINH";
    public static final String EVENT_SEVERE_COMPLAINT = "KHIEU_NAI_NANG";
    public static final String EVENT_TEMP_HIDE_7_DAYS = "TAM_AN_7_NGAY";
    public static final String EVENT_AUTO_LOCK_LOW_SCORE = "TU_DONG_KHOA_UY_TIN_THAP";
    public static final String EVENT_REWARD_RENTAL_COMPLETED = "PHUC_HOI_HOAN_THANH_THUE";
    public static final String EVENT_REWARD_REVIEW = "PHUC_HOI_DANH_GIA";
    public static final String EVENT_REWARD_CLEAN_STREAK = "PHUC_HOI_CHUOI_SACH";
    public static final String EVENT_ADMIN_UNLOCK_RESTORE = "ADMIN_MO_KHOA_PHUC_HOI";
    public static final String EVENT_ADMIN_ADJUST = "ADMIN_DIEU_CHINH";

    public static final int PENALTY_OVERDUE_RESPONSE = -3;
    public static final int PENALTY_CANCEL_CONFIRMED = -5;
    public static final int PENALTY_NO_SHOW = -10;
    public static final int PENALTY_MILD_STACKED = -5;
    public static final int PENALTY_MEDIUM_COMPLAINT = -10;
    public static final int REWARD_RENTAL_COMPLETED = 3;
    public static final int REWARD_REVIEW_5_STAR = 2;
    public static final int REWARD_REVIEW_4_STAR = 1;
    public static final int REWARD_REVIEW_30_DAY_CAP = 10;
    public static final int REWARD_CLEAN_STREAK = 5;
    public static final int TEMP_HIDE_DAYS = 7;

    private final ChuTroRepository chuTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhongTroRepository phongTroRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final GiaoDichRepository giaoDichRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    private final TransactionService transactionService;
    private final LichSuDiemUyTinRepository lichSuDiemUyTinRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RealtimePublisher realtimePublisher;

    @Transactional
    public void penalizeOverdueResponse(String maChuTro, String maDatLich) {
        applyScoreDelta(
                maChuTro,
                PENALTY_OVERDUE_RESPONSE,
                EVENT_OVERDUE_RESPONSE,
                maDatLich,
                "Quá hạn phản hồi lịch hẹn #" + maDatLich + " (trừ 3 điểm uy tín)",
                true
        );
    }

    @Transactional
    public void penalizeCancelConfirmedAppointment(String maChuTro, String maDatLich) {
        applyScoreDelta(
                maChuTro,
                PENALTY_CANCEL_CONFIRMED,
                EVENT_CANCEL_CONFIRMED,
                maDatLich,
                "Hủy lịch hẹn sau khi đã xác nhận #" + maDatLich + " (trừ 5 điểm uy tín)",
                true
        );
    }

    @Transactional
    public void penalizeLandlordNoShow(String maChuTro, String maDatLich) {
        ChuTro chuTro = applyScoreDelta(
                maChuTro,
                PENALTY_NO_SHOW,
                EVENT_LANDLORD_NO_SHOW,
                maDatLich,
                "Chủ trọ vắng mặt (No-show) ở lịch hẹn #" + maDatLich + " (trừ 10 điểm uy tín)",
                false
        );
        if (chuTro == null) return;

        int diemTruoc = clampScore((chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100) - PENALTY_NO_SHOW);
        // Lưu ý: applyScoreDelta đã lưu điểm mới, tính số lần No-show trong 30 ngày gần nhất (kể cả lần này)
        long noShowCount30d = lichSuDiemUyTinRepository.countByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
                maChuTro, EVENT_LANDLORD_NO_SHOW, LocalDateTime.now().minusDays(30)
        );
        if (noShowCount30d > 2) {
            applyTempHide(
                    chuTro,
                    TEMP_HIDE_DAYS,
                    maDatLich,
                    "Tạm ẩn bài đăng 7 ngày do bỏ hẹn (No-show) quá 2 lần trong 30 ngày (lần thứ " + noShowCount30d + ")"
            );
        }

        int diemSau = chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100;
        applyThresholdsAfterDeduction(chuTro, diemTruoc, diemSau, maDatLich);
    }

    @Transactional
    public void recordMildComplaintWarning(String maChuTro, String maKhieuNai) {
        if (maChuTro == null) return;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(maChuTro).orElse(null);
        if (chuTro == null) return;

        int diem = clampScore(chuTro.getDiemUyTin());
        saveHistory(chuTro, 0, diem, diem, EVENT_MILD_WARNING, maKhieuNai,
                "Cảnh cáo vi phạm mức nhẹ theo khiếu nại #" + maKhieuNai);

        long count30d = lichSuDiemUyTinRepository.countByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
                maChuTro, EVENT_MILD_WARNING, LocalDateTime.now().minusDays(30)
        );
        if (count30d >= 3 && count30d % 3 == 0) {
            applyScoreDelta(
                    maChuTro,
                    PENALTY_MILD_STACKED,
                    EVENT_MILD_WARNING_STACKED,
                    maKhieuNai,
                    "Cộng dồn " + count30d + " cảnh cáo mức nhẹ trong 30 ngày (trừ 5 điểm uy tín)",
                    true
            );
        }
    }

    @Transactional
    public void penalizeMediumComplaint(String maChuTro, String maKhieuNai) {
        ChuTro chuTro = applyScoreDelta(
                maChuTro,
                PENALTY_MEDIUM_COMPLAINT,
                EVENT_MEDIUM_COMPLAINT,
                maKhieuNai,
                "Vi phạm mức trung bình theo khiếu nại #" + maKhieuNai + " (trừ 10 điểm & tạm ẩn bài đăng 7 ngày)",
                false
        );
        if (chuTro == null) return;

        int diemSau = chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100;
        int diemTruoc = Math.min(100, diemSau - PENALTY_MEDIUM_COMPLAINT);
        applyTempHide(chuTro, TEMP_HIDE_DAYS, maKhieuNai, null);
        applyThresholdsAfterDeduction(chuTro, diemTruoc, diemSau, maKhieuNai);
    }

    @Transactional
    public void penalizeSevereComplaint(NguoiDung doiTuong, String maKhieuNai) {
        if (doiTuong == null) return;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(doiTuong.getMaNguoiDung()).orElse(null);
        if (chuTro != null) {
            int diemTruoc = clampScore(chuTro.getDiemUyTin());
            chuTro.setDiemUyTin(0);
            chuTroRepository.save(chuTro);
            saveHistory(chuTro, -diemTruoc, diemTruoc, 0, EVENT_SEVERE_COMPLAINT, maKhieuNai,
                    "Vi phạm mức nghiêm trọng theo khiếu nại #" + maKhieuNai + " (đặt điểm uy tín về 0 & khóa vĩnh viễn)");
        }
        lockAndCleanUpLandlord(doiTuong, "Vi phạm nghiêm trọng khiếu nại #" + maKhieuNai);
    }

    @Transactional
    public void rewardCompletedRental(String maChuTro, String maDatLich) {
        if (maChuTro == null) return;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(maChuTro).orElse(null);
        if (chuTro == null) return;
        int diemTruoc = clampScore(chuTro.getDiemUyTin());
        if (diemTruoc >= 100) return;

        int diemSau = clampScore(diemTruoc + REWARD_RENTAL_COMPLETED);
        int actualDelta = diemSau - diemTruoc;
        if (actualDelta <= 0) return;

        chuTro.setDiemUyTin(diemSau);
        chuTroRepository.save(chuTro);
        saveHistory(chuTro, actualDelta, diemTruoc, diemSau, EVENT_REWARD_RENTAL_COMPLETED, maDatLich,
                "Hoàn thành giao dịch cho thuê #" + maDatLich + " (phục hồi +" + actualDelta + " điểm uy tín)");
    }

    @Transactional
    public void rewardNewReview(String maChuTro, String maDanhGia, int soSao) {
        if (maChuTro == null || (soSao != 4 && soSao != 5)) return;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(maChuTro).orElse(null);
        if (chuTro == null) return;

        int diemTruoc = clampScore(chuTro.getDiemUyTin());
        if (diemTruoc >= 100) return;

        int baseReward = soSao == 5 ? REWARD_REVIEW_5_STAR : REWARD_REVIEW_4_STAR;
        int gained30d = lichSuDiemUyTinRepository.sumBienDongSince(
                maChuTro, EVENT_REWARD_REVIEW, LocalDateTime.now().minusDays(30)
        );
        int remainingQuota = Math.max(0, REWARD_REVIEW_30_DAY_CAP - gained30d);
        int allowed = Math.min(baseReward, remainingQuota);
        if (allowed <= 0) return;

        int diemSau = clampScore(diemTruoc + allowed);
        int actualDelta = diemSau - diemTruoc;
        if (actualDelta <= 0) return;

        chuTro.setDiemUyTin(diemSau);
        chuTroRepository.save(chuTro);
        saveHistory(chuTro, actualDelta, diemTruoc, diemSau, EVENT_REWARD_REVIEW, maDanhGia,
                "Nhận đánh giá " + soSao + " sao mới #" + maDanhGia + " (phục hồi +" + actualDelta + " điểm uy tín)");
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void processMonthlyCleanStreaks() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        List<ChuTro> candidates = chuTroRepository.findEligibleForCleanStreak();
        if (candidates == null || candidates.isEmpty()) return;

        for (ChuTro candidate : candidates) {
            String maChuTro = candidate.getMaChuTro();
            boolean alreadyRewarded = lichSuDiemUyTinRepository
                    .existsByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(maChuTro, EVENT_REWARD_CLEAN_STREAK, thirtyDaysAgo);
            if (alreadyRewarded) continue;

            boolean hasViolation = lichSuDiemUyTinRepository.hasViolationSince(maChuTro, thirtyDaysAgo);
            if (hasViolation) continue;

            boolean hasValidActivity = phieuDatLichRepository.existsRecentValidAppointment(
                    maChuTro,
                    List.of(TrangThaiDatLich.XAC_NHAN, TrangThaiDatLich.HOAN_THANH),
                    thirtyDaysAgo
            );
            if (!hasValidActivity) continue;

            ChuTro locked = chuTroRepository.findByIdForUpdate(maChuTro).orElse(candidate);
            int diemTruoc = clampScore(locked.getDiemUyTin());
            if (diemTruoc >= 100) continue;

            int diemSau = clampScore(diemTruoc + REWARD_CLEAN_STREAK);
            int actualDelta = diemSau - diemTruoc;
            if (actualDelta <= 0) continue;

            locked.setDiemUyTin(diemSau);
            chuTroRepository.save(locked);
            saveHistory(locked, actualDelta, diemTruoc, diemSau, EVENT_REWARD_CLEAN_STREAK, null,
                    "Chuỗi hoạt động sạch 30 ngày không vi phạm (phục hồi +" + actualDelta + " điểm uy tín)");
        }
    }

    @Transactional
    public void restoreOnAdminUnlock(NguoiDung user, String adminUsername) {
        if (user == null) return;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(user.getMaNguoiDung()).orElse(null);
        if (chuTro == null) return;

        int diemTruoc = clampScore(chuTro.getDiemUyTin());
        boolean clearedTempHide = chuTro.getTamAnDen() != null;
        if (diemTruoc < 50 || clearedTempHide) {
            int diemSau = Math.max(50, diemTruoc);
            int delta = diemSau - diemTruoc;
            chuTro.setDiemUyTin(diemSau);
            chuTro.setTamAnDen(null);
            chuTroRepository.save(chuTro);
            saveHistory(chuTro, delta, diemTruoc, diemSau, EVENT_ADMIN_UNLOCK_RESTORE, adminUsername,
                    "Admin " + (adminUsername != null ? adminUsername : "") + " mở khóa tài khoản, khôi phục mốc thử thách " + diemSau + " điểm");
        }
    }

    @Transactional
    public LandlordReputationSummaryDTO adjustByAdmin(String maChuTro, AdminReputationAdjustRequest req, String adminUsername) {
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(maChuTro)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_NOT_FOUND));

        int diemTruoc = clampScore(chuTro.getDiemUyTin());
        int diemSau = diemTruoc;

        if (req.getDiemMoi() != null) {
            diemSau = clampScore(req.getDiemMoi());
        } else if (req.getBienDong() != null) {
            diemSau = clampScore(diemTruoc + req.getBienDong());
        }

        int delta = diemSau - diemTruoc;
        chuTro.setDiemUyTin(diemSau);
        if (Boolean.TRUE.equals(req.getGoTamAn())) {
            chuTro.setTamAnDen(null);
        }
        chuTroRepository.save(chuTro);

        String note = "Admin " + (adminUsername != null ? adminUsername : "system")
                + " điều chỉnh: " + req.getLyDo().trim()
                + (Boolean.TRUE.equals(req.getGoTamAn()) ? " (Đã gỡ tạm ẩn bài đăng)" : "");
        saveHistory(chuTro, delta, diemTruoc, diemSau, EVENT_ADMIN_ADJUST, adminUsername, note);

        if (delta < 0) {
            applyThresholdsAfterDeduction(chuTro, diemTruoc, diemSau, "ADMIN_ADJUST");
        }

        return buildSummary(chuTro);
    }

    @Transactional(readOnly = true)
    public LandlordReputationSummaryDTO getLandlordReputationSummary(String username) {
        ChuTro chuTro = chuTroRepository.findByNguoiDung_TenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));
        return buildSummary(chuTro);
    }

    @Transactional(readOnly = true)
    public List<ReputationHistoryResponseDTO> getHistoryByLandlordId(String maChuTro) {
        return lichSuDiemUyTinRepository.findTop50ByChuTro_MaChuTroOrderByThoiGianDesc(maChuTro)
                .stream()
                .map(ReputationHistoryResponseDTO::fromEntity)
                .toList();
    }

    public static String resolveRank(int diemUyTin) {
        if (diemUyTin >= 90) return "Chủ trọ Uy tín Cao";
        if (diemUyTin >= 81) return "Chủ trọ Tiêu chuẩn (Tốt)";
        if (diemUyTin >= 70) return "Chủ trọ Tiêu chuẩn (Mất đề xuất)";
        if (diemUyTin >= 50) return "Hạn chế (Tối đa 3 phòng)";
        if (diemUyTin >= 30) return "Đình chỉ đăng tin mới";
        return "Nguy cơ khóa tài khoản";
    }

    private LandlordReputationSummaryDTO buildSummary(ChuTro chuTro) {
        int diem = clampScore(chuTro.getDiemUyTin());
        boolean dangTamAn = chuTro.isDangTamAn();
        Integer roomLimit = null;
        if (dangTamAn || diem < 50) {
            roomLimit = 0;
        } else if (diem < 70) {
            roomLimit = 3;
        }

        return LandlordReputationSummaryDTO.builder()
                .diemUyTin(diem)
                .phanHang(resolveRank(diem))
                .tamAnDen(chuTro.getTamAnDen())
                .dangTamAn(dangTamAn)
                .gioiHanSoPhong(roomLimit)
                .chanDangTinMoi(dangTamAn || diem < 50)
                .lichSu(getHistoryByLandlordId(chuTro.getMaChuTro()))
                .build();
    }

    private ChuTro applyScoreDelta(
            String maChuTro,
            int delta,
            String eventType,
            String refId,
            String reason,
            boolean checkThresholds
    ) {
        if (maChuTro == null) return null;
        ChuTro chuTro = chuTroRepository.findByIdForUpdate(maChuTro).orElse(null);
        if (chuTro == null) return null;

        int diemTruoc = clampScore(chuTro.getDiemUyTin());
        int diemSau = clampScore(diemTruoc + delta);
        int actualDelta = diemSau - diemTruoc;

        chuTro.setDiemUyTin(diemSau);
        chuTroRepository.save(chuTro);
        saveHistory(chuTro, actualDelta, diemTruoc, diemSau, eventType, refId, reason);

        if (checkThresholds && delta < 0) {
            applyThresholdsAfterDeduction(chuTro, diemTruoc, diemSau, refId);
        }
        return chuTro;
    }

    private void applyThresholdsAfterDeduction(ChuTro chuTro, int diemTruoc, int diemSau, String refId) {
        if (diemSau < 30) {
            NguoiDung user = chuTro.getNguoiDung();
            if (user == null) {
                user = nguoiDungRepository.findById(chuTro.getMaChuTro()).orElse(null);
            }
            if (user != null && !Boolean.TRUE.equals(user.getTrangThaiKhoa())) {
                saveHistory(chuTro, 0, diemSau, diemSau, EVENT_AUTO_LOCK_LOW_SCORE, refId,
                        "Tự động khóa tài khoản do điểm uy tín giảm dưới 30 (" + diemSau + "/100)");
                lockAndCleanUpLandlord(user, "Điểm uy tín giảm dưới 30 (" + diemSau + "/100)");
            }
        } else if (diemTruoc >= 50 && diemSau < 50) {
            applyTempHide(chuTro, TEMP_HIDE_DAYS, refId,
                    "Tạm ẩn bài đăng 7 ngày do điểm uy tín giảm dưới 50 (" + diemSau + "/100)");
        }
    }

    private void applyTempHide(ChuTro chuTro, int days, String refId, String logReason) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = (chuTro.getTamAnDen() != null && chuTro.getTamAnDen().isAfter(now))
                ? chuTro.getTamAnDen()
                : now;
        chuTro.setTamAnDen(base.plusDays(days));
        chuTroRepository.save(chuTro);

        if (logReason != null && !logReason.isBlank()) {
            int diem = clampScore(chuTro.getDiemUyTin());
            saveHistory(chuTro, 0, diem, diem, EVENT_TEMP_HIDE_7_DAYS, refId, logReason);
        }
    }

    private void lockAndCleanUpLandlord(NguoiDung user, String reason) {
        if (user == null) return;
        user.setTrangThaiKhoa(true);
        nguoiDungRepository.save(user);

        String maChuTro = user.getMaNguoiDung();
        List<PhongTro> landlordRooms = phongTroRepository.findByChuPhongTro_MaChuTro(maChuTro);
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

        List<PhieuDatLich> openAppointments = phieuDatLichRepository.findByPhongTro_ChuPhongTro_MaChuTroAndTrangThaiIn(
                maChuTro,
                List.of(TrangThaiDatLich.CHO_XAC_NHAN, TrangThaiDatLich.XAC_NHAN)
        );
        if (openAppointments == null || openAppointments.isEmpty()) return;

        for (PhieuDatLich phieu : openAppointments) {
            if (Boolean.TRUE.equals(phieu.getDaNhanLaiCoc())) {
                continue;
            }
            phieu.setTrangThai(TrangThaiDatLich.HUY);
            phieu.setLiDoHuy("Tự động hủy do tài khoản chủ trọ bị khóa: " + reason);
            phieuDatLichRepository.save(phieu);

            boolean hasDeposit = phieu.getCoc() != null && phieu.getCoc() > 0;
            boolean daNop = hasDeposit && phieu.getKhachHang() != null
                    && giaoDichRepository.existsDepositByMaDatLich(phieu.getKhachHang().getMaNguoiDung(), phieu.getMaDatLich());
            if (daNop) {
                createCustomerRefundTransaction(phieu, "Hoàn cọc tự động do chủ trọ bị khóa tài khoản (" + reason + ")");
            }
            if (realtimePublisher != null) realtimePublisher.appointmentUpdated(phieu);
        }
    }

    private void createCustomerRefundTransaction(PhieuDatLich phieu, String lyDo) {
        if (phieu.getKhachHang() == null) return;
        String bankNote = "";
        List<TaiKhoanNganHang> banks = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(phieu.getKhachHang().getMaNguoiDung());
        if (banks != null && !banks.isEmpty()) {
            TaiKhoanNganHang primary = banks.stream().filter(TaiKhoanNganHang::isMacDinh).findFirst().orElse(banks.get(0));
            if (primary.getTenNganHang() != null && primary.getSoTaiKhoan() != null) {
                bankNote = " về TK " + primary.getTenNganHang() + " - " + primary.getSoTaiKhoan()
                        + (primary.getTenChuTaiKhoan() != null && !primary.getTenChuTaiKhoan().isBlank()
                        ? " (" + primary.getTenChuTaiKhoan() + ")" : "");
            }
        }
        transactionService.taoGiaoDichLichHen(
                phieu.getKhachHang(),
                phieu.getCoc(),
                "HOAN_COC",
                lyDo + " lịch " + phieu.getMaDatLich() + bankNote,
                TrangThaiGD.CHO_THANH_TOAN,
                phieu
        );
    }

    private void saveHistory(
            ChuTro chuTro,
            int bienDong,
            int diemTruoc,
            int diemSau,
            String loaiSuKien,
            String maThamChieu,
            String lyDo
    ) {
        String safeReason = (lyDo != null && lyDo.length() > 500) ? lyDo.substring(0, 500) : lyDo;
        LichSuDiemUyTin entry = LichSuDiemUyTin.builder()
                .chuTro(chuTro)
                .bienDong(bienDong)
                .diemTruoc(diemTruoc)
                .diemSau(diemSau)
                .loaiSuKien(loaiSuKien)
                .maThamChieu(maThamChieu)
                .lyDo(safeReason != null ? safeReason : loaiSuKien)
                .thoiGian(LocalDateTime.now())
                .build();
        lichSuDiemUyTinRepository.save(entry);
    }

    private int clampScore(Integer raw) {
        if (raw == null) return 100;
        return Math.max(0, Math.min(100, raw));
    }
}
