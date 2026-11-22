package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.room.*;
import com.innfinder.backend.entity.PhongTroVector;
import com.innfinder.backend.repository.PhongTroVectorRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiSearchServiceTest {
    @Test void legacyVectorsAreNotComparedAndNewlyApprovedRoomsRemainDiscoverable() {
        RoomDiscoveryService discovery = mock(RoomDiscoveryService.class);
        PhongTroVectorRepository repository = mock(PhongTroVectorRepository.class);
        AiEmbeddingService embedding = mock(AiEmbeddingService.class);
        GeminiClient client = mock(GeminiClient.class);
        String id = "PT191126150001";
        var room = new RoomDiscoveryService.Document(RoomSummaryResponse.builder().maPhongTro(id).giaThue(2000000L).build(), null, "phòng máy lạnh");
        when(discovery.find(any())).thenReturn(List.of(room));
        when(repository.findAllById(any())).thenReturn(List.of(PhongTroVector.builder().maPhongTro(id).contentHash("legacy-fallback-hash").embeddingJson("[]").build()));
        AiSearchService service = new AiSearchService(discovery, repository, embedding, client, new ObjectMapper());
        var result = service.search("máy lạnh", new RoomFilterRequest(), 6, null);
        assertEquals("FILTERED", result.mode());
        assertEquals(id, result.rooms().get(0).summary().getMaPhongTro());
        verifyNoInteractions(embedding);
    }
}
