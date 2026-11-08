package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminTransactionResponseDTO {
    private String maGiaoDich;
    private String maNguoiDung;
    private String tenNguoiDung;
    private String hoVaTen;
    private String sdt;
    private Long soTien;
    private String loaiGiaoDich;
    private String noiDung;
    private LocalDateTime ngayGiaoDich;
    private TrangThaiGD trangThai;
    private String tenNganHang;
    private String soTaiKhoan;
    private Long tienCoc;
    private Long phiDichVu;
    private Long thucNhan;

    public static AdminTransactionResponseDTO fromEntity(GiaoDich gd) {
        String maNguoiDung = null;
        String tenNguoiDung = null;
        String hoVaTen = null;
        String sdt = null;

        if (gd.getNguoiDung() != null) {
            maNguoiDung = gd.getNguoiDung().getMaNguoiDung();
            tenNguoiDung = gd.getNguoiDung().getTenDangNhap();
            hoVaTen = gd.getNguoiDung().getHoVaTen() != null ? gd.getNguoiDung().getHoVaTen() : tenNguoiDung;
            sdt = gd.getNguoiDung().getSdt();
        }

        // Tách số tài khoản & tên ngân hàng từ nội dung nếu có (đối với rút tiền)
        String tenNganHang = null;
        String soTaiKhoan = null;
        if (gd.getNoiDung() != null && gd.getNoiDung().contains("Rút tiền về tài khoản")) {
            try {
                // Định dạng: "Rút tiền về tài khoản MBBank (0123456789) - Ghi chú: ..."
                int start = gd.getNoiDung().indexOf("Rút tiền về tài khoản ") + "Rút tiền về tài khoản ".length();
                int openParen = gd.getNoiDung().indexOf("(", start);
                int closeParen = gd.getNoiDung().indexOf(")", openParen);
                if (openParen > start && closeParen > openParen) {
                    tenNganHang = gd.getNoiDung().substring(start, openParen).trim();
                    soTaiKhoan = gd.getNoiDung().substring(openParen + 1, closeParen).trim();
                }
            } catch (Exception ignored) {}
        }

        long soTien = gd.getSoTien() != null ? gd.getSoTien() : 0L;

        return AdminTransactionResponseDTO.builder()
                .maGiaoDich(gd.getMaGiaoDich())
                .maNguoiDung(maNguoiDung)
                .tenNguoiDung(tenNguoiDung)
                .hoVaTen(hoVaTen)
                .sdt(sdt)
                .soTien(soTien)
                .loaiGiaoDich(gd.getLoaiGiaoDich())
                .noiDung(gd.getNoiDung())
                .ngayGiaoDich(gd.getNgayGiaoDich())
                .trangThai(gd.getTrangThai())
                .tenNganHang(tenNganHang)
                .soTaiKhoan(soTaiKhoan)
                .tienCoc(soTien)
                .phiDichVu(0L)
                .thucNhan(soTien)
                .build();
    }
}
