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
        @Valid SearchCriteria criteria) {
    public record Turn(@NotNull Role role, @NotBlank @Size(max = 3000) String text) {}
    public enum Role { user, assistant }
}
