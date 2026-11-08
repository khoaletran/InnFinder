/*
 * @ (#) CloudinaryService.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.service;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 9:30 PM
 */
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private final Cloudinary cloudinary;
    // Giới hạn dung lượng: 10MB theo đặc tả nghiệp vụ
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final String BASE_FOLDER = "innfinder";
    private static final Set<String> ALLOWED_FOLDERS = Set.of("banks", "avatars", "rooms", "cccd", "reviews", "complaints");

    /**
     * Xác định chính xác đường dẫn folder trên Cloudinary:
     * innfinder/banks, innfinder/avatars, innfinder/rooms, innfinder/cccd, innfinder/reviews, innfinder/complaints
     */
    public String resolveFolder(String subFolder) {
        if (subFolder == null || subFolder.isBlank()) {
            return BASE_FOLDER + "/rooms";
        }
        String clean = subFolder.trim().toLowerCase();
        if (clean.startsWith("innfinder/")) {
            clean = clean.substring("innfinder/".length());
        }
        if (ALLOWED_FOLDERS.contains(clean)) {
            return BASE_FOLDER + "/" + clean;
        }
        return BASE_FOLDER + "/rooms";
    }

    /**
     * Upload một file ảnh đơn lẻ lên Cloudinary vào thư mục chỉ định.
     *
     * @param file File ảnh được gửi lên từ Multipart Request
     * @param folder Tên thư mục con (avatars, rooms, cccd, reviews, complaints, banks)
     * @return URL ảnh dạng HTTPS an toàn
     */
    public String uploadImage(MultipartFile file, String folder) {
        validateImageFile(file);
        String targetFolder = resolveFolder(folder);
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", targetFolder,
                            "resource_type", "image"
                    )
            );
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("Upload ảnh thành công lên Cloudinary [{}]: {}", targetFolder, secureUrl);
            return secureUrl;
        } catch (IOException e) {
            log.error("Lỗi I/O khi upload ảnh lên Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.UPLOAD_IMAGE_FAILED);
        } catch (Exception e) {
            log.error("Lỗi bất thường từ Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.UPLOAD_IMAGE_FAILED);
        }
    }

    /**
     * Upload một file ảnh đơn lẻ lên Cloudinary (mặc định vào innfinder/rooms).
     */
    public String uploadImage(MultipartFile file) {
        return uploadImage(file, "rooms");
    }

    /**
     * Upload danh sách nhiều file ảnh vào thư mục chỉ định.
     *
     * @param files Danh sách các file ảnh
     * @param folder Tên thư mục con (rooms, reviews, complaints...)
     * @return Danh sách URL HTTPS tương ứng
     */
    public List<String> uploadMultipleImages(List<MultipartFile> files, String folder) {
        if (files == null || files.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> imageUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                imageUrls.add(uploadImage(file, folder));
            }
        }
        return imageUrls;
    }

    /**
     * Upload danh sách nhiều file ảnh song song/tuần tự (mặc định vào innfinder/rooms).
     * Thường dùng khi Chủ trọ đăng bài mới (tối thiểu 1 ảnh).
     *
     * @param files Danh sách các file ảnh
     * @return Danh sách URL HTTPS tương ứng
     */
    public List<String> uploadMultipleImages(List<MultipartFile> files) {
        return uploadMultipleImages(files, "rooms");
    }

    /**
     * Xóa ảnh trên Cloudinary bằng publicId.
     *
     * @param publicId Định danh ảnh trên Cloudinary (ví dụ: innfinder/rooms/abcxyz)
     */
    public void deleteImageByPublicId(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Đã xóa ảnh trên Cloudinary: {}", publicId);
        } catch (Exception e) {
            log.warn("Không thể xóa ảnh trên Cloudinary với publicId {}: {}", publicId, e.getMessage());
        }
    }

    /**
     * Trích xuất publicId từ Cloudinary URL để phục vụ thao tác xóa.
     * Ví dụ URL: https://res.cloudinary.com/.../image/upload/v12345/innfinder/rooms/img1.jpg
     * Kết quả trích xuất: innfinder/rooms/img1
     */
    public String extractPublicIdFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        try {
            int uploadIndex = imageUrl.indexOf("/upload/");
            if (uploadIndex == -1) return null;
            // Bỏ qua phần "/upload/v12345678/"
            String pathAfterUpload = imageUrl.substring(uploadIndex + 8);
            int firstSlash = pathAfterUpload.indexOf("/");
            if (firstSlash != -1) {
                pathAfterUpload = pathAfterUpload.substring(firstSlash + 1);
            }
            // Cắt bỏ phần mở rộng .jpg, .png...
            int dotIndex = pathAfterUpload.lastIndexOf(".");
            if (dotIndex != -1) {
                return pathAfterUpload.substring(0, dotIndex);
            }
            return pathAfterUpload;
        } catch (Exception e) {
            log.warn("Không thể bóc tách public_id từ URL {}: {}", imageUrl, e.getMessage());
            return null;
        }
    }

    /**
     * Kiểm tra tính hợp lệ của file trước khi gửi sang Cloudinary.
     */
    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
        // Kiểm tra dung lượng (tối đa 10MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            log.warn("File vượt quá kích thước 10MB cho phép: {} bytes", file.getSize());
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
        // Kiểm tra Content-Type hoặc phần mở rộng của file
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        boolean isImageByExt = originalFilename != null &&
                originalFilename.toLowerCase().matches(".*\\.(jpg|jpeg|png|webp|gif|bmp|heic)$");
        if ((contentType == null || !contentType.toLowerCase().startsWith("image/")) && !isImageByExt) {
            log.warn("File không phải định dạng hình ảnh hợp lệ: {}, tên file: {}", contentType, originalFilename);
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }
}
