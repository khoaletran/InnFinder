package com.innfinder.backend.dto.chat;

import com.innfinder.backend.dto.room.RoomSummaryResponse;
import java.util.List;

public record ChatResponse(String message, List<RoomSummaryResponse> rooms,
        Action action, SearchCriteria criteria, List<String> suggestions, String searchMode) {
    public record Action(String type, String roomId) {}
}
