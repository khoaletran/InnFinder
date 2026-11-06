-- ====================================================================
-- Script Migration Flyway V4: Dữ liệu ảo liên kết hệ thống InnFinder
-- Bao gồm: 1 Chủ trọ (10 phòng), 1 Khách hàng, 1 Admin, Tiện ích, Loại phòng, Lịch hẹn, Đánh giá, Giao dịch
-- Mật khẩu chung của tất cả tài khoản: 12345678 (BCrypt Hash: $2a$10$7EqJtq98hPqEX7fNZaFWoOhtH6V8E0rI4U9u05r20s0Z910G4u8b6)
-- ====================================================================

-- 1. DANH MỤC TIỆN ÍCH (tien_ich)
INSERT INTO `tien_ich` (`ma_tien_ich`, `ten_tien_ich`, `mo_ta`) VALUES
('TI0001', 'Wifi tốc độ cao', 'Đường truyền cáp quang băng thông rộng miễn phí'),
('TI0002', 'Điều hòa 2 chiều Inverter', 'Tiết kiệm điện năng, làm mát nhanh'),
('TI0003', 'Máy giặt chung', 'Khu giặt và phơi đồ thoáng mát'),
('TI0004', 'Tủ lạnh riêng', 'Tủ lạnh dung tích 150L sẵn trong phòng'),
('TI0005', 'Chỗ để xe máy', 'Tầng hầm để xe rộng rãi có camera 24/7'),
('TI0006', 'Khóa vân tay an ninh', 'Cửa ra vào vân tay độc lập tự do giờ giấc')
ON DUPLICATE KEY UPDATE `ten_tien_ich` = VALUES(`ten_tien_ich`);

-- 2. DANH MỤC LOẠI PHÒNG (loai_phong_tro), CỌC (coc), PHÍ THU HOA HỒNG (phi_thu)
INSERT INTO `loai_phong_tro` (`ma_lpt`, `ten_loai_phong_tro`, `mo_ta`) VALUES
('LPT001', 'Ký túc xá / Sleepbox', 'Mô hình giường tầng hoặc hộp ngủ riêng tư, đầy đủ tiện nghi, giá rẻ cho sinh viên'),
('LPT002', 'Phòng trọ khép kín', 'Phòng trọ có vệ sinh riêng biệt, bếp nấu ăn, có gác lửng hoặc ban công thoáng'),
('LPT003', 'Chung cư mini / Studio', 'Căn hộ Studio khép kín full nội thất cao cấp, máy hút mùi, thang máy')
ON DUPLICATE KEY UPDATE `ten_loai_phong_tro` = VALUES(`ten_loai_phong_tro`);

INSERT INTO `coc` (`ma_coc`, `ma_lpt`, `so_tien_coc`) VALUES
('COC001', 'LPT001', 100000),
('COC002', 'LPT002', 200000),
('COC003', 'LPT003', 300000)
ON DUPLICATE KEY UPDATE `so_tien_coc` = VALUES(`so_tien_coc`);

INSERT INTO `phi_thu` (`ma_phi_thu`, `ma_coc`, `phi`) VALUES
('PT001', 'COC001', 10000),
('PT002', 'COC002', 20000),
('PT003', 'COC003', 30000)
ON DUPLICATE KEY UPDATE `phi` = VALUES(`phi`);

