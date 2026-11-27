package com.innfinder.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class ChatDtos {

    private ChatDtos() {
    }

    public record SendMessageRequest(
            @NotBlank(message = "Nội dung tin nhắn không được để trống")
            @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự")
            String content
    ) {
    }

    public record ChatMessageDto(
            String id,
            String senderId,
            String senderName,
            String senderAvatar,
            String content,
            String createdAt
    ) {
    }

    public record ChatThreadDto(
            String channelId,
            String contextType,
            String contextId,
            String title,
            String partnerName,
            String partnerAvatar,
            String partnerRoleLabel,
            List<ChatMessageDto> messages,
            String nextCursor,
            boolean hasMore
    ) {
    }

    public record ChatConversationPageDto(
            List<ChatConversationSummaryDto> items,
            String nextCursor,
            boolean hasMore
    ) {
    }

    public record ChatConversationSummaryDto(
            String channelId,
            String contextType,
            String contextId,
            String title,
            String partnerName,
            String partnerAvatar,
            String partnerRoleLabel,
            String lastMessage,
            String lastSenderName,
            String updatedAt,
            long updatedAtMs
    ) {
    }
}
