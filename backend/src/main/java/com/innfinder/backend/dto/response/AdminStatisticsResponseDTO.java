package com.innfinder.backend.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatisticsResponseDTO {
    private long tongSoPhong;
    private long soPhongChoDuyet;
    private long soPhongDaDuyet;
    private long soPhongHoanThanh;
    private long soPhongHuy;
    private long tongNguoiDung;
    private long soKhachHang;
    private long soChuTro;
    private long soChuTroChoDuyet;
    private long tongDoanhThu;

    // --- CÁC CHỈ SỐ KHO TIỀN / NGÂN KHỐ HỆ THỐNG TRUNG TÂM ---
    private long tongQuyHeThong;     // Tổng quỹ luân chuyển (quyTamGiuCoc + tongSoDuViChuTro + quyChoRut)
    private long tongQuyThucTe;      // Tổng tiền mặt thực tế trong két (tongQuyHeThong + tongDoanhThu)
    private long quyTamGiuCoc;       // Quỹ cọc giữ chân đang tạm giữ (các lịch hẹn XAC_NHAN)
    private long tongSoDuViChuTro;   // Tổng số dư khả dụng trong ví của tất cả Chủ trọ
    private long quyChoRut;          // Quỹ đang chờ giải ngân rút tiền (RUT_TIEN ở trạng thái CHO_THANH_TOAN)
    private long soLenhRutChoDuyet;  // Số lượng lệnh rút tiền đang chờ Admin phê duyệt

    private List<MonthlyRevenueDTO> doanhThuTheoThang;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyRevenueDTO {
        private String thang;
        private long giaTri;
    }
}
