package com.innfinder.backend.dto.appointment;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {
    private String maGiaoDich;
    private Long soTien;
    private String loaiGiaoDich;
    private String noiDung;
    private String maDatLich;
    private String maPhongTro;
    private String maThamChieuNganHang;
    private String nganHangNhan;
    private String taiKhoanNhan;
    private String tenNguoiNhan;
    private Long cocGoc;
    private Long phiHoaHong;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayGiaoDich;
    private TrangThaiGD trangThai;

    public static TransactionResponse fromEntity(GiaoDich entity) {
        if (entity == null) return null;
        return TransactionResponse.builder()
                .maGiaoDich(entity.getMaGiaoDich())
                .soTien(entity.getSoTien())
                .loaiGiaoDich(entity.getLoaiGiaoDich())
                .noiDung(entity.getNoiDung())
                .maDatLich(entity.getPhieuDatLich() == null ? null : entity.getPhieuDatLich().getMaDatLich())
                .maPhongTro(entity.getPhieuDatLich() == null ? null : entity.getPhieuDatLich().getPhongTro().getMaPhongTro())
                .maThamChieuNganHang(entity.getMaThamChieuNganHang())
                .nganHangNhan(entity.getNganHangNhan()).taiKhoanNhan(entity.getTaiKhoanNhan())
                .tenNguoiNhan(entity.getTenNguoiNhan()).cocGoc(entity.getCocGoc()).phiHoaHong(entity.getPhiHoaHong())
                .ngayGiaoDich(entity.getNgayGiaoDich())
                .trangThai(entity.getTrangThai())
                .build();
    }
}
