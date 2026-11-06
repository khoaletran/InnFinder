package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResponseDTO {
    private String maPhongTro;
    private String maChuTro;
    private String tenChuTro;
    private String sdtChuTro;
    private String maLoaiPhong;
    private String tenLoaiPhong;
    private Long giaThue;
    private Integer dienTich;
    private Integer soNguoi;
    private String diaChi;
    private String moTa;
    private Long coc;
    private TrangThaiPhongTro trangThai;
    private LocalDateTime thoiGianDang;
    private List<String> hinhAnhUrls;
}
