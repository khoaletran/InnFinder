package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.tour360.PanoramaUploadResponse;
import com.innfinder.backend.dto.tour360.SaveTour360Request;
import com.innfinder.backend.dto.tour360.Tour360NodeDto;
import com.innfinder.backend.dto.tour360.Tour360Response;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.PhongTroTour360;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.PhongTroTour360Repository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class Tour360Service {

    private static final DateTimeFormatter TOUR_ID_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final PhongTroTour360Repository tourRepository;
    private final PhongTroRepository phongTroRepository;
    private final ChuTroRepository chuTroRepository;
    private final CloudinaryService cloudinaryService;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AiTrackingService aiTrackingService;

    public PanoramaUploadResponse uploadPanorama(MultipartFile file) {
        getAuthenticatedLandlord();

        CloudinaryService.PanoramaUploadResult uploaded = cloudinaryService.uploadPanoramaImageWithMeta(file);
        boolean partial = isPartialPanoramaRatio(uploaded.width(), uploaded.height());
        return new PanoramaUploadResponse(uploaded.url(), uploaded.width(), uploaded.height(), partial);
    }

    public static boolean isPartialPanoramaRatio(int width, int height) {
        return width > 0 && height > 0 && ((double) width / height) > 2.15;
    }

    @Transactional
    public Tour360Response createTour(SaveTour360Request request) {
        ChuTro landlord = getAuthenticatedLandlord();
        validateNodes(request.nodes());

        PhongTro room = resolveOwnedRoom(request.maPhongTro(), landlord);
        String resolvedStartNodeId = resolveStartNodeId(request.startNodeId(), request.nodes());
        String configJson = serializeNodes(request.nodes());

        PhongTroTour360 entity = PhongTroTour360.builder()
                .maTour(generateTourId())
                .phongTro(room)
                .chuTro(landlord)
                .startNodeId(resolvedStartNodeId)
                .tourConfigJson(configJson)
                .nodeCount(request.nodes().size())
                .build();

        PhongTroTour360 saved = tourRepository.save(entity);
        return Tour360Response.fromEntity(saved, objectMapper);
    }

    @Transactional
    public Tour360Response updateTour(String maTour, SaveTour360Request request) {
        ChuTro landlord = getAuthenticatedLandlord();
        validateNodes(request.nodes());

        PhongTroTour360 tour = tourRepository.findById(maTour)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_360_NOT_FOUND));
        validateTourOwnership(tour, landlord);

        if (request.maPhongTro() != null && !request.maPhongTro().isBlank()) {
            tour.setPhongTro(resolveOwnedRoom(request.maPhongTro(), landlord));
        }
        tour.setStartNodeId(resolveStartNodeId(request.startNodeId(), request.nodes()));
        tour.setTourConfigJson(serializeNodes(request.nodes()));
        tour.setNodeCount(request.nodes().size());

        PhongTroTour360 saved = tourRepository.save(tour);
        return Tour360Response.fromEntity(saved, objectMapper);
    }

    @Transactional
    public Tour360Response attachTourToRoom(String maPhongTro, String maTour) {
        ChuTro landlord = getAuthenticatedLandlord();
        PhongTro room = resolveOwnedRoom(maPhongTro, landlord);

        PhongTroTour360 tour = tourRepository.findById(maTour)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_360_NOT_FOUND));
        validateTourOwnership(tour, landlord);

        tour.setPhongTro(room);
        PhongTroTour360 saved = tourRepository.save(tour);
        return Tour360Response.fromEntity(saved, objectMapper);
    }

    @Transactional
    public void deleteTour(String maTour) {
        ChuTro landlord = getAuthenticatedLandlord();
        PhongTroTour360 tour = tourRepository.findById(maTour)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_360_NOT_FOUND));
        validateTourOwnership(tour, landlord);
        tourRepository.delete(tour);
    }

    @Transactional(readOnly = true)
    public Tour360Response getTourById(String maTour) {
        PhongTroTour360 tour = tourRepository.findById(maTour)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_360_NOT_FOUND));
        if (aiTrackingService != null && tour.getPhongTro() != null) {
            aiTrackingService.recordRoomBehavior("TOUR_360_VIEW", tour.getPhongTro().getMaPhongTro(), SecurityUtils.getCurrentUsername());
        }
        return Tour360Response.fromEntity(tour, objectMapper);
    }

    @Transactional(readOnly = true)
    public Tour360Response getRoomTour(String maPhongTro) {
        return tourRepository
                .findFirstByPhongTro_MaPhongTroOrderByUpdatedAtDesc(maPhongTro)
                .map(tour -> {
                    if (aiTrackingService != null) {
                        aiTrackingService.recordRoomBehavior("TOUR_360_VIEW", maPhongTro, SecurityUtils.getCurrentUsername());
                    }
                    return Tour360Response.fromEntity(tour, objectMapper);
                })
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Tour360Response> getMyTours() {
        ChuTro landlord = getAuthenticatedLandlord();
        return tourRepository.findByChuTro_MaChuTroOrderByUpdatedAtDesc(landlord.getMaChuTro())
                .stream()
                .map(t -> Tour360Response.fromEntity(t, objectMapper))
                .toList();
    }

    void validateNodes(List<Tour360NodeDto> nodes) {
        if (nodes == null || nodes.isEmpty() || nodes.size() > 10) {
            throw new AppException(ErrorCode.INVALID_TOUR_360_NODES);
        }
        Set<String> ids = nodes.stream().map(Tour360NodeDto::id).collect(Collectors.toSet());
        if (ids.size() != nodes.size()) {
            throw new AppException(ErrorCode.INVALID_TOUR_360_NODES);
        }
    }

    String resolveStartNodeId(String requestedStartId, List<Tour360NodeDto> nodes) {
        if (requestedStartId != null && !requestedStartId.isBlank()) {
            boolean exists = nodes.stream().anyMatch(n -> requestedStartId.equals(n.id()));
            if (exists) {
                return requestedStartId;
            }
        }
        return nodes.get(0).id();
    }

    private String serializeNodes(List<Tour360NodeDto> nodes) {
        try {
            return objectMapper.writeValueAsString(nodes);
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }

    private PhongTro resolveOwnedRoom(String maPhongTro, ChuTro landlord) {
        if (maPhongTro == null || maPhongTro.isBlank()) {
            return null;
        }
        PhongTro room = phongTroRepository.findById(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        if (!room.getChuPhongTro().getMaChuTro().equals(landlord.getMaChuTro())) {
            throw new AppException(ErrorCode.ROOM_NOT_OWNED);
        }
        return room;
    }

    private ChuTro getAuthenticatedLandlord() {
        String username = SecurityUtils.getCurrentUsername();
        return chuTroRepository.findByNguoiDung_TenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD));
    }

    private void validateTourOwnership(PhongTroTour360 tour, ChuTro landlord) {
        if (!tour.getChuTro().getMaChuTro().equals(landlord.getMaChuTro())) {
            throw new AppException(ErrorCode.TOUR_360_NOT_OWNED);
        }
    }

    private String generateTourId() {
        String ts = LocalDateTime.now().format(TOUR_ID_FORMATTER);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
        return "T360" + ts + suffix;
    }
}
