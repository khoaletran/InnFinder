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
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class PhongTroSpecification {
    private static Predicate matchSingleProvince(CriteriaBuilder cb, Expression<String> segment, String rawArea) {
        String lower = rawArea.trim().toLowerCase(Locale.ROOT);
        String clean = lower
                .replaceFirst("^(?:thành phố|thanh pho|tp\\.?|tỉnh|tinh)\\s+", "")
                .trim();
        if (clean.equals("hồ chí minh") || clean.equals("ho chi minh") || clean.equals("hcm") || clean.equals("tphcm")) {
            return cb.or(
                    cb.like(segment, "%hồ chí minh%"),
                    cb.like(segment, "%ho chi minh%"),
                    cb.like(segment, "%hcm%"),
                    cb.like(segment, "%sài gòn%"),
                    cb.like(segment, "%sai gon%"));
        }
        if (clean.equals("huế") || clean.equals("hue")) {
            return cb.or(
                    cb.equal(segment, "huế"),
                    cb.equal(segment, "hue"),
                    cb.like(segment, "%thừa thiên huế%"),
                    cb.like(segment, "%thua thien hue%"),
                    cb.like(segment, "%tp. huế%"),
                    cb.like(segment, "%tp huế%"),
                    cb.like(segment, "%thành phố huế%"),
                    cb.like(segment, "%thanh pho hue%"));
        }
        return cb.or(
                cb.equal(segment, clean),
                cb.like(segment, "% " + clean),
                cb.like(segment, "%." + clean));
    }

    public static Specification<PhongTro> buildFilter(RoomFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // 1. RÀNG BUỘC BẮT BUỘC: Chỉ lấy phòng ĐÃ DUYỆT cho khách vãng lai
            predicates.add(cb.equal(root.get("trangThai"), TrangThaiPhongTro.DA_DUYET));
            predicates.add(cb.isFalse(root.get("tamAn")));
            if (filter == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }
            // 2. Lọc theo khu vực (tỉnh/thành ở phần cuối địa chỉ hoặc suffix nhiều phần) và từ khóa (keyword)
            if (filter.getArea() != null && !filter.getArea().isBlank()) {
                String rawArea = filter.getArea().trim();
                var trimmedAddress = cb.trim(root.get("diaChi"));
                if (rawArea.contains(",")) {
                    String suffix = rawArea.toLowerCase(Locale.ROOT);
                    int components = suffix.split(",", -1).length;
                    var addressSuffix = cb.function("substring_index", String.class,
                            trimmedAddress, cb.literal(","), cb.literal(-components));
                    predicates.add(cb.equal(cb.lower(cb.trim(addressSuffix)), suffix));
                } else {
                    var lastSegment = cb.lower(cb.trim(cb.function("substring_index", String.class,
                            trimmedAddress, cb.literal(","), cb.literal(-1))));
                    var secondLastPrefix = cb.function("substring_index", String.class,
                            trimmedAddress, cb.literal(","), cb.literal(-2));
                    var prevSegment = cb.lower(cb.trim(cb.function("substring_index", String.class,
                            secondLastPrefix, cb.literal(","), cb.literal(1))));
                    Predicate trailingCountry = cb.or(
                            cb.equal(lastSegment, "việt nam"),
                            cb.equal(lastSegment, "viet nam"),
                            cb.equal(lastSegment, "vietnam"));
                    predicates.add(cb.or(
                            matchSingleProvince(cb, lastSegment, rawArea),
                            cb.and(trailingCountry, matchSingleProvince(cb, prevSegment, rawArea))));
                }
            }
            if (filter.getKeyword() != null && !filter.getKeyword().isBlank()) {
                String[] tokens = filter.getKeyword().trim().toLowerCase(Locale.ROOT).split("[\\s,;|]+");
                for (String token : tokens) {
                    if (token.isBlank()) continue;
                    String searchPattern = "%" + token + "%";

                    Predicate matchDiaChi = cb.like(cb.lower(root.get("diaChi")), searchPattern);
                    Predicate matchMoTa = cb.like(cb.lower(root.get("moTa")), searchPattern);
                    Predicate matchLoaiPhong = cb.like(cb.lower(root.get("loaiPhong").get("tenLoaiPhongTro")), searchPattern);
                    Predicate matchMaPhong = cb.like(cb.lower(root.get("maPhongTro")), searchPattern);

                    var amenitySubquery = query.subquery(String.class);
                    var correlatedRoom = amenitySubquery.correlate(root);
                    Join<PhongTro, TienIch> amenityJoin = correlatedRoom.join("dsTienIch", JoinType.INNER);
                    amenitySubquery.select(amenityJoin.get("maTienIch"))
                            .where(cb.like(cb.lower(amenityJoin.get("tenTienIch")), searchPattern));
                    Predicate matchTienIch = cb.exists(amenitySubquery);

                    predicates.add(cb.or(matchDiaChi, matchMoTa, matchLoaiPhong, matchMaPhong, matchTienIch));
                }
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
                // Each requested amenity must exist; an IN join alone only requires any one amenity.
                for (String code : filter.getDsTienIch().stream().distinct().toList()) {
                    var subquery = query.subquery(String.class);
                    var correlatedRoom = subquery.correlate(root);
                    Join<PhongTro, TienIch> amenity = correlatedRoom.join("dsTienIch", JoinType.INNER);
                    subquery.select(amenity.get("maTienIch")).where(cb.equal(amenity.get("maTienIch"), code));
                    predicates.add(cb.exists(subquery));
                }
            }
            // 8. Lọc theo điểm uy tín tối thiểu của chủ trọ
            if (filter.getMinDiemUyTin() != null && filter.getMinDiemUyTin() > 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("chuPhongTro").get("diemUyTin"), filter.getMinDiemUyTin()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
