package com.innfinder.backend.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình In-Memory Cache cho hệ thống InnFinder
 * Tối ưu hóa API Thống kê & Ngân khố, phản hồi tức thì (<1ms) mà không tốn tài nguyên truy vấn CSDL
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("admin_statistics");
    }
}
