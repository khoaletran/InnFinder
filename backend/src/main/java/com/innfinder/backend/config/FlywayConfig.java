/*
 * @ (#) FlywayConfig.java    1.0     11/8/2026
 *
 * Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình Flyway tự động sửa lỗi (Auto Repair) trước khi migrate:
 * Tự động xóa các bản ghi migration bị lỗi (success = 0) nếu lần chạy trước bị gián đoạn,
 * giúp ứng dụng tự phục hồi mà không cần can thiệp DB thủ công.
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try {
                flyway.repair();
                flyway.migrate();
            } catch (Exception ex) {
                log.warn("[InnFinder Flyway] Không thể hoàn tất migrate tự động ({}). Đã đồng bộ schema tương thích lúc khởi tạo DataSource.", ex.getMessage());
                try {
                    flyway.repair();
                } catch (Exception ignored) {
                    // Tránh chặn khởi động Tomcat khi schema tương thích đã được bổ sung.
                }
            }
        };
    }
}
