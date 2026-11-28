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
    // Giới hạn dung lượng: 10MB cho ảnh thường, 15MB cho ảnh toàn cảnh 360°
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final long MAX_PANORAMA_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    private static final String BASE_FOLDER = "innfinder";
    private static final Set<String> ALLOWED_FOLDERS = Set.of("banks", "avatars", "rooms", "cccd", "reviews", "complaints", "tours360");

    /**
     * Xác định chính xác đường dẫn folder trên Cloudinary:
     * innfinder/banks, innfinder/avatars, innfinder/rooms, innfinder/cccd, innfinder/reviews, innfinder/complaints
     */
    public String resolveFolder(String subFolder) {
        if (subFolder == null || subFolder.isBlank()) {
            return BASE_FOLDER + "/rooms";
        }
        String clean = subFolder.trim().toLowerCase();
        // Nếu có dấu phẩy do Spring ghép query param và form data (ví dụ "avatars,avatars")
        if (clean.contains(",")) {
            clean = clean.split(",")[0].trim();
        }
        if (clean.startsWith("innfinder/")) {
            clean = clean.substring("innfinder/".length());
        }
        while (clean.startsWith("/")) {
            clean = clean.substring(1);
        }

        // Hỗ trợ cả số ít và số nhiều (avatar -> avatars, room -> rooms...)
        if (clean.startsWith("avatar")) return BASE_FOLDER + "/avatars";
        if (clean.startsWith("room")) return BASE_FOLDER + "/rooms";
        if (clean.startsWith("cccd")) return BASE_FOLDER + "/cccd";
        if (clean.startsWith("review")) return BASE_FOLDER + "/reviews";
        if (clean.startsWith("complaint")) return BASE_FOLDER + "/complaints";
        if (clean.startsWith("bank")) return BASE_FOLDER + "/banks";
        if (clean.startsWith("tour")) return BASE_FOLDER + "/tours360";

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
        return uploadImageInternal(file, folder, MAX_FILE_SIZE);
    }

    public record PanoramaUploadResult(String url, int width, int height) {}

    /**
     * Upload ảnh toàn cảnh 360° / Panorama và đọc width/height trực tiếp từ metadata Cloudinary (không giải nén ảnh vào JVM heap).
     */
    public PanoramaUploadResult uploadPanoramaImageWithMeta(MultipartFile file) {
        validateImageFile(file, MAX_PANORAMA_FILE_SIZE);
        String targetFolder = resolveFolder("tours360");
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", targetFolder,
                            "resource_type", "image"
                    )
            );
            String secureUrl = (String) uploadResult.get("secure_url");
            int width = uploadResult.get("width") instanceof Number n ? n.intValue() : 0;
            int height = uploadResult.get("height") instanceof Number n ? n.intValue() : 0;
            log.info("Upload ảnh 360° thành công lên Cloudinary [{}]: {} ({}x{})", targetFolder, secureUrl, width, height);
            return new PanoramaUploadResult(secureUrl, width, height);
        } catch (IOException e) {
            log.error("Lỗi I/O khi upload ảnh lên Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.UPLOAD_IMAGE_FAILED);
        } catch (Exception e) {
            log.error("Lỗi bất thường từ Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.UPLOAD_IMAGE_FAILED);
        }
    }

    private String uploadImageInternal(MultipartFile file, String folder, long maxBytes) {
        validateImageFile(file, maxBytes);
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
     * Kiểm tra tính hợp lệ của file trước khi gửi sang Cloudinary.
     */
    private void validateImageFile(MultipartFile file, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
        // Kiểm tra dung lượng tối đa
        if (file.getSize() > maxBytes) {
            log.warn("File vượt quá kích thước {} bytes cho phép: {} bytes", maxBytes, file.getSize());
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
