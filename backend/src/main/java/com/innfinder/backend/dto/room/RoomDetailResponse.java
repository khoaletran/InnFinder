/*
 * @ (#) RoomDetailResponse.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 9:54 PM
 */
import com.innfinder.backend.entity.DanhGia;
import com.innfinder.backend.entity.HinhAnh;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomDetailResponse {
    private String maPhongTro;
    private Long giaThue;
    private Integer dienTich;
    private String moTa;
    private Integer soNguoi;
    private LocalDateTime thoiGianDang;
    private TrangThaiPhongTro trangThai;
    private String diaChi;
    private String kinhDo;
    private String viDo;
    private Long coc;
    // Thông tin phân loại & tiện ích
    private CategoryResponse loaiPhong;
    private List<AmenityResponse> dsTienIch;
    // Toàn bộ danh sách hình ảnh thực tế
    private List<ImageResponse> dsHinhAnh;
    // Thông tin chủ trọ
    private LandlordSummaryResponse chuTro;
    // Điểm đánh giá trung bình
    private Double diemDanhGiaTrungBinh;
    private Integer tongSoDanhGia;
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImageResponse {
        private String maHinhAnh;
        private String url;
        private Integer thuTuAnh;
        private Boolean laDaiDien;
        public static ImageResponse fromEntity(HinhAnh img) {
            if (img == null) return null;
            return ImageResponse.builder()
                    .maHinhAnh(img.getMaHinhAnh())
                    .url(img.getUrl())
                    .thuTuAnh(img.getThuTuAnh())
                    .laDaiDien(img.getLaDaiDien())
                    .build();
        }
    }
    public static RoomDetailResponse fromEntity(PhongTro entity) {
        if (entity == null) return null;
        List<ImageResponse> images = entity.getHinhAnh() != null
                ? entity.getHinhAnh().stream().map(ImageResponse::fromEntity).toList()
                : Collections.emptyList();
        List<AmenityResponse> amenities = entity.getDsTienIch() != null
                ? entity.getDsTienIch().stream().map(AmenityResponse::fromEntity).toList()
                : Collections.emptyList();
        double avgRating = 0.0;
        int totalReviews = 0;
        if (entity.getDsDanhGia() != null && !entity.getDsDanhGia().isEmpty()) {
            totalReviews = entity.getDsDanhGia().size();
            avgRating = entity.getDsDanhGia().stream()
                    .mapToInt(DanhGia::getDiem)
                    .average()
                    .orElse(0.0);
            avgRating = Math.round(avgRating * 10.0) / 10.0; // Làm tròn 1 chữ số thập phân
        }
        return RoomDetailResponse.builder()
                .maPhongTro(entity.getMaPhongTro())
                .giaThue(entity.getGiaThue())
                .dienTich(entity.getDienTich())
                .moTa(entity.getMoTa())
                .soNguoi(entity.getSoNguoi())
                .thoiGianDang(entity.getThoiGianDang())
                .trangThai(entity.getTrangThai())
                .diaChi(entity.getDiaChi())
                .kinhDo(entity.getKinhDo())
                .viDo(entity.getViDo())
                .coc(entity.getCocPhong()) //ban dau de getCoc(), co the bug
                .loaiPhong(CategoryResponse.fromEntity(entity.getLoaiPhong()))
                .dsTienIch(amenities)
                .dsHinhAnh(images)
                .chuTro(LandlordSummaryResponse.fromEntity(entity.getChuPhongTro()))
                .diemDanhGiaTrungBinh(avgRating)
                .tongSoDanhGia(totalReviews)
                .build();
    }
}