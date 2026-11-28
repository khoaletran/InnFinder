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

    @Query("SELECT COALESCE(SUM(l.totalTokens), 0L) FROM AiUsageLog l WHERE l.createdAt >= :since AND l.cacheHit = false AND l.feature NOT LIKE 'RECOMMEND%' AND l.feature NOT IN ('ROOM_VIEW', 'TOUR_360_VIEW')")
    Long sumTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(l) FROM AiUsageLog l WHERE l.createdAt >= :since AND l.cacheHit = false AND l.feature NOT LIKE 'RECOMMEND%' AND l.feature NOT IN ('ROOM_VIEW', 'TOUR_360_VIEW')")
    Long countProviderCallsSince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT l.maPhongTro, l.feature, COUNT(l)
            FROM AiUsageLog l
            WHERE l.maPhongTro IN :roomIds
              AND l.feature IN ('RECOMMEND_IMPRESSION', 'RECOMMEND_CLICK', 'ROOM_VIEW', 'TOUR_360_VIEW')
              AND (:since IS NULL OR l.createdAt >= :since)
            GROUP BY l.maPhongTro, l.feature
            """)
    List<Object[]> countRoomTrackingEvents(
            @Param("roomIds") List<String> roomIds,
            @Param("since") LocalDateTime since
    );

    @Query("""
            SELECT l.feature, l.maPhongTro, COUNT(l)
            FROM AiUsageLog l
            WHERE l.feature IN ('AI_SEARCH', 'RECOMMEND_IMPRESSION', 'RECOMMEND_CLICK', 'ROOM_VIEW', 'TOUR_360_VIEW')
              AND (:hasFilter = false OR (
                  l.createdAt IS NOT NULL
                  AND (:year IS NULL OR YEAR(l.createdAt) = :year)
                  AND (:month IS NULL OR MONTH(l.createdAt) = :month)
                  AND (:day IS NULL OR DAY(l.createdAt) = :day)
              ))
            GROUP BY l.feature, l.maPhongTro
            """)
    List<Object[]> aggregateTrackingSummaryForStats(
            @Param("hasFilter") boolean hasFilter,
            @Param("day") Integer day,
            @Param("month") Integer month,
            @Param("year") Integer year
    );
}
