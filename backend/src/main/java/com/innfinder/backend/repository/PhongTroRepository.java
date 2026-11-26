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
    @Query("SELECT p FROM PhongTro p WHERE p.trangThai = com.innfinder.backend.entity.enums.TrangThaiPhongTro.DA_DUYET AND p.tamAn = false ORDER BY p.maPhongTro")
    List<PhongTro> findPublicRoomsForAreaStats();

    @Override
    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro"})
    Page<PhongTro> findAll(Specification<PhongTro> spec, Pageable pageable);
//    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "dsTienIch", "chuPhongTro", "chuPhongTro.nguoiDung", "dsDanhGia"})
    @EntityGraph(attributePaths = {"loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung", "hinhAnh"})
    Optional<PhongTro> findByMaPhongTro(String maPhongTro);
    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro"})
    List<PhongTro> findByChuPhongTro_MaChuTro(String maChuTro);

    @EntityGraph(attributePaths = {"loaiPhong", "dsTienIch"})
    List<PhongTro> findByTrangThai(TrangThaiPhongTro trangThai);

    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro"})
    List<PhongTro> findByMaPhongTroIn(List<String> maPhongTroList);

    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro", "chuPhongTro.nguoiDung"})
    List<PhongTro> findAllByOrderByThoiGianDangDesc();

    long countByTrangThai(TrangThaiPhongTro trangThai);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PhongTro p WHERE p.maPhongTro = :maPhongTro")
    Optional<PhongTro> findByIdForUpdate(@Param("maPhongTro") String maPhongTro);

    List<PhongTro> findTop20ByChuPhongTro_MaChuTroOrderByThoiGianDangDesc(String id);

    @Query(value = "SELECT trang_thai FROM phong_tro WHERE ma_phong_tro = :id FOR UPDATE", nativeQuery = true)
    String findStatusForUpdate(@Param("id") String id);

    @EntityGraph(attributePaths = {"loaiPhong"})
    @Query("SELECT p FROM PhongTro p")
    List<PhongTro> findAllWithLoaiPhong();
}
