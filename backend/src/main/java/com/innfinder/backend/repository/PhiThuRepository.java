package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhiThu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PhiThuRepository extends JpaRepository<PhiThu, String> {

    Optional<PhiThu> findByCoc_MaCoc(String maCoc);

    @Query("SELECT MAX(p.maPhiThu) FROM PhiThu p WHERE p.maPhiThu LIKE 'PT%'")
    String findMaxMaPhiThu();
}
