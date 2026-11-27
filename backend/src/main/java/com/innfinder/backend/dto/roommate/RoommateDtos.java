package com.innfinder.backend.dto.roommate;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

public final class RoommateDtos {
    private RoommateDtos() {}

    public record Input(
            @NotBlank @Size(max = 100) String khuVuc,
            @NotNull @Min(1) @Max(20) Integer soNguoiCanTim,
            @NotNull @Min(0) @Max(100000000) Long chiPhiMoiNguoi,
            @NotNull LocalDate ngayVaoO,
            @NotBlank @Size(max = 1500) String moTa,
            @Pattern(regexp = "NAM|NU|KHONG_YEU_CAU") String gioiTinhUuTien,
            @Size(max = 8) List<@NotBlank @Size(max = 40) String> tieuChi,
            @Min(0) @Max(1000000) Long giaDien,
            @Min(0) @Max(1000000) Long giaNuoc,
            Boolean giaNuocTheoNguoi) {
        public Input(
                String khuVuc,
                Integer soNguoiCanTim,
                Long chiPhiMoiNguoi,
                LocalDate ngayVaoO,
                String moTa,
                String gioiTinhUuTien,
                List<String> tieuChi
        ) {
            this(khuVuc, soNguoiCanTim, chiPhiMoiNguoi, ngayVaoO, moTa, gioiTinhUuTien, tieuChi, null, null, null);
        }
    }

    public record CommentInput(
            @NotBlank @Size(max = 1000) String noiDung,
            @Size(max = 64) String parentId) {}

    public record ApplyInput(
            @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 số, bắt đầu bằng 0") String sdtLienHe,
            @NotBlank @Pattern(regexp = "NAM|NU|KHAC") String gioiTinh,
            @NotBlank @Size(max = 80) String ngheNghiep,
            @NotBlank @Size(max = 500) String loiNhan) {}

    public record ApplicationDecisionInput(
            @Size(max = 300) String lyDoTuChoi) {}

    public record Post(String id, String maPhongTro, String loaiPhong, String anhPhong,
                       String khuVuc, long soNguoiCanTim, long soSlotDaDuyet, long chiPhiMoiNguoi,
                       String ngayVaoO, String moTa, String gioiTinhUuTien, List<String> tieuChi,
                       String tenNguoiDang, String trangThai, boolean chuBai,
                       Double viDo, Double kinhDo,
                       Long giaDien, Long giaNuoc, Boolean giaNuocTheoNguoi) {}

    public record Comment(String id, String tenNguoiViet, String noiDung, String guiLuc,
                          boolean chuBai, String parentId, List<Comment> replies) {}

    public record Application(String id, String postId, String maNguoiDangKy, String tenNguoiDangKy,
                              String sdtLienHe, String gioiTinh, String ngheNghiep, String loiNhan,
                              String trangThai, String lyDoTuChoi, String guiLuc, String xuLyLuc) {}

    public record MyApplication(String id, String postId, String khuVuc, String loaiPhong,
                                String anhPhong, long chiPhiMoiNguoi, String trangThai,
                                String lyDoTuChoi, String guiLuc) {}

    public record ReceivedApplication(String id, String postId, String khuVuc, String loaiPhong,
                                      String anhPhong, long chiPhiMoiNguoi,
                                      String maNguoiDangKy, String tenNguoiDangKy, String sdtLienHe,
                                      String gioiTinh, String ngheNghiep, String loiNhan,
                                      String trangThai, String lyDoTuChoi, String guiLuc, String xuLyLuc) {}

    public record Booking(String loaiPhong, String anhPhong, String baiDangId,
                          Long giaDien, Long giaNuoc, Boolean giaNuocTheoNguoi) {}

    public record Page<T>(List<T> items, String nextCursor) {}
}
