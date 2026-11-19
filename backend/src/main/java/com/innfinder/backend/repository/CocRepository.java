package com.innfinder.backend.repository;

import com.innfinder.backend.entity.Coc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CocRepository extends JpaRepository<Coc, String> {

    Optional<Coc> findByLoaiPhong_MaLpt(String maLpt);

    @Query("SELECT MAX(c.maCoc) FROM Coc c WHERE c.maCoc LIKE 'COC%'")
    String findMaxMaCoc();
}
