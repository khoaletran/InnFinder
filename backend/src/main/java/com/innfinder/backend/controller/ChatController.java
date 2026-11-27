package com.innfinder.backend.controller;

import com.innfinder.backend.dto.chat.ChatDtos.*;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.DirectChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
@Tag(name = "Chat Controller", description = "API nhắn tin 1-1 trên Firebase Realtime Database theo ngữ cảnh Lịch hẹn và Ở ghép")
public class ChatController {

    private final DirectChatService directChatService;

    @Operation(summary = "Danh sách cuộc trò chuyện và tin nhắn mới nhất (phân trang theo con trỏ)")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<ChatConversationPageDto>> getConversations(
            @RequestParam(defaultValue = "ALL") String scope,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String cursor
    ) {
        return ResponseEntity.ok(ApiResponse.ok(directChatService.getConversations(scope, limit, cursor), "Lấy danh sách cuộc trò chuyện thành công"));
    }

    @Operation(summary = "Lấy lịch sử tin nhắn theo ngữ cảnh (phân trang keyset theo beforeId)")
    @GetMapping("/{channelType}/{contextId}/messages")
    public ResponseEntity<ApiResponse<ChatThreadDto>> getMessages(
            @PathVariable String channelType,
            @PathVariable String contextId,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String beforeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(directChatService.getThread(channelType, contextId, limit, beforeId), "Lấy lịch sử tin nhắn thành công"));
    }

    @Operation(summary = "Gửi tin nhắn 1-1 mới")
    @PostMapping("/{channelType}/{contextId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendMessage(
            @PathVariable String channelType,
            @PathVariable String contextId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(directChatService.sendMessage(channelType, contextId, request), "Gửi tin nhắn thành công"));
    }
}
