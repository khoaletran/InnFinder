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
    private long soKhieuNaiChoDuyet;
    private long tongDoanhThu;
    private long soLichHoanThanh;

    // --- CÁC CHỈ SỐ KHO TIỀN / NGÂN KHỐ HỆ THỐNG TRUNG TÂM ---
    private long tongQuyHeThong;     // Tổng quỹ luân chuyển (quyTamGiuCoc + tongSoDuViChuTro + quyChoRut)
    private long tongQuyThucTe;      // Tổng tiền mặt thực tế trong két (tongQuyHeThong + tongDoanhThu)
    private long quyTamGiuCoc;       // Quỹ cọc giữ chân đang tạm giữ (các lịch hẹn XAC_NHAN)
    private long tongSoDuViChuTro;   // Tổng số dư khả dụng trong ví của tất cả Chủ trọ
    private long quyChoRut;          // Quỹ đang chờ giải ngân rút tiền (RUT_TIEN ở trạng thái CHO_THANH_TOAN)
    private long soLenhRutChoDuyet;  // Số lượng lệnh rút tiền đang chờ Admin phê duyệt

    // --- DỮ LIỆU BIỂU ĐỒ & BỘ LỌC TỪ DATABASE ---
    private List<RevenuePointDTO> bieuDoDoanhThu;
    private List<RoomTypeStatDTO> coCauLoaiPhong;
    private List<Integer> cacNamCoDuLieu;

    // --- DỮ LIỆU TRACKING, PHỄU CHUYỂN ĐỔI & SO SÁNH KỲ TRƯỚC ---
    private PeriodComparisonDTO soSanhKyTruoc;
    private ConversionFunnelDTO pheuChuyenDoi;
    private AiBusinessSummaryDTO tongQuanAiTracking;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RevenuePointDTO {
        private String nhan;
        private long doanhThu;
        private long soLichHoanThanh;
        private long soLichDat;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomTypeStatDTO {
        private String maLoaiPhong;
        private String tenLoaiPhong;
        private long soLuong;
        private long soPhongDangHienThi;
        private long luotXem;
        private long luotClickGoiY;
        private long soLichDat;
        private long soLichHoanThanh;
        private long doanhThuHoaHong;
        private double tyLeChot;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PeriodComparisonDTO {
        private boolean coSoSanh;
        private long doanhThuKyTruoc;
        private Double phanTramBienDongDoanhThu;
        private long soLichHoanThanhKyTruoc;
        private Double phanTramBienDongLich;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConversionFunnelDTO {
        private long luotTimKiemAi;
        private long luotHienThiGoiY;
        private long luotClickGoiY;
        private double ctrGoiYPercent;
        private long luotXemChiTiet;
        private long luotXemTour360;
        private long luotYeuThich;
        private long soLichDatCoc;
        private long soLichDaXem;
        private long soLichHoanThanh;
        private long soLichHuy;
        private long soLichKhachTuChoi;
        private long soLichChuTroTuChoi;
        private long soCaNoShow;
        private double tyLeChotTuDatLichPercent;
        private double tyLeChotTuXemThucTePercent;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiBusinessSummaryDTO {
        private long tongLuotGoiProvider;
        private long tongLuotBypass;
        private double tyLeTietKiemBypassPercent;
        private double tyLeThanhCongPercent;
        private long tongToken;
        private double chiPhiUocTinhUsd;
        private long chiPhiUocTinhVnd;
        private boolean pricingConfigured;
        private long bienLoiNhuanSauAiVnd;
        private double tyLeChiPhiAiTrenDoanhThuPercent;
        private long dailyTokensUsed;
        private long dailyTokenLimit;
        private double quotaUsagePercent;
        private boolean quotaWarning;
        private long totalApprovedRooms;
        private long indexedRooms;
        private double vectorCoveragePercent;
        private long semanticSearchCount;
        private long filteredFallbackCount;
        private List<IntentStatDTO> topIntents;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IntentStatDTO {
        private String intent;
        private long count;
    }
}
