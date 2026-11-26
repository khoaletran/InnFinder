package com.innfinder.backend.service;

import com.innfinder.backend.dto.landlord.LandlordNotificationResponse;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LandlordNotificationService {
    private final ChuTroRepository landlords;
    private final PhongTroRepository rooms;
    private final PhieuDatLichRepository appointments;
    private final GiaoDichRepository transactions;
    private final DanhGiaRepository reviews;
    private final PhieuKhieuNaiRepository complaints;

    @Transactional(readOnly = true)
    public List<LandlordNotificationResponse> getCurrentNotifications() {
        String owner = landlords.findByNguoiDung_TenDangNhap(SecurityUtils.getCurrentUsername())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD)).getMaChuTro();
        List<LandlordNotificationResponse> result = new ArrayList<>();
        appointments.findTop20ByPhongTro_ChuPhongTro_MaChuTroOrderByThoiGianDatDesc(owner).forEach(a ->
                result.add(new LandlordNotificationResponse("apt-" + a.getMaDatLich() + "-" + a.getTrangThai()
                        + "-" + a.getDaNhanLaiCoc() + "-" + a.getKhachHangDongY() + "-" + a.getChuTroDongY(),
                        switch (a.getTrangThai()) {
                            case CHO_XAC_NHAN -> "Khách đặt lịch xem phòng";
                            case XAC_NHAN -> "Cập nhật lịch đã xác nhận";
                            case HOAN_THANH -> "Thuê phòng thành công";
                            case HUY -> "Lịch xem phòng đã hủy";
                        }, "Lịch " + a.getMaDatLich() + " · " + a.getPhongTro().getDiaChi()
                        + (Boolean.TRUE.equals(a.getDaNhanLaiCoc()) ? " · Khách đã nhận lại cọc" : "")
                        + (a.getKhachHangDongY() != null ? (a.getKhachHangDongY() ? " · Khách đồng ý thuê" : " · Khách không thuê") : ""),
                        "APPOINTMENT", a.getThoiGianDat(), "/landlord/appointments")));
        rooms.findTop20ByChuPhongTro_MaChuTroOrderByThoiGianDangDesc(owner).forEach(room -> {
            String status = switch (room.getTrangThai()) {
                case CHO_DUYET -> "Đang chờ kiểm duyệt"; case DA_DUYET -> "Đã được duyệt";
                case HOAN_THANH -> "Đã cho thuê"; case HUY -> "Đã gỡ hoặc bị từ chối";
            };
            result.add(new LandlordNotificationResponse("room-" + room.getMaPhongTro() + "-" + room.getTrangThai(),
                    status, room.getDiaChi(), "POST", room.getThoiGianDang(), "/landlord/rooms"));
        });
        transactions.findTop20ByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(owner).forEach(tx ->
                result.add(new LandlordNotificationResponse("tx-" + tx.getMaGiaoDich() + "-" + tx.getTrangThai(),
                        switch (tx.getTrangThai()) {
                            case CHO_THANH_TOAN -> "Giao dịch đang chờ đối soát";
                            case THANH_CONG -> "Giao dịch ví thành công";
                            case THAT_BAI -> "Giao dịch ví bị từ chối";
                            case HOAN_TIEN -> "Đã hoàn tiền giao dịch";
                        }, tx.getMaGiaoDich() + " · " + tx.getNoiDung(), "TRANSACTION",
                        tx.getNgayGiaoDich(), "/landlord/wallet")));
        reviews.findTop20ByPhongTro_ChuPhongTro_MaChuTroOrderByNgayDanhGiaDesc(owner).forEach(review ->
                result.add(new LandlordNotificationResponse("review-" + review.getMaDanhGia(), "Có đánh giá phòng",
                        review.getDiem() + "/5 · " + review.getPhongTro().getDiaChi(), "POST", review.getNgayDanhGia(), "/landlord/reviews")));
        complaints.findTop20ByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(owner).forEach(c ->
                result.add(new LandlordNotificationResponse("complaint-" + c.getMaKhieuNai() + "-" + c.getTrangThai(),
                        "Cập nhật khiếu nại", c.getVanDe(), "COMPLAINT", c.getNgayGui(), "/landlord/reviews")));
        return result.stream().sorted(Comparator.comparing(LandlordNotificationResponse::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder()))).limit(60).toList();
    }
}
