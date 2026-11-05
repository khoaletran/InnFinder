/*
 * @ (#) RoomSummaryResponse.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 9:51 PM
 */
import com.innfinder.backend.entity.HinhAnh;
import com.innfinder.backend.entity.PhongTro;
import lombok.*;
import java.time.LocalDateTime;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomSummaryResponse {
    private String maPhongTro;
    private String diaChi;
    private Long giaThue;
    private Integer dienTich;
    private Integer soNguoi;
    private String maLpt;
    private String tenLoaiPhong;
    private String anhDaiDien;
    private String kinhDo;
    private String viDo;
    private Integer diemUyTinChuTro;
    private LocalDateTime thoiGianDang;
    public static RoomSummaryResponse fromEntity(PhongTro entity) {
        if (entity == null) return null;
        // Ưu tiên lấy ảnh đại diện (laDaiDien = true), nếu không thì lấy ảnh đầu tiên
        String anhDaiDienUrl = null;
        if (entity.getHinhAnh() != null && !entity.getHinhAnh().isEmpty()) {
            anhDaiDienUrl = entity.getHinhAnh().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getLaDaiDien()))
                    .map(HinhAnh::getUrl)
                    .findFirst()
                    .orElse(entity.getHinhAnh().get(0).getUrl());
        }
        String tenLpt = entity.getLoaiPhong() != null ? entity.getLoaiPhong().getTenLoaiPhongTro() : null;
        String maLptStr = entity.getLoaiPhong() != null ? entity.getLoaiPhong().getMaLpt() : null;
        Integer uyTin = entity.getChuPhongTro() != null ? entity.getChuPhongTro().getDiemUyTin() : 100;
        return RoomSummaryResponse.builder()
                .maPhongTro(entity.getMaPhongTro())
                .diaChi(entity.getDiaChi())
                .giaThue(entity.getGiaThue())
                .dienTich(entity.getDienTich())
                .soNguoi(entity.getSoNguoi())
                .maLpt(maLptStr)
                .tenLoaiPhong(tenLpt)
                .anhDaiDien(anhDaiDienUrl)
                .kinhDo(entity.getKinhDo())
                .viDo(entity.getViDo())
                .diemUyTinChuTro(uyTin)
                .thoiGianDang(entity.getThoiGianDang())
                .build();
    }
}