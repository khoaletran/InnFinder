package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentResponseDTO {
    private String maDatLich;
    private String maPhongTro;
    private String tenPhongTro;
    private String diaChiPhong;
    private String tenKhachHang;
    private String sdtKhachHang;
    private String tenChuTro;
    private String sdtChuTro;
    private LocalDateTime ngayHen;
    private LocalDateTime thoiGianDat;
    private TrangThaiDatLich trangThai;
    private Long tienCoc;
    private Long phiThu;
    private String liDoHuy;

    public static AdminAppointmentResponseDTO fromEntity(PhieuDatLich p) {
        PhongTro pt = p.getPhongTro();
        NguoiDung kh = p.getKhachHang();
        NguoiDung ctUser = (pt != null && pt.getChuPhongTro() != null)
                ? pt.getChuPhongTro().getNguoiDung()
                : null;

        String maPhongTro = pt != null ? pt.getMaPhongTro() : null;
        String diaChiPhong = pt != null && pt.getDiaChi() != null ? pt.getDiaChi() : "---";
        String loaiPhong = (pt != null && pt.getLoaiPhong() != null && pt.getLoaiPhong().getTenLoaiPhongTro() != null)
                ? pt.getLoaiPhong().getTenLoaiPhongTro()
                : "Phòng trọ";
        String tenPhongTro = pt != null
                ? (pt.getDiaChi() != null && !pt.getDiaChi().isBlank()
                        ? loaiPhong + " - " + pt.getDiaChi()
                        : "Phòng #" + pt.getMaPhongTro())
                : "Phòng trọ";

        String tenKhachHang = kh != null
                ? (kh.getHoVaTen() != null && !kh.getHoVaTen().isBlank() ? kh.getHoVaTen() : kh.getTenDangNhap())
                : "Khách hàng";
        String sdtKhachHang = kh != null && kh.getSdt() != null ? kh.getSdt() : "---";

        String tenChuTro = ctUser != null
                ? (ctUser.getHoVaTen() != null && !ctUser.getHoVaTen().isBlank() ? ctUser.getHoVaTen() : ctUser.getTenDangNhap())
                : "Chủ trọ";
        String sdtChuTro = ctUser != null && ctUser.getSdt() != null ? ctUser.getSdt() : "---";

        return AdminAppointmentResponseDTO.builder()
                .maDatLich(p.getMaDatLich())
                .maPhongTro(maPhongTro)
                .tenPhongTro(tenPhongTro)
                .diaChiPhong(diaChiPhong)
                .tenKhachHang(tenKhachHang)
                .sdtKhachHang(sdtKhachHang)
                .tenChuTro(tenChuTro)
                .sdtChuTro(sdtChuTro)
                .ngayHen(p.getNgayHen())
                .thoiGianDat(p.getThoiGianDat())
                .trangThai(p.getTrangThai())
                .tienCoc(p.getCoc() != null ? p.getCoc() : 0L)
                .phiThu(p.getPhiThu() != null ? p.getPhiThu() : 0L)
                .liDoHuy(p.getLiDoHuy())
                .build();
    }
}
