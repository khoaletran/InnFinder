package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.PhongTroVector;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.PhongTroVectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSearchService {

    private final PhongTroRepository phongTroRepository;
    private final PhongTroVectorRepository vectorRepository;
    private final AiEmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    /**
     * Ghép nối nội dung phòng thành một văn bản mô tả ngữ nghĩa hoàn chỉnh
     */
    public String buildRoomText(PhongTro room) {
        StringBuilder sb = new StringBuilder();
        sb.append("Phòng trọ ");
        if (room.getLoaiPhong() != null && room.getLoaiPhong().getTenLoaiPhongTro() != null) {
            sb.append(room.getLoaiPhong().getTenLoaiPhongTro()).append(". ");
        }
        if (room.getDiaChi() != null) {
            sb.append("Địa chỉ tại ").append(room.getDiaChi()).append(". ");
        }
        if (room.getGiaThue() != null) {
            double giaTrieu = room.getGiaThue() / 1_000_000.0;
            sb.append("Mức giá thuê ").append(String.format("%.1f", giaTrieu)).append(" triệu/tháng. ");
        }
        if (room.getDienTich() != null) {
            sb.append("Diện tích rộng ").append(room.getDienTich()).append(" mét vuông. ");
        }
        if (room.getSoNguoi() != null) {
            sb.append("Sức chứa tối đa ").append(room.getSoNguoi()).append(" người ở. ");
        }
        if (room.getMoTa() != null && !room.getMoTa().isBlank()) {
            sb.append("Mô tả chi tiết: ").append(room.getMoTa()).append(". ");
        }
        if (room.getDsTienIch() != null && !room.getDsTienIch().isEmpty()) {
            sb.append("Có các tiện ích: ");
            String tienIchStr = room.getDsTienIch().stream()
                    .map(ti -> ti.getTenTienIch())
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(", "));
            sb.append(tienIchStr).append(". ");
        }
        return sb.toString().trim();
    }

    /**
     * Sinh mã băm SHA-256 để kiểm tra xem nội dung phòng có thay đổi không
     */
    private String computeHash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }

    /**
     * Đánh chỉ mục Vector cho tất cả các phòng trọ đã duyệt
     * Tự động chạy khi ứng dụng khởi động xong qua ApplicationReadyEvent
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void indexAllApprovedRooms() {
        try {
            List<PhongTro> approvedRooms = phongTroRepository.findByTrangThai(TrangThaiPhongTro.DA_DUYET);
            if (approvedRooms.isEmpty()) {
                log.info("Chưa có phòng trọ đã duyệt nào để đánh chỉ mục AI Vector.");
                return;
            }

            Map<String, PhongTroVector> existingVectors = vectorRepository.findAll().stream()
                    .collect(Collectors.toMap(PhongTroVector::getMaPhongTro, v -> v, (a, b) -> a));

            List<PhongTroVector> toSave = new ArrayList<>();

            for (PhongTro room : approvedRooms) {
                String text = buildRoomText(room);
                String hash = computeHash(text);

                PhongTroVector existing = existingVectors.get(room.getMaPhongTro());
                if (existing != null && hash.equals(existing.getContentHash())) {
                    continue; // Nội dung không thay đổi, bỏ qua
                }

                List<Double> vector = embeddingService.getEmbedding(text);
                String vectorJson = objectMapper.writeValueAsString(vector);

                PhongTroVector record = PhongTroVector.builder()
                        .maPhongTro(room.getMaPhongTro())
                        .contentHash(hash)
                        .embeddingJson(vectorJson)
                        .build();

                toSave.add(record);
            }

            if (!toSave.isEmpty()) {
                vectorRepository.saveAllAndFlush(toSave);
                log.info("Đã đánh chỉ mục AI Vector thành công cho {} phòng trọ.", toSave.size());
            }
        } catch (Exception e) {
            log.error("Lỗi khi đánh chỉ mục Vector phòng trọ: {}", e.getMessage(), e);
        }
    }

    /**
     * Tìm kiếm phòng trọ bằng ngôn ngữ tự nhiên sử dụng Vector Embeddings (Semantic Search)
     */
    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> searchByNaturalLanguage(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Tải tất cả các vector phòng trong cơ sở dữ liệu
        List<PhongTroVector> allVectors = vectorRepository.findAll();
        if (allVectors.isEmpty()) {
            return Collections.emptyList();
        }

        // 2. Sinh vector cho câu truy vấn của người dùng
        List<Double> queryVector = embeddingService.getEmbedding(prompt.trim());

        // 3. Tính độ tương đồng Cosine Similarity cho từng phòng
        Map<String, Double> scoreMap = new HashMap<>();
        TypeReference<List<Double>> listType = new TypeReference<>() {};

        for (PhongTroVector pv : allVectors) {
            try {
                List<Double> roomVector = objectMapper.readValue(pv.getEmbeddingJson(), listType);
                double similarity = embeddingService.cosineSimilarity(queryVector, roomVector);
                scoreMap.put(pv.getMaPhongTro(), similarity);
            } catch (Exception e) {
                log.warn("Lỗi đọc vector phòng {}: {}", pv.getMaPhongTro(), e.getMessage());
            }
        }

        // 4. Lấy top phòng có điểm tương đồng cao nhất (ngưỡng linh hoạt > 0.0)
        List<String> sortedRoomIds = scoreMap.entrySet().stream()
                .filter(entry -> entry.getValue() > 0.0) // Lọc ngưỡng tương đồng linh hoạt
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(25)
                .map(Map.Entry::getKey)
                .toList();

        if (sortedRoomIds.isEmpty()) {
            return Collections.emptyList();
        }

        // 5. Lấy thông tin phòng từ Repository và giữ đúng thứ tự xếp hạng của AI
        List<PhongTro> rooms = phongTroRepository.findByMaPhongTroIn(sortedRoomIds);
        Map<String, PhongTro> roomEntityMap = rooms.stream()
                .collect(Collectors.toMap(PhongTro::getMaPhongTro, r -> r));

        List<RoomSummaryResponse> result = new ArrayList<>();
        for (String id : sortedRoomIds) {
            PhongTro r = roomEntityMap.get(id);
            if (r != null && r.getTrangThai() == TrangThaiPhongTro.DA_DUYET) {
                result.add(RoomSummaryResponse.fromEntity(r));
            }
        }

        return result;
    }
}