-- 3. TÀI KHOẢN NGƯỜI DÙNG (nguoi_dung)
INSERT INTO `nguoi_dung` (`ma_nguoi_dung`, `ten_dang_nhap`, `ho_va_ten`, `mat_khau`, `email`, `sdt`, `cccd`, `vai_tro`, `hinh_dai_dien`, `thoi_gian_mo_tai_khoan`, `chu_tro`, `trang_thai_khoa`) VALUES
-- Admin
('ND202611060000', 'admin_system', 'Ban Quản Trị InnFinder', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtH6V8E0rI4U9u05r20s0Z910G4u8b6', 'admin@innfinder.vn', '0911223344', '001090000001', 'QUAN_TRI', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', '2026-01-01', FALSE, FALSE),
-- Chủ trọ Hùng
('ND202611060001', 'chutro_hung', 'Trần Văn Hùng', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtH6V8E0rI4U9u05r20s0Z910G4u8b6', 'hung.chutro@innfinder.vn', '0901234567', '001202012345', 'KHACH_HANG', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', '2026-02-15', TRUE, FALSE),
-- Khách thuê An
('ND202611060002', 'khachhang_an', 'Nguyễn Văn An', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtH6V8E0rI4U9u05r20s0Z910G4u8b6', 'an.khachhang@innfinder.vn', '0987654321', '001203098765', 'KHACH_HANG', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', '2026-03-01', FALSE, FALSE)
ON DUPLICATE KEY UPDATE `ho_va_ten` = VALUES(`ho_va_ten`);

-- 4. BẢNG CHỦ TRỌ (chu_tro)
INSERT INTO `chu_tro` (`ma_chu_tro`, `diem_uy_tin`, `so_du`) VALUES
('ND202611060001', 100, 5000000)
ON DUPLICATE KEY UPDATE `so_du` = VALUES(`so_du`);

-- 5. TÀI KHOẢN NGÂN HÀNG (tai_khoan_ngan_hang)
INSERT INTO `tai_khoan_ngan_hang` (`ma_nguoi_dung`, `so_tai_khoan`, `ten_ngan_hang`) VALUES
('ND202611060001', '101234567890', 'Vietcombank'),
('ND202611060002', '999988887777', 'MBBank');

