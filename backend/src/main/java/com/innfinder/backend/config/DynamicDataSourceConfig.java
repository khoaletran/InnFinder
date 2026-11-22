/*
 * @ (#) DynamicDataSourceConfig.java    1.0     11/8/2026
 *
 * Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Cấu hình DataSource động thông minh (Smart Dynamic Failover):
 * - Ưu tiên 1: Kết nối Cloud Database (TiDB / MariaDB Cloud) khi có mạng internet.
 * - Ưu tiên 2: Tự động chuyển vùng sang MariaDB Docker Local (port 3307) khi mất mạng hoặc không kết nối được Cloud.
 */
@Slf4j
@Configuration
public class DynamicDataSourceConfig {

    @Value("${innfinder.datasource.mode:AUTO}")
    private String dbMode;

    @Value("${innfinder.datasource.cloud.url:jdbc:mariadb://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/innfinder_db?sslMode=verify-full&useUnicode=true&characterEncoding=utf8mb4}")
    private String cloudUrl;

    @Value("${innfinder.datasource.cloud.username:2M9hAfunUGrqrV1.root}")
    private String cloudUsername;

    @Value("${innfinder.datasource.cloud.password:U12Zrx07qHoBBASg}")
    private String cloudPassword;

    @Value("${innfinder.datasource.cloud.host:gateway01.ap-southeast-1.prod.aws.tidbcloud.com}")
    private String cloudHost;

    @Value("${innfinder.datasource.cloud.port:4000}")
    private int cloudPort;

    @Value("${innfinder.datasource.local.url:jdbc:mariadb://localhost:3307/innfinder_db?useUnicode=true&characterEncoding=utf8mb4}")
    private String localUrl;

    @Value("${innfinder.datasource.local.username:innfinder_user}")
    private String localUsername;

    @Value("${innfinder.datasource.local.password:innfinder_password}")
    private String localPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        // 1. Nếu cấu hình chế độ LOCAL: kiểm tra Docker port 3307, tự động fallback sang Cloud nếu quên bật Docker
        if ("LOCAL".equalsIgnoreCase(dbMode)) {
            if (checkCloudReachability("localhost", 3307, 1000)) {
                log.info("==================================================================");
                log.info("[InnFinder DB] 🐳 ĐANG CHẠY CHẾ ĐỘ MARIADB DOCKER LOCAL (localhost:3307)");
                log.info("==================================================================");
                return buildHikariDataSource(
                        localUrl,
                        localUsername,
                        localPassword,
                        "InnFinder-LocalDocker-Pool"
                );
            }
            log.warn("[InnFinder DB] ⚠️ Chế độ LOCAL nhưng localhost:3307 chưa mở (Docker chưa chạy). Đang thử fallback sang Cloud DB...");
        }

        log.info("==================================================================");
        log.info("[InnFinder DB] Đang kiểm tra kết nối tới Cloud Database ({}:{})...", cloudHost, cloudPort);

        boolean isCloudReachable = checkCloudReachability(cloudHost, cloudPort, 2500);

        if (isCloudReachable) {
            try {
                HikariDataSource cloudDs = buildHikariDataSource(
                        cloudUrl,
                        cloudUsername,
                        cloudPassword,
                        "InnFinder-Cloud-Pool"
                );
                // Thử nghiệm thực tế 1 connection nhẹ để đảm bảo thông suốt
                try (var conn = cloudDs.getConnection()) {
                    log.info("[InnFinder DB] 🌐 ĐÃ KẾT NỐI THÀNH CÔNG CLOUD DATABASE!");
                    log.info("[InnFinder DB] Host: {}:{}", cloudHost, cloudPort);
                    log.info("[InnFinder DB] Trạng thái: Toàn bộ hệ thống đang dùng chung dữ liệu trên Đám mây.");
                    log.info("==================================================================");
                    return cloudDs;
                }
            } catch (Exception e) {
                log.warn("[InnFinder DB] Không thể xác thực với Cloud: {}. Đang chuyển sang Docker Local...", e.getMessage());
            }
        } else {
            log.warn("[InnFinder DB] ⚠️ MẤT MẠNG HOẶC KHÔNG TÌM THẤY CLOUD ({}:{}).", cloudHost, cloudPort);
        }

        log.info("[InnFinder DB] 🐳 TỰ ĐỘNG CHUYỂN SANG MARIADB DOCKER LOCAL (localhost:3307)!");
        log.info("[InnFinder DB] Trạng thái: Hoạt động ở chế độ Offline nội bộ.");
        log.info("==================================================================");
        return buildHikariDataSource(
                localUrl,
                localUsername,
                localPassword,
                "InnFinder-LocalDocker-Pool"
        );
    }

    private boolean checkCloudReachability(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private HikariDataSource buildHikariDataSource(String url, String username, String password, String poolName) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.mariadb.jdbc.Driver");
        config.setPoolName(poolName);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(10000);
        config.setMaxLifetime(1800000);
        return new HikariDataSource(config);
    }
}
