package com.innfinder.backend.service;

import com.innfinder.backend.dto.chat.SearchCriteria;
import com.innfinder.backend.dto.room.AmenityResponse;
import com.innfinder.backend.dto.room.CategoryResponse;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.repository.specification.NaturalQueryParser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministically enriches AI-parsed {@link SearchCriteria} from the user's current prompt
 * using live room categories, amenities, and Vietnamese price/area/capacity expressions.
 */
final class ChatCriteriaEnricher {

    private static final long CHEAP_MAX_PRICE_VND = 4_000_000L;
    private static final Pattern STANDALONE_AREA_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s*(?:m2|m²|met vuong)(?=\\s|$|[,;.!?])");

    private static final Map<String, List<String>> CATEGORY_ALIASES = Map.of(
            "ky tuc xa", List.of("ky tuc xa", "ki tuc xa", "ktx", "dorm"),
            "sleepbox", List.of("sleepbox", "sleep box", "hop ngu"),
            "chung cu mini", List.of("chung cu mini", "ccmn", "can ho mini"),
            "studio", List.of("studio", "can ho studio"),
            "khep kin", List.of("phong tro khep kin", "khep kin"),
            "nguyen can", List.of("nha nguyen can", "nguyen can"),
            "o ghep", List.of("o ghep", "tim ban o ghep"));

    private static final List<List<String>> AMENITY_SYNONYM_GROUPS = List.of(
            List.of("may lanh", "dieu hoa"),
            List.of("wifi", "wi fi", "mang", "internet"),
            List.of("gac lung", "co gac", "gac xep"),
            List.of("ve sinh rieng", "wc rieng", "toilet rieng", "nha ve sinh rieng"),
            List.of("thu cung", "pet", "nuoi cho", "nuoi meo"),
            List.of("bai xe", "gui xe", "de xe", "cho de xe", "nha xe"),
            List.of("may giat", "giat do"),
            List.of("tu lanh"),
            List.of("ban cong", "cua so thoang"),
            List.of("thang may"),
            List.of("nha bep", "ke bep", "bep rieng", "nau an"),
            List.of("noi that", "full noi that", "tu quan ao", "giuong nem"),
            List.of("nong lanh", "binh nong lanh", "may nuoc nong"),
            List.of("bao ve", "an ninh", "camera", "khoa van tay"));

    private ChatCriteriaEnricher() {
    }

