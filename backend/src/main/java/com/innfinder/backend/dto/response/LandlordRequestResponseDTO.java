package com.innfinder.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.innfinder.backend.entity.YeuCauChuTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordRequestResponseDTO {

    private String maYeuCau;
    private String maNguoiDung;
    private String hoVaTen;
    private String tenDangNhap;
    private String email;
    private String sdt;
    private String avatarUrl;

    private String cccd;
    private String anhCccdTruoc;
    private String anhCccdSau;

    private String tenNganHang;
    private String soTaiKhoan;
    private String tenChuTaiKhoan;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayGui;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayDuyet;

    private TrangThaiYeuCauChuTro trangThai;
    private String lyDoTuChoi;

    public static LandlordRequestResponseDTO fromEntity(YeuCauChuTro entity) {
        if (entity == null) return null;
        var builder = LandlordRequestResponseDTO.builder()
                .maYeuCau(entity.getMaYeuCau())
                .cccd(entity.getCccd())
                .anhCccdTruoc(entity.getAnhCccdTruoc())
                .anhCccdSau(entity.getAnhCccdSau())
                .tenNganHang(entity.getTenNganHang())
                .soTaiKhoan(entity.getSoTaiKhoan())
                .tenChuTaiKhoan(entity.getTenChuTaiKhoan())
                .ngayGui(entity.getNgayGui())
                .ngayDuyet(entity.getNgayDuyet())
                .trangThai(entity.getTrangThai())
                .lyDoTuChoi(entity.getLyDoTuChoi());

        if (entity.getNguoiDung() != null) {
            var user = entity.getNguoiDung();
            builder.maNguoiDung(user.getMaNguoiDung())
                    .tenDangNhap(user.getTenDangNhap())
                    .hoVaTen(user.getHoVaTen() != null && !user.getHoVaTen().isBlank() ? user.getHoVaTen() : user.getTenDangNhap())
                    .email(user.getEmail())
                    .sdt(user.getSdt())
                    .avatarUrl(user.getHinhDaiDien());
        }

        return builder.build();
    }
}
