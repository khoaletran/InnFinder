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
    private String tenChuTaiKhoan;
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

        // Tách số tài khoản, tên ngân hàng & chủ tài khoản từ nội dung
        String tenNganHang = null;
        String soTaiKhoan = null;
        String tenChuTaiKhoan = hoVaTen;

        if (gd.getNoiDung() != null) {
            String nd = gd.getNoiDung();
            if (nd.contains("Rút tiền về tài khoản")) {
                try {
                    // Định dạng: "Rút tiền về tài khoản MBBank (0123456789) - Ghi chú: ..."
                    int start = nd.indexOf("Rút tiền về tài khoản ") + "Rút tiền về tài khoản ".length();
                    int openParen = nd.indexOf("(", start);
                    int closeParen = nd.indexOf(")", openParen);
                    if (openParen > start && closeParen > openParen) {
                        tenNganHang = nd.substring(start, openParen).trim();
                        soTaiKhoan = nd.substring(openParen + 1, closeParen).trim();
                    }
                } catch (Exception ignored) {}
            } else if (nd.contains(" về TK ")) {
                try {
                    // Định dạng: "... về TK MBBank - 0939080305 (DO MINH QUAN)" hoặc "... về TK MBBank - 0939080305"
                    int start = nd.indexOf(" về TK ") + " về TK ".length();
                    String tkPart = nd.substring(start).trim();
                    if (tkPart.contains(" [ĐÃ DUYỆT")) {
                        tkPart = tkPart.substring(0, tkPart.indexOf(" [ĐÃ DUYỆT")).trim();
                    }
                    if (tkPart.contains(" [TỪ CHỐI")) {
                        tkPart = tkPart.substring(0, tkPart.indexOf(" [TỪ CHỐI")).trim();
                    }
                    if (tkPart.contains(" - ")) {
                        String[] parts = tkPart.split(" - ", 2);
                        tenNganHang = parts[0].trim();
                        String rest = parts[1].trim();
                        int openP = rest.indexOf("(");
                        int closeP = rest.indexOf(")");
                        if (openP > 0 && closeP > openP) {
                            soTaiKhoan = rest.substring(0, openP).trim();
                            tenChuTaiKhoan = rest.substring(openP + 1, closeP).trim();
                        } else {
                            soTaiKhoan = rest;
                        }
                    }
                } catch (Exception ignored) {}
            }
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
                .tenChuTaiKhoan(tenChuTaiKhoan)
                .tienCoc(soTien)
                .phiDichVu(0L)
                .thucNhan(soTien)
                .build();
    }
}
