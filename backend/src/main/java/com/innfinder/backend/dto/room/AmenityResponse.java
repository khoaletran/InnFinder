/*
 * @ (#) AmenityResponse.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


import com.innfinder.backend.entity.TienIch;
import lombok.*;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 6:34 PM
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AmenityResponse {
    private String maTienIch;
    private String tenTienIch;
    private String moTa;

    public static AmenityResponse fromEntity(TienIch tienIch){
        if(tienIch == null) return null;
        return AmenityResponse.builder()
                .maTienIch(tienIch.getMaTienIch())
                .tenTienIch(tienIch.getTenTienIch())
                .moTa(tienIch.getMoTa())
                .build();
    }
}
