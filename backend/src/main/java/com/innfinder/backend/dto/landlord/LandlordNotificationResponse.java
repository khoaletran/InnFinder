package com.innfinder.backend.dto.landlord;

import java.time.LocalDateTime;

public record LandlordNotificationResponse(String id, String title, String content, String type,
                                            LocalDateTime createdAt, String linkUrl) {}
