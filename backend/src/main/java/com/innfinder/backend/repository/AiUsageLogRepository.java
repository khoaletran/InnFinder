package com.innfinder.backend.repository;

import com.innfinder.backend.entity.AiUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {

    List<AiUsageLog> findByCreatedAtAfterOrderByCreatedAtAsc(LocalDateTime since);

    @Query("""
            SELECT l FROM AiUsageLog l
            WHERE (:feature IS NULL OR :feature = '' OR l.feature = :feature)
              AND (:status IS NULL OR :status = '' OR l.status = :status)
              AND (:model IS NULL OR :model = '' OR l.model = :model)
              AND (:since IS NULL OR l.createdAt >= :since)
            ORDER BY l.createdAt DESC
            """)
    Page<AiUsageLog> searchLogs(
            @Param("feature") String feature,
            @Param("status") String status,
            @Param("model") String model,
            @Param("since") LocalDateTime since,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(l.totalTokens), 0L) FROM AiUsageLog l WHERE l.createdAt >= :since AND l.cacheHit = false AND l.feature NOT LIKE 'RECOMMEND%'")
    Long sumTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(l) FROM AiUsageLog l WHERE l.createdAt >= :since AND l.cacheHit = false AND l.feature NOT LIKE 'RECOMMEND%'")
    Long countProviderCallsSince(@Param("since") LocalDateTime since);
}
