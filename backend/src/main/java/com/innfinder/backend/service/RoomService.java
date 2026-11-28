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
import com.innfinder.backend.realtime.RealtimePublisher;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.repository.specification.NaturalQueryParser;
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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RealtimePublisher realtimePublisher;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AiTrackingService aiTrackingService;
    // Định dạng sinh mã phòng: PTDDMMYYHHmmSS (14 ký tự)
    private static final DateTimeFormatter ROOM_CODE_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyHHmmss");

    @Transactional(readOnly = true)
    public List<PopularAreaResponse> getPopularAreas() {
        Map<String, List<PhongTro>> groups = new LinkedHashMap<>();
        Map<String, String> labels = new HashMap<>();
        for (PhongTro room : phongTroRepository.findPublicRoomsForAreaStats()) {
            String area = areaSuffix(room.getDiaChi());
            if (area == null) continue;
            String key = area.toLowerCase(Locale.ROOT);
            labels.putIfAbsent(key, area);
            groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(room);
        }
        return groups.entrySet().stream().map(entry -> {
            List<PhongTro> rooms = entry.getValue();
            Long minPrice = rooms.stream().map(PhongTro::getGiaThue).filter(Objects::nonNull)
                    .filter(price -> price >= 0).min(Long::compareTo).orElse(null);
            String image = rooms.stream().flatMap(room -> room.getHinhAnh() == null
                            ? java.util.stream.Stream.<HinhAnh>empty() : room.getHinhAnh().stream())
                    .filter(img -> img.getUrl() != null && !img.getUrl().isBlank())
                    .sorted(Comparator.comparing((HinhAnh img) -> !Boolean.TRUE.equals(img.getLaDaiDien()))
                            .thenComparing(img -> img.getThuTuAnh() == null ? Integer.MAX_VALUE : img.getThuTuAnh()))
                    .map(HinhAnh::getUrl).findFirst().orElse(null);
            String label = labels.get(entry.getKey());
            return new PopularAreaResponse(label, label, rooms.size(), minPrice, image);
        }).sorted(Comparator.comparingLong(PopularAreaResponse::roomCount).reversed()
                .thenComparing(PopularAreaResponse::name)).limit(6).toList();
    }

    // Addresses are free text: use their existing comma-separated suffix, never invent a locality.
    private String areaSuffix(String address) {
        if (address == null || address.isBlank()) return null;
        String cleaned = address.trim();
        // A dangling separator has no reliable locality; do not manufacture one.
        if (cleaned.endsWith(",")) return null;
        int lastComma = cleaned.lastIndexOf(',');
        if (lastComma < 0) {
            return cleaned.matches("(?iu)^(phường|xã|quận|huyện|thị xã|thành phố|tỉnh|tp\\.).*[^\\d\\s].*")
                    ? cleaned : null;
        }
        int previousComma = cleaned.lastIndexOf(',', lastComma - 1);
        String suffix = cleaned.substring(previousComma < 0 ? lastComma + 1 : previousComma + 1).trim();
        return suffix.isBlank() || suffix.matches("[\\d\\s,]+") ? null : suffix;
    }
    /* ==============================================================
     * CÁC PHƯƠNG THỨC PUBLIC CHO KHÁCH THUÊ (CHẶN 3)
     * ============================================================== */
    @Transactional(readOnly = true)
    public Page<RoomSummaryResponse> searchRooms(RoomFilterRequest filter) {
        String sortField = resolveSortField(filter.getSortBy());
        Sort sort = Sort.by(
                "ASC".equalsIgnoreCase(filter.getSortDirection()) ? Sort.Direction.ASC : Sort.Direction.DESC,
                sortField
        );
        Pageable pageable = PageRequest.of(
                Math.max(0, filter.getPage()),
                filter.getSize() > 0 ? filter.getSize() : 10,
                sort
        );
        RoomFilterRequest effectiveFilter = NaturalQueryParser.parse(filter);
        Specification<PhongTro> spec = PhongTroSpecification.buildFilter(effectiveFilter);
        Page<PhongTro> roomPage = phongTroRepository.findAll(spec, pageable);
        return roomPage.map(RoomSummaryResponse::fromEntity);
    }

    private String resolveSortField(String rawSortBy) {
        if (rawSortBy == null || rawSortBy.isBlank()) return "thoiGianDang";
        return switch (rawSortBy.trim()) {
            case "giaThue", "dienTich", "giaDien", "thoiGianDang" -> rawSortBy.trim();
            case "giaNuoc", "giaNuoc.gia" -> "giaNuoc.gia";
            default -> "thoiGianDang";
        };
    }
    @Transactional(readOnly = true)
    public RoomDetailResponse getRoomDetail(String maPhongTro) {
        PhongTro room = phongTroRepository.findByMaPhongTro(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        if (aiTrackingService != null) {
            aiTrackingService.recordRoomBehavior("ROOM_VIEW", room.getMaPhongTro(), SecurityUtils.getCurrentUsername());
        }
        return RoomDetailResponse.fromEntity(room);
    }
    @Transactional(readOnly = true)
    public RoomDetailResponse getOwnedRoomDetail(String id) {
        ChuTro owner = getAuthenticatedLandlord();
        PhongTro room = phongTroRepository.findByMaPhongTro(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomOwnership(room, owner);
        return RoomDetailResponse.fromEntity(room);
    }

    private List<TienIch> loadAmenities(List<String> codes) {
        List<String> unique = codes.stream().distinct().toList();
        List<TienIch> items = tienIchRepository.findAllById(unique);
        if (items.size() != unique.size()) throw new AppException(ErrorCode.AMENITY_NOT_FOUND);
        return items;
    }

    private void validateImageUrls(List<String> urls) {
        if (urls == null || urls.isEmpty() || urls.size() > 10) throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        for (String url : urls) {
            try {
                java.net.URI uri = java.net.URI.create(url);
                if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                        || uri.getHost() == null) throw new IllegalArgumentException();
            } catch (IllegalArgumentException ex) { throw new AppException(ErrorCode.INVALID_IMAGE_FILE); }
        }
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
        validateLandlordPostingEligibility(currentLandlord, true);
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
            dsTienIch = loadAmenities(request.getDsTienIch());
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
                .kinhDo(request.getKinhDo() != null && !request.getKinhDo().isBlank() ? request.getKinhDo() : "106.6297")
                .viDo(request.getViDo() != null && !request.getViDo().isBlank() ? request.getViDo() : "10.8231")
                .cocPhong(request.getCoc() != null ? request.getCoc() : 0L)
                .giaDien(request.getGiaDien() != null ? request.getGiaDien() : 0L)
                .giaNuoc(normalizeGiaNuoc(request.getGiaNuoc()))
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
        if (realtimePublisher != null) realtimePublisher.roomUpdated(savedRoom, true);
        return RoomDetailResponse.fromEntity(savedRoom);
    }

    /**
     * Chủ trọ đăng tin phòng trọ mới từ dữ liệu JSON (kèm danh sách URL ảnh)
     */
    @Transactional
    public RoomDetailResponse createRoomFromJson(RoomCreateRequest request) {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        validateLandlordPostingEligibility(currentLandlord, true);

        validateImageUrls(request.getHinhAnhUrls());
        // 1. Kiểm tra loại phòng
        LoaiPhongTro loaiPhong = loaiPhongTroRepository.findById(request.getMaLpt())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        // 2. Lấy danh sách tiện ích
        List<TienIch> dsTienIch = Collections.emptyList();
        if (request.getDsTienIch() != null && !request.getDsTienIch().isEmpty()) {
            dsTienIch = loadAmenities(request.getDsTienIch());
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
                .kinhDo(request.getKinhDo() != null && !request.getKinhDo().isBlank() ? request.getKinhDo() : "106.6297")
                .viDo(request.getViDo() != null && !request.getViDo().isBlank() ? request.getViDo() : "10.8231")
                .cocPhong(request.getCoc() != null ? request.getCoc() : 0L)
                .giaDien(request.getGiaDien() != null ? request.getGiaDien() : 0L)
                .giaNuoc(normalizeGiaNuoc(request.getGiaNuoc()))
                .dsTienIch(dsTienIch)
                .build();

        // 5. Liên kết danh sách ảnh
        List<HinhAnh> listHinhAnh = new ArrayList<>();
        List<String> urls = request.getHinhAnhUrls();
        if (urls == null || urls.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
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
        if (realtimePublisher != null) realtimePublisher.roomUpdated(savedRoom, true);
        return RoomDetailResponse.fromEntity(savedRoom);
    }
    /**
     * Chủ trọ chỉnh sửa thông tin phòng trọ của mình
     */
    @Transactional
    public RoomDetailResponse updateRoom(String maPhongTro, RoomUpdateRequest request) {
        ChuTro currentLandlord = getAuthenticatedLandlord();
        PhongTro phongTro = phongTroRepository.findByIdForUpdate(maPhongTro)
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
        if (request.getGiaDien() != null) {
            phongTro.setGiaDien(request.getGiaDien());
        }
        if (request.getGiaNuoc() != null) {
            phongTro.setGiaNuoc(normalizeGiaNuoc(request.getGiaNuoc()));
        }
        // Cập nhật danh sách tiện ích
        if (request.getDsTienIch() != null) {
            List<TienIch> dsTienIchMoi = loadAmenities(request.getDsTienIch());
            phongTro.setDsTienIch(dsTienIchMoi);
        }

        if (request.getHinhAnhUrls() != null) validateImageUrls(request.getHinhAnhUrls());
        // Cập nhật danh sách hình ảnh nếu có
        if (request.getHinhAnhUrls() != null && !request.getHinhAnhUrls().isEmpty()) {
            List<HinhAnh> listHinhAnh = new ArrayList<>();
            List<String> urls = request.getHinhAnhUrls();
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
            if (phongTro.getHinhAnh() == null) {
                phongTro.setHinhAnh(new ArrayList<>());
            }
            phongTro.getHinhAnh().clear();
            phongTro.getHinhAnh().addAll(listHinhAnh);
        }

        // Nếu bài đăng từng bị từ chối duyệt (HUY), tự động chuyển về CHO_DUYET để Admin duyệt lại
        if (phongTro.getTrangThai() != TrangThaiPhongTro.CHO_DUYET) {
            phongTro.setTrangThai(TrangThaiPhongTro.CHO_DUYET);
            log.info("Phòng {} từng bị từ chối, chuyển về trạng thái CHO_DUYET sau khi sửa", maPhongTro);
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
        PhongTro phongTro = phongTroRepository.findByIdForUpdate(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomOwnership(phongTro, currentLandlord);
        TrangThaiPhongTro current = phongTro.getTrangThai();
        boolean allowed = newStatus == TrangThaiPhongTro.HUY
                || (current == TrangThaiPhongTro.DA_DUYET && newStatus == TrangThaiPhongTro.HOAN_THANH)
                || (current == TrangThaiPhongTro.HOAN_THANH && newStatus == TrangThaiPhongTro.DA_DUYET);
        if (!allowed) throw new AppException(ErrorCode.ROOM_STATUS_NOT_ALLOWED);
        if (newStatus == TrangThaiPhongTro.DA_DUYET) {
            validateLandlordPostingEligibility(currentLandlord, true);
        }
        phongTro.setTrangThai(newStatus);
        phongTroRepository.save(phongTro);
        log.info("Chủ trọ {} đã đổi trạng thái phòng {} sang {}", currentLandlord.getMaChuTro(), maPhongTro, newStatus);
    }
    @Transactional
    public void setRoomVisibility(String id, boolean hidden) {
        ChuTro owner = getAuthenticatedLandlord();
        PhongTro room = phongTroRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomOwnership(room, owner);
        if (room.getTrangThai() != TrangThaiPhongTro.DA_DUYET) throw new AppException(ErrorCode.ROOM_STATUS_NOT_ALLOWED);
        if (!hidden) {
            validateLandlordPostingEligibility(owner, false);
        }
        room.setTamAn(hidden);
        phongTroRepository.save(room);
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
     * Chuẩn hóa giá nước (mặc định 0 VNĐ, tính theo số khối nếu null)
     */
    private GiaNuoc normalizeGiaNuoc(GiaNuoc input) {
        if (input == null) {
            return GiaNuoc.builder().gia(0L).theoNguoi(false).build();
        }
        return GiaNuoc.builder()
                .gia(input.getGia() != null ? input.getGia() : 0L)
                .theoNguoi(Boolean.TRUE.equals(input.getTheoNguoi()))
                .build();
    }

    /**
     * Lấy entity ChuTro từ tài khoản người dùng đang đăng nhập
     */
    private ChuTro getAuthenticatedLandlord() {
        String username = SecurityUtils.getCurrentUsername();
        return chuTroRepository.findByNguoiDung_TenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));
    }
    private void validateLandlordPostingEligibility(ChuTro landlord, boolean isCreateOrReopen) {
        if (landlord == null) return;
        if (landlord.isDangTamAn()) {
            throw new AppException(ErrorCode.LANDLORD_TEMP_HIDDEN);
        }
        int diem = landlord.getDiemUyTin() != null ? landlord.getDiemUyTin() : 100;
        if (diem < 50) {
            throw new AppException(ErrorCode.LANDLORD_LOW_REPUTATION_POSTING_BLOCKED);
        }
        if (isCreateOrReopen && diem < 70) {
            long activeOrPendingCount = phongTroRepository.countByChuPhongTro_MaChuTroAndTrangThaiIn(
                    landlord.getMaChuTro(),
                    List.of(TrangThaiPhongTro.DA_DUYET, TrangThaiPhongTro.CHO_DUYET)
            );
            if (activeOrPendingCount >= 3) {
                throw new AppException(ErrorCode.LANDLORD_ROOM_LIMIT_EXCEEDED);
            }
        }
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
    private synchronized String generateRoomCode() {
        LocalDateTime now = LocalDateTime.now();
        String code = "PT" + now.format(ROOM_CODE_FORMATTER);
        int addedSeconds = 1;
        while (phongTroRepository.existsById(code)) {
            code = "PT" + now.plusSeconds(addedSeconds).format(ROOM_CODE_FORMATTER);
            addedSeconds++;
        }
        return code;
    }
}
