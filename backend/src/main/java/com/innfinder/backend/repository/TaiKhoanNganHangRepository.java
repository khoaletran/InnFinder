package com.innfinder.backend.repository;

import com.innfinder.backend.entity.TaiKhoanNganHang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TaiKhoanNganHangRepository extends JpaRepository<TaiKhoanNganHang, Long> {

    // Tìm danh sách tài khoản ngân hàng của một người dùng
    List<TaiKhoanNganHang> findByNguoiDung_MaNguoiDung(String maNguoiDung);

    // Tải theo lô tài khoản ngân hàng của nhiều người dùng (khử N+1)
    List<TaiKhoanNganHang> findByNguoiDung_MaNguoiDungIn(Collection<String> userIds);
}