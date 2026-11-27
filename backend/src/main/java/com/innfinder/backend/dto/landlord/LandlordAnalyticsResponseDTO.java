package com.innfinder.backend.dto.landlord;

import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordAnalyticsResponseDTO {
    private int months;
    private SummaryDTO tongQuan;
    private List<MonthlyCashflowPoint> bieuDoDongTien;
    private FunnelDTO pheuKhachHang;
    private List<RoomPerformanceDTO> hieuQuaTungPhong;
    private List<LandlordRecommendationDTO> deXuatCaiThien;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SummaryDTO {
        private long soDuHienTai;
        private int diemUyTin;
        private LocalDateTime tamAnDen;
        private long tongPhong;
        private long phongDangMo;
        private long phongDaThue;
        private long phongChoDuyet;
        private long tongTienCocThucNhan;
        private long tongPhiHoaHongDaTra;
        private long tongBoiThuongNoShow;
        private long tongLuotHienThi;
        private long tongLuotClick;
        private double ctrPercent;
        private long tongLuotXemPhong;
        private long tongLuotXemTour360;
        private long tongYeuThich;
        private long tongLichHen;
        private long lichChoDuyet;
        private long lichDaXem;
        private long lichHoanThanh;
        private long lichHuy;
        private double tyLeChotPercent;
        private double diemDanhGiaTrungBinh;
        private long tongDanhGia;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyCashflowPoint {
        private String thang;
        private long tienThucNhan;
        private long phiHoaHong;
        private long soLichHoanThanh;
        private long soLichDat;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FunnelDTO {
        private long luotHienThi;
        private long luotClick;
        private long luotXem;
        private long luotXemTour360;
        private long luotYeuThich;
        private long lichDatXem;
        private long daXemThucTe;
        private long chotThue;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomPerformanceDTO {
        private String maPhongTro;
        private String tenPhong;
        private String diaChi;
        private String tenLoaiPhong;
        private String hinhAnhUrl;
        private TrangThaiPhongTro trangThai;
        private boolean tamAn;
        private long giaThue;
        private long giaTrungBinhCungLoai;
        private double chenhLechGiaPercent;
        private boolean coTour360;
        private int soAnh;
        private long luotHienThi;
        private long luotClick;
        private double ctrPercent;
        private long luotXem;
        private long luotXemTour360;
        private long luotYeuThich;
        private long soLichHen;
        private long soLichHoanThanh;
        private long soLichKhachTuChoi;
        private double tyLeChotPercent;
        private double diemDanhGiaTrungBinh;
        private long soDanhGia;
        private String nhanSucKhoe;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LandlordRecommendationDTO {
        private String id;
        private String maPhongTro;
        private String tenPhong;
        private String mucDoUuTien;
        private String nhom;
        private String tieuDe;
        private String moTa;
        private String hanhDongLabel;
        private String duongDan;
    }
}
