/*
 * @ (#) RoomCreateRequest.java    1.0     11/5/2026
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
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomCreateRequest {
    @NotBlank(message = "Mã loại phòng không được để trống")
    private String maLpt;
    @NotNull(message = "Giá thuê không được để trống")
    @Min(value = 0, message = "Giá thuê phải lớn hơn hoặc bằng 0")
    private Long giaThue;
    @NotNull(message = "Diện tích không được để trống")
    @Min(value = 1, message = "Diện tích phòng tối thiểu phải là 1m2")
    private Integer dienTich;
    private String moTa;
    @NotNull(message = "Số người ở không được để trống")
    @Min(value = 1, message = "Số người ở tối đa tối thiểu là 1")
    private Integer soNguoi;
    @NotBlank(message = "Địa chỉ phòng trọ không được để trống")
    private String diaChi;
    private String kinhDo;
    private String viDo;
    @Min(value = 0, message = "Tiền cọc phòng phải lớn hơn hoặc bằng 0")
    @Builder.Default
    private Long coc = 0L;
    // Danh sách mã tiện ích (ví dụ: ["TI0001", "TI0002"])
    private List<String> dsTienIch;
}