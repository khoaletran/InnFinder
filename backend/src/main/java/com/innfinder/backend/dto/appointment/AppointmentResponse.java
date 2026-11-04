package com.innfinder.backend.dto.appointment;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentResponse {
    private String maDatLich;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayHen;
    private TrangThaiDatLich trangThai;
    private Long coc;
    private Long phiThu;
    private String liDoHuy;
    // Thông tin tóm tắt phòng trọ để hiển thị trên thẻ card
    private String maPhongTro;
    private String diaChiPhong;
    private Long giaThue;
    // Thông tin khách hàng
    private String maKhachHang;
    private String tenKhachHang;
    private String sdtKhachHang;
    // Thông tin chủ trọ
    private String maChuTro;
    private String tenChuTro;
    private String sdtChuTro;

    /**
     * Hàm tiện ích chuyển đổi từ Entity sang Response DTO
     */
    public static AppointmentResponse fromEntity(PhieuDatLich entity) {
        if (entity == null) return null;
        var builder = AppointmentResponse.builder()
                .maDatLich(entity.getMaDatLich())
                .ngayHen(entity.getNgayHen())
                .trangThai(entity.getTrangThai())
                .coc(entity.getCoc())
                .phiThu(entity.getPhiThu())
                .liDoHuy(entity.getLiDoHuy());
        // Lấy thông tin khách hàng nếu có
        if (entity.getKhachHang() != null) {
            builder.maKhachHang(entity.getKhachHang().getMaNguoiDung())
                    .tenKhachHang(entity.getKhachHang().getTenDangNhap())
                    .sdtKhachHang(entity.getKhachHang().getSdt());
        }
        // Lấy thông tin phòng trọ và chủ trọ nếu có
        if (entity.getPhongTro() != null) {
            builder.maPhongTro(entity.getPhongTro().getMaPhongTro())
                    .diaChiPhong(entity.getPhongTro().getDiaChi())
                    .giaThue(entity.getPhongTro().getGiaThue());
            if (entity.getPhongTro().getChuPhongTro() != null &&
                    entity.getPhongTro().getChuPhongTro().getNguoiDung() != null) {
                var chuTroUser = entity.getPhongTro().getChuPhongTro().getNguoiDung();
                builder.maChuTro(chuTroUser.getMaNguoiDung())
                        .tenChuTro(chuTroUser.getTenDangNhap())
                        .sdtChuTro(chuTroUser.getSdt());
            }
        }
        return builder.build();
    }
}
