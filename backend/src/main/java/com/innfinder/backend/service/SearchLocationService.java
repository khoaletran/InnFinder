package com.innfinder.backend.service;

import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.specification.PhongTroSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SearchLocationService {
    private final PhongTroRepository repository;

    public record Bounds(double south, double west, double north, double east) {}
    public record Location(String name, double lat, double lng, Bounds bounds) {}

    @Transactional(readOnly = true)
    public List<Location> suggest(String query) {
        String normalized = normalize(query);
        if (normalized.length() < 2) return List.of();
        return locations().stream()
                .filter(location -> normalize(location.name()).contains(normalized))
                .limit(8).toList();
    }

    @Transactional(readOnly = true)
    public Optional<String> recognize(String prompt) {
        String text = " " + normalize(prompt) + " ";
        return locations().stream().map(Location::name)
                .filter(name -> text.contains(" " + normalize(name) + " "))
                .max(Comparator.comparingInt(String::length));
    }

    private List<Location> locations() {
        Map<String, List<SearchCoordinates>> locations = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (var room : repository.findAll(PhongTroSpecification.buildFilter(null))) {
            var position = SearchCoordinates.of(room);
            if (position == null || room.getDiaChi() == null) continue;
            String[] parts = room.getDiaChi().split(",");
            for (int i = parts.length > 1 ? 1 : 0; i < parts.length; i++) {
                String name = parts[i].strip();
                if (name.length() < 2 || name.matches("^\\d.*")) continue;
                locations.computeIfAbsent(name, ignored -> new ArrayList<>()).add(position);
            }
        }
        return locations.entrySet().stream().map(entry -> {
            var points = entry.getValue();
            double south = points.stream().mapToDouble(SearchCoordinates::lat).min().orElseThrow();
            double north = points.stream().mapToDouble(SearchCoordinates::lat).max().orElseThrow();
            double west = points.stream().mapToDouble(SearchCoordinates::lng).min().orElseThrow();
            double east = points.stream().mapToDouble(SearchCoordinates::lng).max().orElseThrow();
            return new Location(entry.getKey(), (south + north) / 2, (west + east) / 2,
                    new Bounds(south, west, north, east));
        }).toList();
    }

    public static String normalize(String text) {
        return Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd')
                .replaceAll("[^a-z0-9]+", " ").strip();
    }
}
