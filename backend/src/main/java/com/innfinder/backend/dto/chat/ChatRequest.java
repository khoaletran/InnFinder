package com.innfinder.backend.dto.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record ChatRequest(
        @NotBlank @Size(max = 1500) String message,
        @Size(max = 8) List<@Valid Turn> history,
        // Read-only references also accept the old seed format. New room creation keeps PT + 12 digits.
        @Pattern(regexp = "^PT(?:\\d{10}|\\d{12})$") String currentRoomId,
        @Pattern(regexp = "^PT(?:\\d{10}|\\d{12})$") String selectedRoomId,
        @Size(max = 6) List<@NotBlank @Pattern(regexp = "^PT(?:\\d{10}|\\d{12})$") String> roomIds,
        @Valid SearchCriteria criteria,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double userLat,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double userLng) {
    public ChatRequest(String message, List<Turn> history, String currentRoomId,
            String selectedRoomId, List<String> roomIds, SearchCriteria criteria) {
        this(message, history, currentRoomId, selectedRoomId, roomIds, criteria, null, null);
    }

    public record Turn(@NotNull Role role, @NotBlank @Size(max = 3000) String text) {}
    public enum Role { user, assistant }
}
