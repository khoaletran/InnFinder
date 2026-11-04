package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintResponseDTO {
    private String maKhieuNai;
    private String maNguoiGui;
    private String tenNguoiGui;
    private String doiTuongKhieuNai;
    private String tenDoiTuongKhieuNai;
    private String nguoiDuyet;
    private String tenNguoiDuyet;
    private String vanDe;
    private String hinhAnh;
    private LocalDateTime ngayGui;
    private TrangThaiKhieuNai trangThai;
    private Integer mucDoUuTien;
    private MucDoViPham mucDoViPham;
}
