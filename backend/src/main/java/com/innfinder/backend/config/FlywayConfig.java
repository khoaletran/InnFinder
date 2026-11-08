/*
 * @ (#) FlywayConfig.java    1.0     11/8/2026
 *
 * Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình Flyway tự động sửa lỗi (Auto Repair) trước khi migrate:
 * Tự động xóa các bản ghi migration bị lỗi (success = 0) nếu lần chạy trước bị gián đoạn,
 * giúp ứng dụng tự phục hồi mà không cần can thiệp DB thủ công.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
