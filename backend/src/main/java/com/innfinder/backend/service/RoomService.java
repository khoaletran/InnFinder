/*
 * @ (#) RoomService.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.service;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:06 PM
 */
import com.innfinder.backend.dto.room.*;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.repository.specification.PhongTroSpecification;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {
    private final PhongTroRepository phongTroRepository;
    private final LoaiPhongTroRepository loaiPhongTroRepository;
    private final TienIchRepository tienIchRepository;
    private final ChuTroRepository chuTroRepository;
    private final CloudinaryService cloudinaryService;
    // Định dạng sinh mã phòng: PTDDMMYYHHmmSS (14 ký tự)
    private static final DateTimeFormatter ROOM_CODE_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyHHmmss");
    /* ==============================================================
     * CÁC PHƯƠNG THỨC PUBLIC CHO KHÁCH THUÊ (CHẶN 3)
     * ============================================================== */
    @Transactional(readOnly = true)
    public Page<RoomSummaryResponse> searchRooms(RoomFilterRequest filter) {
        Sort sort = Sort.by(
                "ASC".equalsIgnoreCase(filter.getSortDirection()) ? Sort.Direction.ASC : Sort.Direction.DESC,
                filter.getSortBy() != null ? filter.getSortBy() : "thoiGianDang"
        );
        Pageable pageable = PageRequest.of(
                Math.max(0, filter.getPage()),
                filter.getSize() > 0 ? filter.getSize() : 10,
                sort
        );
        Specification<PhongTro> spec = PhongTroSpecification.buildFilter(filter);
        Page<PhongTro> roomPage = phongTroRepository.findAll(spec, pageable);
        return roomPage.map(RoomSummaryResponse::fromEntity);
    }
    @Transactional(readOnly = true)
    public RoomDetailResponse getRoomDetail(String maPhongTro) {
        PhongTro room = phongTroRepository.findByMaPhongTro(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        return RoomDetailResponse.fromEntity(room);
    }
    /* ==============================================================
     * CÁC PHƯƠNG THỨC DÀNH CHO CHỦ TRỌ (CHẶN 4)
     * ============================================================== */
    /**
     * Chủ trọ đăng tin phòng trọ mới kèm danh sách ảnh (Upload Cloudinary)
     */
    @Transactional
    public RoomDetailResponse createRoom(RoomCreateRequest request, List<MultipartFile> images) {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        // 1. Kiểm tra ảnh tải lên: Tối thiểu 1 ảnh theo quy tắc mục 2.4
        if (images == null || images.isEmpty() || images.stream().allMatch(MultipartFile::isEmpty)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
        // 2. Kiểm tra loại phòng
        LoaiPhongTro loaiPhong = loaiPhongTroRepository.findById(request.getMaLpt())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        // 3. Lấy danh sách tiện ích
        List<TienIch> dsTienIch = Collections.emptyList();
        if (request.getDsTienIch() != null && !request.getDsTienIch().isEmpty()) {
            dsTienIch = tienIchRepository.findAllById(request.getDsTienIch());
        }
        // 4. Sinh mã phòng tự động theo quy tắc: PTDDMMYYHHmmSS (14 ký tự)
        String maPhongTro = generateRoomCode();
        // 5. Khởi tạo đối tượng phòng trọ (Trạng thái mặc định: CHO_DUYET)
        PhongTro phongTro = PhongTro.builder()
                .maPhongTro(maPhongTro)
                .chuPhongTro(currentLandlord)
                .loaiPhong(loaiPhong)
                .giaThue(request.getGiaThue())
                .dienTich(request.getDienTich())
                .moTa(request.getMoTa())
                .soNguoi(request.getSoNguoi())
                .thoiGianDang(LocalDateTime.now())
                .trangThai(TrangThaiPhongTro.CHO_DUYET)
                .diaChi(request.getDiaChi())
                .kinhDo(request.getKinhDo())
                .viDo(request.getViDo())
                .cocPhong(request.getCoc() != null ? request.getCoc() : 0L)
                .dsTienIch(dsTienIch)
                .build();
        // 6. Upload ảnh lên Cloudinary và liên kết với phòng
        List<String> imageUrls = cloudinaryService.uploadMultipleImages(images);
        List<HinhAnh> listHinhAnh = new ArrayList<>();
        for (int i = 0; i < imageUrls.size(); i++) {
            HinhAnh hinhAnh = HinhAnh.builder()
                    .maHinhAnh("HA" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase())
                    .phongTro(phongTro)
                    .url(imageUrls.get(i))
                    .thuTuAnh(i)
                    .laDaiDien(i == 0) // Ảnh đầu tiên là ảnh đại diện
                    .build();
            listHinhAnh.add(hinhAnh);
        }
        phongTro.setHinhAnh(listHinhAnh);
        PhongTro savedRoom = phongTroRepository.save(phongTro);
        log.info("Chủ trọ {} đã tạo phòng trọ thành công: {}", currentLandlord.getMaChuTro(), savedRoom.getMaPhongTro());
        return RoomDetailResponse.fromEntity(savedRoom);
    }

    /**
     * Chủ trọ đăng tin phòng trọ mới từ dữ liệu JSON (kèm danh sách URL ảnh)
     */
    @Transactional
    public RoomDetailResponse createRoomFromJson(RoomCreateRequest request) {
        ChuTro currentLandlord = getAuthenticatedLandlord();

        // 1. Kiểm tra loại phòng
        LoaiPhongTro loaiPhong = loaiPhongTroRepository.findById(request.getMaLpt())
                .orElseGet(() -> loaiPhongTroRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND)));

        // 2. Lấy danh sách tiện ích
        List<TienIch> dsTienIch = Collections.emptyList();
        if (request.getDsTienIch() != null && !request.getDsTienIch().isEmpty()) {
            dsTienIch = tienIchRepository.findAllById(request.getDsTienIch());
        }

        // 3. Sinh mã phòng tự động theo quy tắc: PTDDMMYYHHmmSS (14 ký tự)
        String maPhongTro = generateRoomCode();

        // 4. Khởi tạo đối tượng phòng trọ (Trạng thái mặc định: CHO_DUYET)
        PhongTro phongTro = PhongTro.builder()
                .maPhongTro(maPhongTro)
                .chuPhongTro(currentLandlord)
                .loaiPhong(loaiPhong)
                .giaThue(request.getGiaThue())
                .dienTich(request.getDienTich())
                .moTa(request.getMoTa())
                .soNguoi(request.getSoNguoi())
                .thoiGianDang(LocalDateTime.now())
                .trangThai(TrangThaiPhongTro.CHO_DUYET)
                .diaChi(request.getDiaChi())
                .kinhDo(request.getKinhDo() != null ? request.getKinhDo() : "10.8231")
                .viDo(request.getViDo() != null ? request.getViDo() : "106.6297")
                .cocPhong(request.getCoc() != null ? request.getCoc() : 0L)
                .dsTienIch(dsTienIch)
                .build();

        // 5. Liên kết danh sách ảnh
        List<HinhAnh> listHinhAnh = new ArrayList<>();
        List<String> urls = request.getHinhAnhUrls();
        if (urls == null || urls.isEmpty()) {
            urls = List.of("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600");
        }

        for (int i = 0; i < urls.size(); i++) {
            HinhAnh hinhAnh = HinhAnh.builder()
                    .maHinhAnh("HA" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase())
                    .phongTro(phongTro)
                    .url(urls.get(i))
                    .thuTuAnh(i)
                    .laDaiDien(i == 0)
                    .build();
            listHinhAnh.add(hinhAnh);
        }

        phongTro.setHinhAnh(listHinhAnh);
        PhongTro savedRoom = phongTroRepository.save(phongTro);
        log.info("Chủ trọ {} đã tạo phòng trọ thành công (JSON): {}", currentLandlord.getMaChuTro(), savedRoom.getMaPhongTro());
        return RoomDetailResponse.fromEntity(savedRoom);
    }
    /**
     * Chủ trọ chỉnh sửa thông tin phòng trọ của mình
     */
    @Transactional
    public RoomDetailResponse updateRoom(String maPhongTro, RoomUpdateRequest request) {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        PhongTro phongTro = phongTroRepository.findByMaPhongTro(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        // Kiểm tra quyền sở hữu phòng
        validateRoomOwnership(phongTro, currentLandlord);
        // Cập nhật loại phòng nếu có thay đổi
        if (!phongTro.getLoaiPhong().getMaLpt().equals(request.getMaLpt())) {
            LoaiPhongTro newLoaiPhong = loaiPhongTroRepository.findById(request.getMaLpt())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            phongTro.setLoaiPhong(newLoaiPhong);
        }
        // Cập nhật các thông tin cơ bản
        phongTro.setGiaThue(request.getGiaThue());
        phongTro.setDienTich(request.getDienTich());
        phongTro.setMoTa(request.getMoTa());
        phongTro.setSoNguoi(request.getSoNguoi());
        phongTro.setDiaChi(request.getDiaChi());
        phongTro.setKinhDo(request.getKinhDo());
        phongTro.setViDo(request.getViDo());
        if (request.getCoc() != null) {
            phongTro.setCocPhong(request.getCoc());
        }
        // Cập nhật danh sách tiện ích
        if (request.getDsTienIch() != null) {
            List<TienIch> dsTienIchMoi = tienIchRepository.findAllById(request.getDsTienIch());
            phongTro.setDsTienIch(dsTienIchMoi);
        }
        PhongTro updatedRoom = phongTroRepository.save(phongTro);
        log.info("Chủ trọ {} đã cập nhật phòng trọ: {}", currentLandlord.getMaChuTro(), maPhongTro);
        return RoomDetailResponse.fromEntity(updatedRoom);
    }
    /**
     * Chủ trọ cập nhật trạng thái phòng (ví dụ: HOAN_THANH khi đã cho thuê xong)
     */
    @Transactional
    public void updateRoomStatus(String maPhongTro, TrangThaiPhongTro newStatus) {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        PhongTro phongTro = phongTroRepository.findByMaPhongTro(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomOwnership(phongTro, currentLandlord);
        phongTro.setTrangThai(newStatus);
        phongTroRepository.save(phongTro);
        log.info("Chủ trọ {} đã đổi trạng thái phòng {} sang {}", currentLandlord.getMaChuTro(), maPhongTro, newStatus);
    }
    /**
     * Lấy danh sách toàn bộ các phòng trọ do chính Chủ trọ đang đăng nhập sở hữu
     */
    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> getMyRooms() {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        List<PhongTro> myRooms = phongTroRepository.findByChuPhongTro_MaChuTro(currentLandlord.getMaChuTro());
        return myRooms.stream()
                .map(RoomSummaryResponse::fromEntity)
                .toList();
    }
    /* ==============================================================
     * CÁC HÀM TIỆN ÍCH RIÊNG (PRIVATE HELPERS)
     * ============================================================== */
    /**
     * Lấy entity ChuTro từ tài khoản người dùng đang đăng nhập
     */
    private ChuTro getAuthenticatedLandlord() {
        String username = SecurityUtils.getCurrentUsername();
        return chuTroRepository.findByNguoiDung_TenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));
    }
    /**
     * Kiểm tra Chủ trọ có đúng là người sở hữu phòng này hay không
     */
    private void validateRoomOwnership(PhongTro phongTro, ChuTro landlord) {
        if (!phongTro.getChuPhongTro().getMaChuTro().equals(landlord.getMaChuTro())) {
            throw new AppException(ErrorCode.ROOM_NOT_OWNED);
        }
    }
    /**
     * Tự động sinh mã phòng định dạng: PTDDMMYYHHmmSS (14 ký tự)
     */
    private String generateRoomCode() {
        String code = "PT" + LocalDateTime.now().format(ROOM_CODE_FORMATTER);
        // Tránh trùng mã nếu tạo trong cùng 1 giây
        if (phongTroRepository.existsById(code)) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException ignored) {}
            code = "PT" + LocalDateTime.now().format(ROOM_CODE_FORMATTER);
        }
        return code;
    }
}