-- 6. 10 PHÒNG TRỌ THUỘC SỞ HỮU CỦA CHỦ TRỌ HÙNG (phong_tro)
INSERT INTO `phong_tro` (`ma_phong_tro`, `ma_chu_tro`, `ma_lpt`, `gia_thue`, `dien_tich`, `mo_ta`, `so_nguoi`, `thoi_gian_dang`, `trang_thai`, `dia_chi`, `kinh_do`, `vi_do`, `coc_phong`) VALUES
('PT0111260001', 'ND202611060001', 'LPT001', 1800000, 18, 'Ký túc xá cao cấp Cầu Giấy, bao trọn điện nước wifi, giờ giấc thoải mái, phòng vệ sinh khép kín dọn dẹp hàng tuần.', 6, '2026-11-01 08:30:00', 'DA_DUYET', 'Số 15, Ngõ 68 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội', '105.7984', '21.0333', 1800000),
('PT0111260002', 'ND202611060001', 'LPT002', 3500000, 25, 'Phòng trọ khép kín ban công đón nắng, ngõ rộng ô tô vào, có gác xép ngủ cao ráo, nấu ăn riêng biệt không ám mùi.', 2, '2026-11-01 09:15:00', 'DA_DUYET', 'Ngõ 222 Khâm Thiên, Thổ Quan, Đống Đa, Hà Nội', '105.8340', '21.0185', 3500000),
('PT0111260003', 'ND202611060001', 'LPT003', 4800000, 35, 'Căn hộ Studio Full đồ Mễ Trì, sofa, smart TV, máy giặt riêng, bếp từ hút mùi cao cấp, view thoáng mát.', 3, '2026-11-02 10:00:00', 'DA_DUYET', 'Số 42 Mễ Trì Thượng, Mễ Trì, Nam Từ Liêm, Hà Nội', '105.7765', '21.0102', 4800000),
('PT0111260004', 'ND202611060001', 'LPT002', 2900000, 22, 'Phòng trọ sinh viên gần Ngoại Thương, Ngoại Giao, Luật. An ninh tuyệt đối, camera 24/7, khóa vân tay cổng ra vào.', 2, '2026-11-02 11:20:00', 'DA_DUYET', 'Ngõ 185 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội', '105.8034', '21.0261', 2900000),
('PT0111260005', 'ND202611060001', 'LPT003', 4200000, 30, 'Chung cư mini Nguyễn Trãi mới xây 100%, thang máy tốc độ cao, hệ thống PCCC đạt chuẩn kiểm duyệt, ban công riêng.', 2, '2026-11-03 14:00:00', 'DA_DUYET', 'Số 129 Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội', '105.8167', '21.0012', 4200000),
('PT0111260006', 'ND202611060001', 'LPT001', 1600000, 15, 'Sleepbox tiện nghi khu công nghệ Duy Tân, cực gần ĐH Quốc Gia, Sư Phạm. Rèm che riêng tư từng giường, ổ cắm đèn đọc sách riêng.', 4, '2026-11-03 15:45:00', 'DA_DUYET', 'Ngõ 78 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', '105.7831', '21.0315', 1600000),
('PT0111260007', 'ND202611060001', 'LPT002', 3200000, 24, 'Phòng trọ gác xép Bạch Mai, gần Bách Khoa, Kinh Tế, Xây Dựng. Có sẵn điều hòa, bình nóng lạnh, máy giặt dùng chung tầng 5.', 2, '2026-11-04 09:30:00', 'DA_DUYET', 'Ngõ 300 Bạch Mai, Bạch Mai, Hai Bà Trưng, Hà Nội', '105.8502', '20.9995', 3200000),
('PT0111260008', 'ND202611060001', 'LPT003', 5500000, 40, 'Căn hộ 1 ngủ 1 khách sang trọng Dịch Vọng Hậu, ban công rộng trồng cây, bảo vệ trực sảnh, để xe tầng 1 miễn phí.', 3, '2026-11-04 16:10:00', 'DA_DUYET', 'Ngõ 36 Dịch Vọng Hậu, Cầu Giấy, Hà Nội', '105.7865', '21.0378', 5500000),
('PT0111260009', 'ND202611060001', 'LPT002', 3000000, 20, 'Phòng khép kín sạch sẽ ngõ Chùa Bộc, gần Học viện Ngân Hàng, Đại học Thủy Lợi, tiện bus, chợ dân sinh ngay đầu ngõ.', 2, '2026-11-05 13:00:00', 'DA_DUYET', 'Ngõ 95 Chùa Bộc, Trung Liệt, Đống Đa, Hà Nội', '105.8278', '21.0089', 3000000),
('PT0111260010', 'ND202611060001', 'LPT001', 1500000, 16, 'KTX giường tầng Hồ Tùng Mậu gần ĐH Thương Mại, Sân khấu Điện ảnh, tủ để đồ có khóa riêng, điều hòa mát lạnh 24/7.', 4, '2026-11-05 17:30:00', 'DA_DUYET', 'Số 136 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội', '105.7689', '21.0398', 1500000)
ON DUPLICATE KEY UPDATE `gia_thue` = VALUES(`gia_thue`);

-- 7. HÌNH ẢNH MINH HỌA CHO 10 PHÒNG (hinh_anh)
INSERT INTO `hinh_anh` (`ma_hinh_anh`, `ma_phong_tro`, `url`, `thu_tu_anh`, `la_dai_dien`) VALUES
('HA0001', 'PT0111260001', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 1, TRUE),
('HA0002', 'PT0111260002', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 1, TRUE),
('HA0003', 'PT0111260003', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 1, TRUE),
('HA0004', 'PT0111260004', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 1, TRUE),
('HA0005', 'PT0111260005', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 1, TRUE),
('HA0006', 'PT0111260006', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 1, TRUE),
('HA0007', 'PT0111260007', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 1, TRUE),
('HA0008', 'PT0111260008', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 1, TRUE),
('HA0009', 'PT0111260009', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 1, TRUE),
('HA0010', 'PT0111260010', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 1, TRUE);

