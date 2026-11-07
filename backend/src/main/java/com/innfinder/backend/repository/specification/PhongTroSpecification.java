/*
 * @ (#) PhongTroSpecification.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.repository.specification;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:05 PM
 */
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.TienIch;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;
public class PhongTroSpecification {
    public static Specification<PhongTro> buildFilter(RoomFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // 1. RÀNG BUỘC BẮT BUỘC: Chỉ lấy phòng ĐÃ DUYỆT cho khách vãng lai
            predicates.add(cb.equal(root.get("trangThai"), TrangThaiPhongTro.DA_DUYET));
            if (filter == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }
            // 2. Lọc theo từ khóa (keyword) không phân biệt hoa thường trong Địa chỉ, Mô tả bài đăng và Loại phòng
            if (filter.getKeyword() != null && !filter.getKeyword().isBlank()) {
                String searchPattern = "%" + filter.getKeyword().trim().toLowerCase() + "%";

                // Khớp địa chỉ (không phân biệt hoa thường)
                Predicate matchDiaChi = cb.like(cb.lower(root.get("diaChi")), searchPattern);

                // Khớp mô tả chi tiết bài đăng (không phân biệt hoa thường)
                Predicate matchMoTa = cb.like(cb.lower(root.get("moTa")), searchPattern);

                // Khớp tên loại phòng (ví dụ: Ký túc xá, Căn hộ mini, Studio...)
                Predicate matchLoaiPhong = cb.like(cb.lower(root.get("loaiPhong").get("tenLoaiPhongTro")), searchPattern);

                // Kết hợp bằng điều kiện HOẶC (OR)
                predicates.add(cb.or(matchDiaChi, matchMoTa, matchLoaiPhong));
            }
            // 3. Lọc theo khoảng giá thuê
            if (filter.getMinGia() != null && filter.getMinGia() >= 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("giaThue"), filter.getMinGia()));
            }
            if (filter.getMaxGia() != null && filter.getMaxGia() > 0) {
                predicates.add(cb.lessThanOrEqualTo(root.get("giaThue"), filter.getMaxGia()));
            }
            // 4. Lọc theo khoảng diện tích
            if (filter.getMinDienTich() != null && filter.getMinDienTich() >= 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dienTich"), filter.getMinDienTich()));
            }
            if (filter.getMaxDienTich() != null && filter.getMaxDienTich() > 0) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dienTich"), filter.getMaxDienTich()));
            }
            // 5. Lọc theo số người ở
            if (filter.getSoNguoi() != null && filter.getSoNguoi() > 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("soNguoi"), filter.getSoNguoi()));
            }
            // 6. Lọc theo loại phòng trọ
            if (filter.getMaLpt() != null && !filter.getMaLpt().isBlank()) {
                predicates.add(cb.equal(root.get("loaiPhong").get("maLpt"), filter.getMaLpt().trim()));
            }
            // 7. Lọc theo danh sách tiện ích
            if (filter.getDsTienIch() != null && !filter.getDsTienIch().isEmpty()) {
                Join<PhongTro, TienIch> tienIchJoin = root.join("dsTienIch", JoinType.INNER);
                predicates.add(tienIchJoin.get("maTienIch").in(filter.getDsTienIch()));
                // Đảm bảo không bị trùng lặp kết quả do JOIN N-N
                query.distinct(true);
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}