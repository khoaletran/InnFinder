/*
 * @ (#) RoomFilterRequest.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.dto.room;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 9:50 PM
 */
import lombok.Getter;
import lombok.Setter;
import java.util.List;
@Getter
@Setter
public class RoomFilterRequest {
    // Từ khóa tìm kiếm theo địa chỉ (quận, huyện, tên đường...)
    private String keyword;
    // Khoảng giá thuê (VNĐ)
    private Long minGia;
    private Long maxGia;
    // Khoảng diện tích (m2)
    private Integer minDienTich;
    private Integer maxDienTich;
    // Số người ở
    private Integer soNguoi;
    // Mã loại phòng (LPT001, LPT002...)
    private String maLpt;
    // Danh sách mã tiện ích bắt buộc phải có (TI0001, TI0002...)
    private List<String> dsTienIch;
    // Phân trang & Sắp xếp
    private int page = 0;
    private int size = 10;
    private String sortBy = "thoiGianDang"; // thoiGianDang, giaThue, dienTich
    private String sortDirection = "DESC";  // ASC hoặc DESC
}