-- 8. GẮN TIỆN ÍCH CHO TỪNG PHÒNG (tien_ich_phong)
INSERT INTO `tien_ich_phong` (`ma_phong_tro`, `ma_tien_ich`) VALUES
('PT0111260001', 'TI0001'), ('PT0111260001', 'TI0002'), ('PT0111260001', 'TI0003'), ('PT0111260001', 'TI0005'),
('PT0111260002', 'TI0001'), ('PT0111260002', 'TI0002'), ('PT0111260002', 'TI0004'), ('PT0111260002', 'TI0006'),
('PT0111260003', 'TI0001'), ('PT0111260003', 'TI0002'), ('PT0111260003', 'TI0003'), ('PT0111260003', 'TI0004'), ('PT0111260003', 'TI0005'), ('PT0111260003', 'TI0006'),
('PT0111260004', 'TI0001'), ('PT0111260004', 'TI0002'), ('PT0111260004', 'TI0005'), ('PT0111260004', 'TI0006'),
('PT0111260005', 'TI0001'), ('PT0111260005', 'TI0002'), ('PT0111260005', 'TI0004'), ('PT0111260005', 'TI0005'),
('PT0111260006', 'TI0001'), ('PT0111260006', 'TI0002'), ('PT0111260006', 'TI0003'),
('PT0111260007', 'TI0001'), ('PT0111260007', 'TI0002'), ('PT0111260007', 'TI0005'),
('PT0111260008', 'TI0001'), ('PT0111260008', 'TI0002'), ('PT0111260008', 'TI0003'), ('PT0111260008', 'TI0004'), ('PT0111260008', 'TI0005'),
('PT0111260009', 'TI0001'), ('PT0111260009', 'TI0002'), ('PT0111260009', 'TI0005'),
('PT0111260010', 'TI0001'), ('PT0111260010', 'TI0002'), ('PT0111260010', 'TI0003');

-- 9. DỮ LIỆU LIÊN KẾT: LỊCH HẸN, ĐÁNH GIÁ, GIAO DỊCH (phieu_dat_lich, danh_gia, giao_dich)
-- Khách hàng An đặt lịch xem phòng PT0111260001
INSERT INTO `phieu_dat_lich` (`ma_dat_lich`, `ma_khach_hang`, `ma_phong_tro`, `ngay_hen`, `trang_thai`, `coc`, `phi_thu`) VALUES
('DL20261106001', 'ND202611060002', 'PT0111260001', '2026-11-07 14:00:00', 'CHO_XAC_NHAN', 100000, 10000),
('DL20261106002', 'ND202611060002', 'PT0111260002', '2026-10-28 09:30:00', 'HOAN_THANH', 200000, 20000)
ON DUPLICATE KEY UPDATE `trang_thai` = VALUES(`trang_thai`);

-- Đánh giá 5 sao của Khách hàng An (Tên cột chuẩn là ngay_danh_gia)
INSERT INTO `danh_gia` (`ma_danh_gia`, `ma_nguoi_dung`, `ma_phong_tro`, `diem`, `noi_dung`, `ngay_danh_gia`) VALUES
('DG20261106001', 'ND202611060002', 'PT0111260002', 5, 'Phòng đúng như mô tả, anh Hùng chủ trọ rất nhiệt tình dẫn đi xem và giải thích nội quy rõ ràng!', '2026-10-28 15:00:00')
ON DUPLICATE KEY UPDATE `diem` = VALUES(`diem`);

-- Giao dịch hoàn cọc giữ chân cho Khách hàng An (Tên cột chuẩn là ngay_giao_dich)
INSERT INTO `giao_dich` (`ma_giao_dich`, `ma_nguoi_dung`, `so_tien`, `loai_giao_dich`, `noi_dung`, `ngay_giao_dich`, `trang_thai`) VALUES
('GD20261106001', 'ND202611060002', 200000, 'HOAN_COC', 'Hoàn trả 100% tiền cọc giữ chân xem phòng PT0111260002', '2026-10-28 11:00:00', 'THANH_CONG')
ON DUPLICATE KEY UPDATE `so_tien` = VALUES(`so_tien`);
