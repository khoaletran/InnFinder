-- ====================================================================
-- Script Migration Flyway V5: Cập nhật mật khẩu chuẩn BCrypt cho các tài khoản demo
-- Áp dụng cho: Ban Quản Trị (admin_system), Chủ trọ Hùng (chutro_hung), Khách hàng An (khachhang_an)
-- ====================================================================

UPDATE `nguoi_dung`
SET `mat_khau` = '$2a$10$nw7ouYVXkNnht2Qa93bXuOmfis6dJJXFS3tNE6yh.tL25ImzYQg4a'
WHERE `ma_nguoi_dung` IN ('ND202611060000', 'ND202611060001', 'ND202611060002');
