/*
 * @ (#) PhongTroRepository.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:05 PM
 */
import com.innfinder.backend.entity.PhongTro;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
@Repository
public interface PhongTroRepository extends JpaRepository<PhongTro, String>, JpaSpecificationExecutor<PhongTro> {
    @EntityGraph(attributePaths = {"hinhAnh"})
    @Query("SELECT p FROM PhongTro p WHERE p.trangThai = com.innfinder.backend.entity.enums.TrangThaiPhongTro.DA_DUYET AND p.tamAn = false AND (p.chuPhongTro.tamAnDen IS NULL OR p.chuPhongTro.tamAnDen <= CURRENT_TIMESTAMP) ORDER BY p.maPhongTro")
    List<PhongTro> findPublicRoomsForAreaStats();

    @Override
    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro"})
    Page<PhongTro> findAll(Specification<PhongTro> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    List<PhongTro> findAll(Specification<PhongTro> spec);
//    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "dsTienIch", "chuPhongTro", "chuPhongTro.nguoiDung", "dsDanhGia"})
    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung", "hinhAnh"})
    Optional<PhongTro> findByMaPhongTro(String maPhongTro);
    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    List<PhongTro> findByChuPhongTro_MaChuTro(String maChuTro);

    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    List<PhongTro> findByTrangThai(TrangThaiPhongTro trangThai);

    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro"})
    List<PhongTro> findByMaPhongTroIn(List<String> maPhongTroList);

    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    Page<PhongTro> findAllByOrderByThoiGianDangDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    Page<PhongTro> findByTrangThaiOrderByThoiGianDangDesc(TrangThaiPhongTro trangThai, Pageable pageable);

    @Query("SELECT p.trangThai, COUNT(p) FROM PhongTro p GROUP BY p.trangThai")
    List<Object[]> countRoomsGroupByTrangThai();

    @Query("SELECT p.maPhongTro, lp.maLpt, lp.tenLoaiPhongTro, p.trangThai, p.tamAn, p.thoiGianDang " +
           "FROM PhongTro p LEFT JOIN p.loaiPhong lp")
    List<Object[]> findRoomStatsRows();

    long countByTrangThai(TrangThaiPhongTro trangThai);

    long countByChuPhongTro_MaChuTroAndTrangThaiIn(String maChuTro, List<TrangThaiPhongTro> trangThais);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PhongTro p WHERE p.maPhongTro = :maPhongTro")
    Optional<PhongTro> findByIdForUpdate(@Param("maPhongTro") String maPhongTro);

    List<PhongTro> findTop20ByChuPhongTro_MaChuTroOrderByThoiGianDangDesc(String id);

    @EntityGraph(attributePaths = {"loaiPhong"})
    @Query("SELECT p FROM PhongTro p")
    List<PhongTro> findAllWithLoaiPhong();

    @Query("SELECT p.loaiPhong.maLpt, SUM(p.giaThue), COUNT(p) FROM PhongTro p "
            + "WHERE p.trangThai = com.innfinder.backend.entity.enums.TrangThaiPhongTro.DA_DUYET "
            + "AND p.tamAn = false AND p.loaiPhong IS NOT NULL AND p.giaThue IS NOT NULL "
            + "GROUP BY p.loaiPhong.maLpt")
    List<Object[]> sumAndCountPublicRentByRoomType();
    @Query("SELECT p.maPhongTro FROM PhongTro p WHERE p.trangThai = com.innfinder.backend.entity.enums.TrangThaiPhongTro.DA_DUYET AND p.tamAn = false AND (p.chuPhongTro.tamAnDen IS NULL OR p.chuPhongTro.tamAnDen <= CURRENT_TIMESTAMP) ORDER BY p.thoiGianDang DESC, p.maPhongTro")
    List<String> findRecommendationIds(org.springframework.data.domain.Pageable page);

    @Query(value = "SELECT ma_phong_tro, COUNT(*) FROM phong_yeu_thich GROUP BY ma_phong_tro", nativeQuery = true)
    List<Object[]> countFavoritesByRoom();

    @Query(value = "SELECT ma_phong_tro, COUNT(*) FROM phong_yeu_thich WHERE ma_phong_tro IN (:roomIds) GROUP BY ma_phong_tro", nativeQuery = true)
    List<Object[]> countFavoritesByRoomIds(@Param("roomIds") List<String> roomIds);
}
