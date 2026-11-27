package com.innfinder.backend.realtime;

import java.util.Map;
import java.util.Set;

/**
 * Sự kiện miền nội bộ để đẩy thông báo SSE sau khi transaction commit thành công.
 */
public record RealtimeNotificationEvent(
        Set<String> targetUserIds,
        boolean broadcastAdmins,
        String eventType,
        Map<String, Object> payload
) {
    public static final String APPOINTMENT_UPDATED = "APPOINTMENT_UPDATED";
    public static final String WALLET_UPDATED = "WALLET_UPDATED";
    public static final String ROOM_UPDATED = "ROOM_UPDATED";
    public static final String COMPLAINT_UPDATED = "COMPLAINT_UPDATED";
    public static final String ADMIN_QUEUE_UPDATED = "ADMIN_QUEUE_UPDATED";
}