    static SearchCriteria enrich(
            String message,
            SearchCriteria base,
            List<CategoryResponse> roomTypes,
            List<AmenityResponse> amenities) {
        if (message == null || message.isBlank()) {
            return base;
        }
        String normalized = normalizePhrase(message);

        RoomFilterRequest parsedInput = new RoomFilterRequest();
        parsedInput.setKeyword(message);
        RoomFilterRequest parsed = NaturalQueryParser.parse(parsedInput);

        Long parsedMinPrice = parsed.getMinGia();
        Long parsedMaxPrice = parsed.getMaxGia();
        Long parsedMinElectricity = parsed.getMinGiaDien();
        Long parsedMaxElectricity = parsed.getMaxGiaDien();
        Long parsedMinWater = parsed.getMinGiaNuoc();
        Long parsedMaxWater = parsed.getMaxGiaNuoc();
        Boolean parsedWaterByPerson = parsed.getNuocTheoNguoi();
        Integer parsedMinArea = parsed.getMinDienTich();
        Integer parsedMaxArea = parsed.getMaxDienTich();
        Integer parsedCapacity = parsed.getSoNguoi();

        if (parsedMinArea == null && parsedMaxArea == null) {
            Matcher standaloneArea = STANDALONE_AREA_PATTERN.matcher(normalized);
            if (standaloneArea.find()) {
                parsedMinArea = (int) Math.round(Double.parseDouble(standaloneArea.group(1).replace(',', '.')));
            }
        }

        boolean mentionsCheap = containsWordOrPhrase(normalized, "gia re")
                || containsWordOrPhrase(normalized, "phong re")
                || containsWordOrPhrase(normalized, "tro re");
        if (parsedMinPrice == null && parsedMaxPrice == null && mentionsCheap) {
            parsedMaxPrice = CHEAP_MAX_PRICE_VND;
        }

        String matchedUtilitySort = matchUtilitySort(normalized);
        String matchedCategory = matchCategoryId(normalized, roomTypes);
        List<String> matchedAmenities = matchAmenityIds(normalized, amenities);

        boolean hasParsedElec = parsedMinElectricity != null || parsedMaxElectricity != null;
        boolean hasParsedWater = parsedMinWater != null || parsedMaxWater != null;

        boolean foundAnyParsed = parsedMinPrice != null || parsedMaxPrice != null
                || hasParsedElec || hasParsedWater || parsedWaterByPerson != null
                || matchedUtilitySort != null
                || parsedMinArea != null || parsedMaxArea != null || parsedCapacity != null
                || matchedCategory != null || !matchedAmenities.isEmpty();
        if (base == null && !foundAnyParsed) {
            return null;
        }

        String location = base == null ? null : base.location();
        Long minPrice = parsedMinPrice != null ? parsedMinPrice : (base == null ? null : base.minPrice());
        Long maxPrice = parsedMaxPrice != null ? parsedMaxPrice : (base == null ? null : base.maxPrice());
        Long minElectricityPrice = hasParsedElec
                ? parsedMinElectricity
                : (base == null ? null : base.minElectricityPrice());
        Long maxElectricityPrice = hasParsedElec
                ? parsedMaxElectricity
                : (base == null ? null : base.maxElectricityPrice());
        Long minWaterPrice = hasParsedWater
                ? parsedMinWater
                : (base == null ? null : base.minWaterPrice());
        Long maxWaterPrice = hasParsedWater
                ? parsedMaxWater
                : (base == null ? null : base.maxWaterPrice());
        Boolean waterByPerson = parsedWaterByPerson != null
                ? parsedWaterByPerson
                : (base == null ? null : base.waterByPerson());
        Integer minArea = parsedMinArea != null ? parsedMinArea : (base == null ? null : base.minArea());
        Integer maxArea = parsedMaxArea != null ? parsedMaxArea : (base == null ? null : base.maxArea());
        Integer capacity = parsedCapacity != null ? parsedCapacity : (base == null ? null : base.capacity());

        String categoryId = matchedCategory != null ? matchedCategory : (base == null ? null : base.categoryId());

        LinkedHashSet<String> mergedAmenities = new LinkedHashSet<>();
        if (base != null && base.amenityIds() != null) {
            mergedAmenities.addAll(base.amenityIds());
        }
        mergedAmenities.addAll(matchedAmenities);

        String sort = matchedUtilitySort != null
                ? matchedUtilitySort
                : (base != null ? base.sort() : (mentionsCheap ? "PRICE_ASC" : "RELEVANCE"));
        if (mentionsCheap && (sort == null || "RELEVANCE".equals(sort))) {
            sort = "PRICE_ASC";
        }

        return new SearchCriteria(
                location,
                minPrice,
                maxPrice,
                minElectricityPrice,
                maxElectricityPrice,
                minWaterPrice,
                maxWaterPrice,
                waterByPerson,
                minArea,
                maxArea,
                capacity,
                categoryId,
                new ArrayList<>(mergedAmenities),
                sort);
    }

