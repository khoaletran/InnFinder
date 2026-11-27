package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.innfinder.backend.config.RoommateRealtimeDbClient;
import com.innfinder.backend.dto.chat.ChatDtos.*;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.realtime.SseNotificationService;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DirectChatService {

    private static final TypeReference<Map<String, Map<String, Object>>> MAP_OF_DOCS = new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> SINGLE_MAP = new TypeReference<>() {};
    private static final int DEFAULT_PAGE_LIMIT = 10;
    private static final int MAX_PAGE_LIMIT = 50;

    private final RoommateRealtimeDbClient rtdb;
    private final PhieuDatLichRepository bookings;
    private final NguoiDungRepository users;

    @Autowired(required = false)
    private SseNotificationService sseNotificationService;

    @Transactional(readOnly = true)
    public ChatConversationPageDto getConversations(String roleScope) {
        return getConversations(roleScope, DEFAULT_PAGE_LIMIT, null);
    }

    @Transactional(readOnly = true)
    public ChatConversationPageDto getConversations(String roleScope, int limit, String cursor) {
        int safeLimit = Math.clamp(limit, 1, MAX_PAGE_LIMIT);
        String currentUsername = SecurityUtils.getCurrentUsername();
        NguoiDung currentUser = users.findByTenDangNhap(currentUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String currentUserId = currentUser.getMaNguoiDung();

        Map<String, ChatConversationSummaryDto> byChannel = new LinkedHashMap<>();
        List<TrangThaiDatLich> allowedStatuses = List.of(TrangThaiDatLich.XAC_NHAN, TrangThaiDatLich.HOAN_THANH);
        String scope = roleScope == null ? "ALL" : roleScope.trim().toUpperCase(Locale.ROOT);

        List<PhieuDatLich> customerBookings = !"LANDLORD".equals(scope)
                ? bookings.findByKhachHang_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(currentUserId, allowedStatuses)
                : List.of();
        List<PhieuDatLich> landlordBookings = !"CUSTOMER".equals(scope)
                ? bookings.findByPhongTro_ChuPhongTro_NguoiDung_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(currentUserId, allowedStatuses)
                : List.of();

        Set<String> candidateChannelIds = new LinkedHashSet<>();
        for (PhieuDatLich booking : customerBookings) {
            NguoiDung landlord = booking.getPhongTro() != null && booking.getPhongTro().getChuPhongTro() != null
                    ? booking.getPhongTro().getChuPhongTro().getNguoiDung()
                    : null;
            if (landlord != null) {
                candidateChannelIds.add(buildPairChannelId("booking_pair", currentUserId, landlord.getMaNguoiDung()));
            }
        }
        for (PhieuDatLich booking : landlordBookings) {
            NguoiDung tenant = booking.getKhachHang();
            if (tenant != null) {
                candidateChannelIds.add(buildPairChannelId("booking_pair", currentUserId, tenant.getMaNguoiDung()));
            }
        }

        List<String> roommateChannelIds = new ArrayList<>();
        if (!"LANDLORD".equals(scope)) {
            Map<String, Object> indexedChats = rtdb.get("userChats/" + currentUserId, SINGLE_MAP);
            Map<String, Object> sourceChats = (indexedChats != null && !indexedChats.isEmpty())
                    ? indexedChats
                    : rtdb.getWithQuery("chats", "shallow=true", SINGLE_MAP);
            if (sourceChats != null) {
                for (String channelId : sourceChats.keySet()) {
                    if (channelId.startsWith("roommate_")) {
                        roommateChannelIds.add(channelId);
                        candidateChannelIds.add(channelId);
                    }
                }
            }
        }

        // Chỉ đọc node /meta của từng kênh song song, không tải toàn bộ cây /chats hay /messages
        Map<String, Map<String, Object>> metaByChannel = fetchMetaInParallel(candidateChannelIds);

        if (!"LANDLORD".equals(scope)) {
            // 1. Lịch hẹn với tư cách Khách thuê (gom 1 kênh duy nhất theo cặp Khách - Chủ trọ)
            for (PhieuDatLich booking : customerBookings) {
                NguoiDung landlord = booking.getPhongTro() != null && booking.getPhongTro().getChuPhongTro() != null
                        ? booking.getPhongTro().getChuPhongTro().getNguoiDung()
                        : null;
                if (landlord == null) continue;
                String channelId = buildPairChannelId("booking_pair", currentUserId, landlord.getMaNguoiDung());
                if (byChannel.containsKey(channelId)) continue;
                Map<String, Object> meta = metaByChannel.get(channelId);
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
            for (PhieuDatLich booking : landlordBookings) {
                NguoiDung tenant = booking.getKhachHang();
                if (tenant == null) continue;
                String channelId = buildPairChannelId("booking_pair", currentUserId, tenant.getMaNguoiDung());
                if (byChannel.containsKey(channelId)) continue;
                Map<String, Object> meta = metaByChannel.get(channelId);
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

        // 3. Các cuộc trò chuyện Ở ghép (ROOMMATE) đã phát sinh tin nhắn từ RTDB (batch load partner)
        Set<String> partnerIds = new LinkedHashSet<>();
        for (String channelId : roommateChannelIds) {
            Map<String, Object> meta = metaByChannel.get(channelId);
            if (meta == null) continue;
            String authorId = str(meta.get("authorId"));
            String applicantId = str(meta.get("applicantId"));
            if (!currentUserId.equals(authorId) && !currentUserId.equals(applicantId)) continue;
            String partnerId = currentUserId.equals(authorId) ? applicantId : authorId;
            if (partnerId != null && !partnerId.isBlank()) {
                partnerIds.add(partnerId);
            }
        }
        Map<String, NguoiDung> partnersById = new HashMap<>();
        if (!partnerIds.isEmpty()) {
            for (NguoiDung u : users.findAllById(partnerIds)) {
                if (u.getMaNguoiDung() != null) {
                    partnersById.put(u.getMaNguoiDung(), u);
                }
            }
        }

        for (String channelId : roommateChannelIds) {
            Map<String, Object> meta = metaByChannel.get(channelId);
            if (meta == null) continue;

            String authorId = str(meta.get("authorId"));
            String applicantId = str(meta.get("applicantId"));
            if (!currentUserId.equals(authorId) && !currentUserId.equals(applicantId)) continue;

            boolean isAuthor = currentUserId.equals(authorId);
            String partnerId = isAuthor ? applicantId : authorId;
            NguoiDung partner = partnerId != null ? partnersById.get(partnerId) : null;
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

        List<ChatConversationSummaryDto> sorted = byChannel.values().stream()
                .sorted(Comparator.comparingLong(ChatConversationSummaryDto::updatedAtMs).reversed()
                        .thenComparing(ChatConversationSummaryDto::channelId))
                .toList();

        Long cursorMs = null;
        String cursorChannelId = null;
        if (cursor != null && !cursor.isBlank()) {
            int sep = cursor.indexOf(':');
            if (sep > 0) {
                try {
                    cursorMs = Long.parseLong(cursor.substring(0, sep));
                    cursorChannelId = cursor.substring(sep + 1);
                } catch (NumberFormatException ignored) {
                    cursorMs = null;
                }
            }
        }

        final Long cMs = cursorMs;
        final String cId = cursorChannelId;
        List<ChatConversationSummaryDto> slice = sorted.stream()
                .filter(c -> cMs == null
                        || c.updatedAtMs() < cMs
                        || (c.updatedAtMs() == cMs && c.channelId().compareTo(cId) > 0))
                .limit(safeLimit + 1L)
                .toList();

        boolean hasMore = slice.size() > safeLimit;
        List<ChatConversationSummaryDto> pageItems = hasMore ? slice.subList(0, safeLimit) : slice;
        String nextCursor = (hasMore && !pageItems.isEmpty())
                ? pageItems.get(pageItems.size() - 1).updatedAtMs() + ":" + pageItems.get(pageItems.size() - 1).channelId()
                : null;

        return new ChatConversationPageDto(pageItems, nextCursor, hasMore);
    }

    @Transactional(readOnly = true)
    public ChatThreadDto getThread(String channelType, String contextId) {
        return getThread(channelType, contextId, DEFAULT_PAGE_LIMIT, null);
    }

    @Transactional(readOnly = true)
    public ChatThreadDto getThread(String channelType, String contextId, int limit, String beforeId) {
        int safeLimit = Math.clamp(limit, 1, MAX_PAGE_LIMIT);
        ChatContext ctx = resolveAndAuthorize(channelType, contextId);

        String trimmedBefore = beforeId != null ? beforeId.trim() : null;
        boolean hasBefore = trimmedBefore != null && !trimmedBefore.isEmpty();
        String query = hasBefore
                ? "orderBy=%22%24key%22&endAt=%22" + URLEncoder.encode(trimmedBefore, StandardCharsets.UTF_8) + "%22&limitToLast=" + (safeLimit + 2)
                : "orderBy=%22%24key%22&limitToLast=" + (safeLimit + 1);

        Map<String, Map<String, Object>> raw = rtdb.getWithQuery(
                "chats/" + ctx.channelId + "/messages",
                query,
                MAP_OF_DOCS
        );

        List<ChatMessageDto> messages = new ArrayList<>();
        boolean hasMore = false;
        if (raw != null && !raw.isEmpty()) {
            List<Map.Entry<String, Map<String, Object>>> sorted = raw.entrySet().stream()
                    .filter(e -> e.getValue() != null)
                    .filter(e -> !hasBefore || e.getKey().compareTo(trimmedBefore) < 0)
                    .sorted(Map.Entry.comparingByKey())
                    .toList();

            hasMore = sorted.size() > safeLimit;
            if (hasMore) {
                sorted = sorted.subList(sorted.size() - safeLimit, sorted.size());
            }

            for (Map.Entry<String, Map<String, Object>> e : sorted) {
                Map<String, Object> doc = e.getValue();
                messages.add(new ChatMessageDto(
                        e.getKey(),
                        str(doc.get("senderId")),
                        str(doc.get("senderName")),
                        str(doc.get("senderAvatar")),
                        str(doc.get("content")),
                        str(doc.get("createdAt"))
                ));
            }
        }

        String nextCursor = (hasMore && !messages.isEmpty()) ? messages.get(0).id() : null;

        return new ChatThreadDto(
                ctx.channelId,
                ctx.contextType,
                contextId,
                ctx.title,
                ctx.partnerName,
                ctx.partnerAvatar,
                ctx.partnerRoleLabel,
                messages,
                nextCursor,
                hasMore
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

        ChatMessageDto savedMessage = new ChatMessageDto(
                messageId,
                sender.getMaNguoiDung(),
                senderName,
                sender.getHinhDaiDien(),
                content,
                nowIso
        );

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

        // Cập nhật meta & chỉ mục userChats bất đồng bộ để API sendMessage trả về ngay sau khi ghi message
        CompletableFuture.runAsync(() -> {
            try {
                rtdb.patch("chats/" + ctx.channelId + "/meta", meta);
                rtdb.put("userChats/" + sender.getMaNguoiDung() + "/" + ctx.channelId, Map.of("active", true));
                if (ctx.partnerId != null && !ctx.partnerId.isBlank()) {
                    rtdb.put("userChats/" + ctx.partnerId + "/" + ctx.channelId, Map.of("active", true));
                }
            } catch (Exception ex) {
                log.warn("Không thể cập nhật meta kênh chat {}: {}", ctx.channelId, ex.getMessage());
            }
        });

        if (sseNotificationService != null) {
            Map<String, Object> eventPayload = new LinkedHashMap<>();
            eventPayload.put("channelId", ctx.channelId);
            eventPayload.put("contextType", ctx.contextType);
            eventPayload.put("contextId", contextId);
            eventPayload.put("updatedAt", nowIso);
            eventPayload.put("updatedAtMs", nowMs);
            eventPayload.put("message", savedMessage);

            if (ctx.partnerId != null && !ctx.partnerId.isBlank()) {
                sseNotificationService.sendToUser(ctx.partnerId, "CHAT_MESSAGE", eventPayload);
            }
            sseNotificationService.sendToUser(sender.getMaNguoiDung(), "CHAT_MESSAGE", eventPayload);
        }

        return savedMessage;
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
                    partner != null ? partner.getMaNguoiDung() : null,
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
                    partnerId,
                    authorId,
                    applicantId
            );
        }

        throw new AppException(ErrorCode.INVALID_KEY);
    }

    private Map<String, Map<String, Object>> fetchMetaInParallel(Collection<String> channelIds) {
        if (channelIds == null || channelIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Map<String, Object>> result = new ConcurrentHashMap<>();
        List<CompletableFuture<Void>> futures = channelIds.stream()
                .map(channelId -> CompletableFuture.runAsync(() -> {
                    try {
                        Map<String, Object> meta = rtdb.get("chats/" + channelId + "/meta", SINGLE_MAP);
                        if (meta != null && !meta.isEmpty()) {
                            result.put(channelId, meta);
                        }
                    } catch (Exception ex) {
                        log.debug("Bỏ qua đọc meta kênh {}: {}", channelId, ex.getMessage());
                    }
                }))
                .toList();
        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
        return result;
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
            String partnerId,
            String authorId,
            String applicantId
    ) {
    }
}
