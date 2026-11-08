-- ====================================================================
-- Script Migration Flyway V9: Tối ưu hiệu năng Thống kê & Ngân khố
-- 1. Bổ sung Covering Indexes cho các bảng giao dịch, phiếu đặt lịch, phòng trọ, người dùng
-- 2. Tạo Database VIEW v_thong_ke_ngan_kho hỗ trợ xem trực quan trên phpMyAdmin
-- ====================================================================

-- 1. Covering Index cho bảng PHIẾU ĐẶT LỊCH (phục vụ tính Doanh thu sàn & Cọc tạm giữ tức thì)
CREATE INDEX IF NOT EXISTS idx_pdl_trang_thai_phi_thu_coc 
ON phieu_dat_lich (trang_thai, phi_thu, coc);

-- 2. Covering Index cho bảng GIAO DỊCH (phục vụ tính Ngân khố Sàn & Lịch sử dòng tiền ví)
CREATE INDEX IF NOT EXISTS idx_gd_loai_trangthai_sotien 
ON giao_dich (loai_giao_dich, trang_thai, so_tien);

CREATE INDEX IF NOT EXISTS idx_gd_user_loai_trangthai_sotien 
ON giao_dich (ma_nguoi_dung, loai_giao_dich, trang_thai, so_tien);

-- 3. Index hỗ trợ đếm trạng thái PHÒNG TRỌ
CREATE INDEX IF NOT EXISTS idx_pt_trang_thai 
ON phong_tro (trang_thai);

-- 4. Index hỗ trợ đếm NGƯỜI DÙNG & CHỦ TRỌ
CREATE INDEX IF NOT EXISTS idx_nd_vai_tro 
ON nguoi_dung (vai_tro);

CREATE INDEX IF NOT EXISTS idx_nd_chu_tro 
ON nguoi_dung (chu_tro);

-- 5. Database VIEW tổng hợp Ngân khố & Doanh thu sàn theo thời gian thực
-- Giúp Tech Lead / Quản trị viên mở phpMyAdmin là thấy ngay số liệu mà không cần gõ query
CREATE OR REPLACE VIEW v_thong_ke_ngan_kho AS
SELECT 
    COALESCE((SELECT SUM(phi_thu) FROM phieu_dat_lich WHERE trang_thai = 'HOAN_THANH'), 0) AS tong_doanh_thu_san,
    COALESCE((SELECT SUM(coc) FROM phieu_dat_lich WHERE trang_thai = 'XAC_NHAN' AND coc > 0), 0) AS quy_tam_giu_coc,
    COALESCE((SELECT SUM(so_du) FROM chu_tro), 0) AS tong_so_du_vi_chu_tro,
    COALESCE((SELECT SUM(so_tien) FROM giao_dich WHERE loai_giao_dich = 'RUT_TIEN' AND trang_thai = 'CHO_THANH_TOAN'), 0) AS quy_cho_rut,
    COALESCE((SELECT COUNT(*) FROM giao_dich WHERE loai_giao_dich = 'RUT_TIEN' AND trang_thai = 'CHO_THANH_TOAN'), 0) AS so_lenh_rut_cho_duyet;
