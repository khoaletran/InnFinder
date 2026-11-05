/*
 * @ (#) LandlordSummaryResponse.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 9:54 PM
 */
import com.innfinder.backend.entity.ChuTro;
import lombok.*;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordSummaryResponse {
    private String maChuTro;
    private String hoTen;
    private String sdt;
    private String hinhDaiDien;
    private Integer diemUyTin;
    public static LandlordSummaryResponse fromEntity(ChuTro chuTro) {
        if (chuTro == null) return null;
        String hoTenVal = null;
        String sdtVal = null;
        String avatarVal = null;
        if (chuTro.getNguoiDung() != null) {
            hoTenVal = chuTro.getNguoiDung().getTenDangNhap();
            sdtVal = chuTro.getNguoiDung().getSdt();
            avatarVal = chuTro.getNguoiDung().getHinhDaiDien();
        }
        return LandlordSummaryResponse.builder()
                .maChuTro(chuTro.getMaChuTro())
                .hoTen(hoTenVal)
                .sdt(sdtVal)
                .hinhDaiDien(avatarVal)
                .diemUyTin(chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100)
                .build();
    }
}