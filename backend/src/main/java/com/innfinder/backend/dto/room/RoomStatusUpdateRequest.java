/*
 * @ (#) RoomStatusUpdateRequest.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:28 PM
 */
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import jakarta.validation.constraints.NotNull;
import lombok.*;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomStatusUpdateRequest {
    @NotNull(message = "Trạng thái phòng không được để trống")
    private TrangThaiPhongTro trangThai;
}