    private static String matchUtilitySort(String normalizedMsg) {
        if (containsWordOrPhrase(normalizedMsg, "gia dien tang")
                || containsWordOrPhrase(normalizedMsg, "dien tang")
                || containsWordOrPhrase(normalizedMsg, "dien re nhat")
                || containsWordOrPhrase(normalizedMsg, "gia dien thap nhat")
                || containsWordOrPhrase(normalizedMsg, "dien thap nhat")) {
            return "ELECTRICITY_ASC";
        }
        if (containsWordOrPhrase(normalizedMsg, "gia dien giam")
                || containsWordOrPhrase(normalizedMsg, "dien giam")
                || containsWordOrPhrase(normalizedMsg, "dien cao nhat")
                || containsWordOrPhrase(normalizedMsg, "gia dien cao nhat")
                || containsWordOrPhrase(normalizedMsg, "dien dat nhat")) {
            return "ELECTRICITY_DESC";
        }
        if (containsWordOrPhrase(normalizedMsg, "gia nuoc tang")
                || containsWordOrPhrase(normalizedMsg, "nuoc tang")
                || containsWordOrPhrase(normalizedMsg, "nuoc re nhat")
                || containsWordOrPhrase(normalizedMsg, "gia nuoc thap nhat")
                || containsWordOrPhrase(normalizedMsg, "nuoc thap nhat")) {
            return "WATER_ASC";
        }
        if (containsWordOrPhrase(normalizedMsg, "gia nuoc giam")
                || containsWordOrPhrase(normalizedMsg, "nuoc giam")
                || containsWordOrPhrase(normalizedMsg, "nuoc cao nhat")
                || containsWordOrPhrase(normalizedMsg, "gia nuoc cao nhat")
                || containsWordOrPhrase(normalizedMsg, "nuoc dat nhat")) {
            return "WATER_DESC";
        }
        return null;
    }

    private static String matchCategoryId(String normalizedMsg, List<CategoryResponse> roomTypes) {
        if (roomTypes == null || roomTypes.isEmpty()) return null;

        String bestId = null;
        int bestMatchLength = 0;

        for (CategoryResponse cat : roomTypes) {
            if (cat == null || cat.getMaLpt() == null || cat.getTenLoaiPhongTro() == null) continue;
            String normName = normalizePhrase(cat.getTenLoaiPhongTro());
            if (normName.isBlank()) continue;

            LinkedHashSet<String> candidates = new LinkedHashSet<>();
            candidates.add(normName);
            for (String segment : normName.split("[/,\\-()]+")) {
                String clean = segment.trim();
                if (clean.length() >= 3) candidates.add(clean);
            }
            for (Map.Entry<String, List<String>> entry : CATEGORY_ALIASES.entrySet()) {
                if (normName.contains(entry.getKey())) {
                    candidates.addAll(entry.getValue());
                }
            }

            List<String> sortedCandidates = candidates.stream()
                    .sorted(Comparator.comparingInt(String::length).reversed())
                    .toList();
            for (String phrase : sortedCandidates) {
                if (containsWordOrPhrase(normalizedMsg, phrase) && phrase.length() > bestMatchLength) {
                    bestMatchLength = phrase.length();
                    bestId = cat.getMaLpt();
                    break;
                }
            }
        }
        return bestId;
    }

    private static List<String> matchAmenityIds(String normalizedMsg, List<AmenityResponse> amenities) {
        if (amenities == null || amenities.isEmpty()) return List.of();
        List<String> matched = new ArrayList<>();

        for (AmenityResponse am : amenities) {
            if (am == null || am.getMaTienIch() == null || am.getTenTienIch() == null) continue;
            String normName = normalizePhrase(am.getTenTienIch());
            if (normName.isBlank()) continue;

            LinkedHashSet<String> phrases = new LinkedHashSet<>();
            phrases.add(normName);
            for (String segment : normName.split("[/,\\-()]+")) {
                String clean = segment.trim();
                if (clean.length() >= 3) phrases.add(clean);
            }
            for (List<String> group : AMENITY_SYNONYM_GROUPS) {
                boolean nameInGroup = group.stream().anyMatch(term -> normName.contains(term) || term.contains(normName));
                if (nameInGroup) {
                    phrases.addAll(group);
                }
            }

            if (phrases.stream().anyMatch(phrase -> containsWordOrPhrase(normalizedMsg, phrase))) {
                matched.add(am.getMaTienIch());
            }
        }
        return matched;
    }

    private static boolean containsWordOrPhrase(String haystack, String needle) {
        if (needle == null || needle.isBlank()) return false;
        String paddedHaystack = " " + haystack + " ";
        String paddedNeedle = " " + needle.trim() + " ";
        return paddedHaystack.contains(paddedNeedle);
    }

    private static String normalizePhrase(String value) {
        return AiSearchService.normalize(value)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
