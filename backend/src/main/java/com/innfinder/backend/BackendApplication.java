package com.innfinder.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(BackendApplication.class, args);
    }

    /**
     * Tự động nạp biến môi trường từ file .env (ở backend/.env hoặc thư mục gốc project)
     * vào System Properties trước khi Spring Boot khởi động.
     */
    private static void loadDotenv() {
        List<Path> potentialPaths = List.of(
                Path.of("backend/.env"),
                Path.of(".env"),
                Path.of("../.env")
        );

        for (Path path : potentialPaths) {
            if (Files.isRegularFile(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    int loadedCount = 0;
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                            continue;
                        }
                        int eqIdx = trimmed.indexOf('=');
                        String key = trimmed.substring(0, eqIdx).trim();
                        String value = trimmed.substring(eqIdx + 1).trim();
                        // Gỡ bỏ dấu nháy kép hoặc đơn bọc ngoài nếu có
                        if ((value.startsWith("\"") && value.endsWith("\"")) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (value.isEmpty()) {
                            continue;
                        }
                        // Thiết lập System Property nếu chưa có trong biến môi trường OS
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                            loadedCount++;
                        }
                    }
                    if (loadedCount > 0) {
                        System.out.println("[InnFinder Env] Đã nạp thành công biến môi trường từ: " + path.toAbsolutePath());
                    }
                } catch (IOException e) {
                    System.err.println("[InnFinder Env] Không thể đọc file .env: " + e.getMessage());
                }
            }
        }
    }
}
