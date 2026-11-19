/*
 * @ (#) CategoryResponse.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;

import com.innfinder.backend.entity.LoaiPhongTro;
import lombok.*;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 6:34 PM
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {
    private String maLpt;
    private String tenLoaiPhongTro;
    private String moTa;
    private Integer soTienCoc;
    private Integer phiThu;

    public static CategoryResponse fromEntity(LoaiPhongTro loaiPhongTro){
        if(loaiPhongTro == null) return null;
        Integer tienCoc = null;
        Integer mucPhi = null;
        if (loaiPhongTro.getCoc() != null) {
            tienCoc = loaiPhongTro.getCoc().getSoTienCoc();
            if (loaiPhongTro.getCoc().getPhiThu() != null) {
                mucPhi = loaiPhongTro.getCoc().getPhiThu().getPhi();
            }
        }
        return CategoryResponse.builder()
                .maLpt(loaiPhongTro.getMaLpt())
                .tenLoaiPhongTro(loaiPhongTro.getTenLoaiPhongTro())
                .moTa(loaiPhongTro.getMoTa())
                .soTienCoc(tienCoc)
                .phiThu(mucPhi)
                .build();
    }
}
