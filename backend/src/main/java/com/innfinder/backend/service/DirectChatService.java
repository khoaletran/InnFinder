package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.innfinder.backend.config.RoommateRealtimeDbClient;
import com.innfinder.backend.dto.chat.ChatDtos.*;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DirectChatService {

    private static final TypeReference<Map<String, Map<String, Object>>> MAP_OF_DOCS = new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> SINGLE_MAP = new TypeReference<>() {};

    private final RoommateRealtimeDbClient rtdb;
    private final PhieuDatLichRepository bookings;
    private final NguoiDungRepository users;

    @Transactional(readOnly = true)
    public List<ChatConversationSummaryDto> getConversations(String roleScope) {
        String currentUsername = SecurityUtils.getCurrentUsername();
        NguoiDung currentUser = users.findByTenDangNhap(currentUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String currentUserId = currentUser.getMaNguoiDung();

        Map<String, ChatConversationSummaryDto> byChannel = new LinkedHashMap<>();
        List<TrangThaiDatLich> allowedStatuses = List.of(TrangThaiDatLich.XAC_NHAN, TrangThaiDatLich.HOAN_THANH);
        String scope = roleScope == null ? "ALL" : roleScope.trim().toUpperCase(Locale.ROOT);

        // Đọc toàn bộ metadata của các kênh chat một lần để ghép tin nhắn mới nhất
        Map<String, Map<String, Object>> allChatNodes = rtdb.get("chats", MAP_OF_DOCS);

        if (!"LANDLORD".equals(scope)) {
            // 1. Lịch hẹn với tư cách Khách thuê (gom 1 kênh duy nhất theo cặp Khách - Chủ trọ)
            for (PhieuDatLich booking : bookings.findByKhachHang_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(currentUserId, allowedStatuses)) {
                NguoiDung landlord = booking.getPhongTro() != null && booking.getPhongTro().getChuPhongTro() != null
                        ? booking.getPhongTro().getChuPhongTro().getNguoiDung()
                        : null;
                if (landlord == null) continue;
                String channelId = buildPairChannelId("booking_pair", currentUserId, landlord.getMaNguoiDung());
                if (byChannel.containsKey(channelId)) continue;
                Map<String, Object> meta = extractMeta(allChatNodes, channelId);
                String roomTitle = booking.getPhongTro().getDiaChi() != null
                        ? booking.getPhongTro().getDiaChi()
                        : ("Lịch hẹn #" + booking.getMaDatLich());
                byChannel.put(channelId, buildSummary(
                        channelId,
                        "BOOKING",
                        booking.getMaDatLich(),
                        roomTitle,
                        nonBlank(landlord.getHoVaTen(), landlord.getTenDangNhap()),
                        landlord.getHinhDaiDien(),
                        "Chủ trọ",
                        meta,
                        booking.getThoiGianDat() != null ? booking.getThoiGianDat().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : 0L
                ));
            }
        }

        if (!"CUSTOMER".equals(scope)) {
            // 2. Lịch hẹn với tư cách Chủ trọ (gom 1 kênh duy nhất theo cặp Chủ trọ - Khách)
            for (PhieuDatLich booking : bookings.findByPhongTro_ChuPhongTro_NguoiDung_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(currentUserId, allowedStatuses)) {
                NguoiDung tenant = booking.getKhachHang();
                if (tenant == null) continue;
                String channelId = buildPairChannelId("booking_pair", currentUserId, tenant.getMaNguoiDung());
                if (byChannel.containsKey(channelId)) continue;
                Map<String, Object> meta = extractMeta(allChatNodes, channelId);
                String roomTitle = booking.getPhongTro() != null && booking.getPhongTro().getDiaChi() != null
                        ? booking.getPhongTro().getDiaChi()
                        : ("Lịch hẹn #" + booking.getMaDatLich());
                byChannel.put(channelId, buildSummary(
                        channelId,
                        "BOOKING",
                        booking.getMaDatLich(),
                        roomTitle,
                        nonBlank(tenant.getHoVaTen(), tenant.getTenDangNhap()),
                        tenant.getHinhDaiDien(),
                        "Khách xem phòng",
                        meta,
                        booking.getThoiGianDat() != null ? booking.getThoiGianDat().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : 0L
                ));
            }
        }

        // 3. Các cuộc trò chuyện Ở ghép (ROOMMATE) đã phát sinh tin nhắn từ RTDB
        if (!"LANDLORD".equals(scope) && allChatNodes != null) {
            for (Map.Entry<String, Map<String, Object>> entry : allChatNodes.entrySet()) {
                String channelId = entry.getKey();
                if (!channelId.startsWith("roommate_")) continue;
                Map<String, Object> meta = extractMeta(allChatNodes, channelId);
                if (meta == null) continue;

                String authorId = str(meta.get("authorId"));
                String applicantId = str(meta.get("applicantId"));
                if (!currentUserId.equals(authorId) && !currentUserId.equals(applicantId)) continue;

                boolean isAuthor = currentUserId.equals(authorId);
                String partnerId = isAuthor ? applicantId : authorId;
                NguoiDung partner = partnerId != null ? users.findById(partnerId).orElse(null) : null;
                String partnerName = partner != null ? nonBlank(partner.getHoVaTen(), partner.getTenDangNhap()) : "Bạn ở ghép";
                String partnerAvatar = partner != null ? partner.getHinhDaiDien() : null;

                byChannel.put(channelId, buildSummary(
                        channelId,
                        "ROOMMATE",
                        str(meta.get("contextId")),
                        nonBlank(str(meta.get("title")), "Trao đổi ở ghép"),
                        partnerName,
                        partnerAvatar,
                        isAuthor ? "Người quan tâm ở ghép" : "Chủ bài ở ghép",
                        meta,
                        0L
                ));
            }
        }

        return byChannel.values().stream()
                .sorted(Comparator.comparingLong(ChatConversationSummaryDto::updatedAtMs).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatThreadDto getThread(String channelType, String contextId) {
        ChatContext ctx = resolveAndAuthorize(channelType, contextId);
        Map<String, Map<String, Object>> raw = rtdb.get("chats/" + ctx.channelId + "/messages", MAP_OF_DOCS);

        List<ChatMessageDto> messages = new ArrayList<>();
        if (raw != null && !raw.isEmpty()) {
            raw.entrySet().stream()
                    .filter(e -> e.getValue() != null)
                    .sorted(Comparator.comparingLong(e -> toLong(e.getValue().get("createdAtMs"))))
                    .forEach(e -> {
                        Map<String, Object> doc = e.getValue();
                        messages.add(new ChatMessageDto(
                                e.getKey(),
                                str(doc.get("senderId")),
                                str(doc.get("senderName")),
                                str(doc.get("senderAvatar")),
                                str(doc.get("content")),
                                str(doc.get("createdAt"))
                        ));
                    });
        }

        return new ChatThreadDto(
                ctx.channelId,
                ctx.contextType,
                contextId,
                ctx.title,
                ctx.partnerName,
                ctx.partnerAvatar,
                ctx.partnerRoleLabel,
                messages
        );
    }

    @Transactional(readOnly = true)
    public ChatMessageDto sendMessage(String channelType, String contextId, SendMessageRequest request) {
        ChatContext ctx = resolveAndAuthorize(channelType, contextId);
        String content = request.content().trim();
        if (content.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        NguoiDung sender = ctx.currentUser;
        String senderName = nonBlank(sender.getHoVaTen(), sender.getTenDangNhap());
        long nowMs = Instant.now().toEpochMilli();
        String nowIso = Instant.ofEpochMilli(nowMs).toString();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("senderId", sender.getMaNguoiDung());
        payload.put("senderName", senderName);
        payload.put("senderAvatar", sender.getHinhDaiDien());
        payload.put("content", content);
        payload.put("createdAt", nowIso);
        payload.put("createdAtMs", nowMs);

        String messageId = rtdb.post("chats/" + ctx.channelId + "/messages", payload);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("contextType", ctx.contextType);
        meta.put("contextId", contextId);
        meta.put("title", ctx.title);
        meta.put("lastMessage", content);
        meta.put("lastSenderName", senderName);
        meta.put("updatedAt", nowIso);
        meta.put("updatedAtMs", nowMs);
        if (ctx.authorId != null) meta.put("authorId", ctx.authorId);
        if (ctx.applicantId != null) meta.put("applicantId", ctx.applicantId);
        rtdb.patch("chats/" + ctx.channelId + "/meta", meta);

        return new ChatMessageDto(
                messageId,
                sender.getMaNguoiDung(),
                senderName,
                sender.getHinhDaiDien(),
                content,
                nowIso
        );
    }

    private ChatContext resolveAndAuthorize(String channelType, String contextId) {
        String currentUsername = SecurityUtils.getCurrentUsername();
        NguoiDung currentUser = users.findByTenDangNhap(currentUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String currentUserId = currentUser.getMaNguoiDung();

        String normalizedType = channelType == null ? "" : channelType.trim().toUpperCase(Locale.ROOT);
        if ("BOOKING".equals(normalizedType)) {
            PhieuDatLich booking = bookings.findById(contextId)
                    .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));

            if (booking.getTrangThai() != TrangThaiDatLich.XAC_NHAN
                    && booking.getTrangThai() != TrangThaiDatLich.HOAN_THANH) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }

            NguoiDung tenant = booking.getKhachHang();
            NguoiDung landlord = booking.getPhongTro() != null && booking.getPhongTro().getChuPhongTro() != null
                    ? booking.getPhongTro().getChuPhongTro().getNguoiDung()
                    : null;

            boolean isTenant = tenant != null && currentUserId.equals(tenant.getMaNguoiDung());
            boolean isLandlord = landlord != null && currentUserId.equals(landlord.getMaNguoiDung());
            if (!isTenant && !isLandlord) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }

            NguoiDung partner = isTenant ? landlord : tenant;
            String partnerName = partner != null ? nonBlank(partner.getHoVaTen(), partner.getTenDangNhap()) : "Người dùng";
            String partnerAvatar = partner != null ? partner.getHinhDaiDien() : null;
            String roomTitle = booking.getPhongTro() != null && booking.getPhongTro().getDiaChi() != null
                    ? booking.getPhongTro().getDiaChi()
                    : ("Lịch hẹn #" + contextId);

            String partnerId = partner != null ? partner.getMaNguoiDung() : contextId;
            return new ChatContext(
                    buildPairChannelId("booking_pair", currentUserId, partnerId),
                    "BOOKING",
                    roomTitle,
                    partnerName,
                    partnerAvatar,
                    isTenant ? "Chủ trọ" : "Khách xem phòng",
                    currentUser,
                    null,
                    null
            );
        }

        if ("ROOMMATE".equals(normalizedType)) {
            String[] parts = contextId == null ? new String[0] : contextId.split("__", 2);
            if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            String postId = parts[0];
            String applicantId = parts[1];

            Map<String, Object> postDoc = rtdb.get("baiOGhep/" + postId, SINGLE_MAP);
            if (postDoc == null || postDoc.isEmpty()) {
                throw new AppException(ErrorCode.ROOMMATE_NOT_FOUND);
            }

            String authorId = str(postDoc.get("maNguoiDang"));
            if (authorId == null) {
                authorId = str(postDoc.get("maNguoiDung"));
            }
            if (authorId == null || authorId.equals(applicantId)) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            boolean isAuthor = currentUserId.equals(authorId);
            boolean isApplicant = currentUserId.equals(applicantId);
            if (!isAuthor && !isApplicant) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }

            String partnerId = isAuthor ? applicantId : authorId;
            NguoiDung partner = users.findById(partnerId).orElse(null);
            String partnerName = partner != null ? nonBlank(partner.getHoVaTen(), partner.getTenDangNhap()) : "Bạn ở ghép";
            String partnerAvatar = partner != null ? partner.getHinhDaiDien() : null;
            String khuVuc = str(postDoc.get("khuVuc"));

            return new ChatContext(
                    "roommate_" + sanitizeKey(postId) + "_" + sanitizeKey(applicantId),
                    "ROOMMATE",
                    khuVuc != null ? "Ở ghép · " + khuVuc : "Trao đổi ở ghép",
                    partnerName,
                    partnerAvatar,
                    isAuthor ? "Người quan tâm ở ghép" : "Chủ bài ở ghép",
                    currentUser,
                    authorId,
                    applicantId
            );
        }

        throw new AppException(ErrorCode.INVALID_KEY);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> extractMeta(Map<String, Map<String, Object>> allNodes, String channelId) {
        if (allNodes == null) return null;
        Map<String, Object> node = allNodes.get(channelId);
        if (node == null) return null;
        Object metaObj = node.get("meta");
        if (metaObj instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return null;
    }

    private static ChatConversationSummaryDto buildSummary(
            String channelId,
            String contextType,
            String contextId,
            String title,
            String partnerName,
            String partnerAvatar,
            String partnerRoleLabel,
            Map<String, Object> meta,
            long fallbackMs
    ) {
        long updatedAtMs = meta != null ? toLong(meta.get("updatedAtMs")) : 0L;
        if (updatedAtMs <= 0L) updatedAtMs = fallbackMs;
        return new ChatConversationSummaryDto(
                channelId,
                contextType,
                contextId,
                title,
                partnerName,
                partnerAvatar,
                partnerRoleLabel,
                meta != null ? str(meta.get("lastMessage")) : null,
                meta != null ? str(meta.get("lastSenderName")) : null,
                meta != null ? str(meta.get("updatedAt")) : null,
                updatedAtMs
        );
    }

    private static String buildPairChannelId(String prefix, String userA, String userB) {
        String a = sanitizeKey(userA == null ? "" : userA);
        String b = sanitizeKey(userB == null ? "" : userB);
        return a.compareTo(b) <= 0 ? (prefix + "_" + a + "_" + b) : (prefix + "_" + b + "_" + a);
    }

    private static String sanitizeKey(String raw) {
        return raw.replaceAll("[.#$\\[\\]/]", "_");
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        if (v instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    private static String nonBlank(String primary, String fallback) {
        return (primary != null && !primary.isBlank()) ? primary : (fallback != null ? fallback : "Người dùng");
    }

    private record ChatContext(
            String channelId,
            String contextType,
            String title,
            String partnerName,
            String partnerAvatar,
            String partnerRoleLabel,
            NguoiDung currentUser,
            String authorId,
            String applicantId
    ) {
    }
}
