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
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

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
                return buildLocalDataSource();
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
                    ensureRequiredSchemaColumns(conn);
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
        return buildLocalDataSource();
    }

    private DataSource buildLocalDataSource() {
        HikariDataSource localDs = buildHikariDataSource(
                localUrl,
                localUsername,
                localPassword,
                "InnFinder-LocalDocker-Pool"
        );
        try (var conn = localDs.getConnection()) {
            ensureRequiredSchemaColumns(conn);
        } catch (Exception e) {
            log.warn("[InnFinder DB] Bỏ qua đồng bộ cột trước khi khởi tạo schema local: {}", e.getMessage());
        }
        return localDs;
    }

    private void ensureRequiredSchemaColumns(Connection conn) {
        List<String> ddlStatements = List.of(
                "ALTER TABLE tai_khoan_ngan_hang ADD COLUMN ten_chu_tai_khoan VARCHAR(100) NULL",
                "ALTER TABLE tai_khoan_ngan_hang ADD COLUMN mac_dinh BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE giao_dich ADD COLUMN ma_dat_lich VARCHAR(50) NULL",
                "ALTER TABLE giao_dich ADD COLUMN ma_tham_chieu_ngan_hang VARCHAR(100) NULL",
                "ALTER TABLE giao_dich ADD COLUMN ngan_hang_nhan VARCHAR(100) NULL",
                "ALTER TABLE giao_dich ADD COLUMN tai_khoan_nhan VARCHAR(50) NULL",
                "ALTER TABLE giao_dich ADD COLUMN ten_nguoi_nhan VARCHAR(100) NULL",
                "ALTER TABLE giao_dich ADD COLUMN coc_goc BIGINT NULL",
                "ALTER TABLE giao_dich ADD COLUMN phi_hoa_hong BIGINT NULL",
                "ALTER TABLE giao_dich ADD CONSTRAINT fk_giao_dich_dat_lich FOREIGN KEY (ma_dat_lich) REFERENCES phieu_dat_lich(ma_dat_lich)",
                "ALTER TABLE phong_tro ADD COLUMN tam_an BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE phieu_dat_lich ADD COLUMN thoi_gian_dat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
                "ALTER TABLE phieu_khieu_nai ADD COLUMN ket_qua TEXT DEFAULT NULL"
        );

        for (String sql : ddlStatements) {
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(sql);
                log.info("[InnFinder DB] Đã bổ sung schema tương thích: {}", sql);
            } catch (SQLException ignored) {
                // Cột/ràng buộc đã tồn tại hoặc bảng chưa được Flyway khởi tạo.
            }
        }
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
        config.setKeepaliveTime(120000);
        config.setMaxLifetime(240000);
        return new HikariDataSource(config);
    }
}
