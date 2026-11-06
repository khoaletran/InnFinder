-- V3: Thêm trường họ và tên (ho_va_ten) vào bảng người dùng (nguoi_dung)
ALTER TABLE `nguoi_dung` 
ADD COLUMN `ho_va_ten` VARCHAR(100) NULL AFTER `ten_dang_nhap`;
