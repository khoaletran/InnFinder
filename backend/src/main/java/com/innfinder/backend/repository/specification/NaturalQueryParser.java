package com.innfinder.backend.repository.specification;

import com.innfinder.backend.dto.room.RoomFilterRequest;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses Vietnamese natural-language queries (price, area, capacity, keywords)
 * into structured {@link RoomFilterRequest} fields without calling external AI APIs.
 */
public final class NaturalQueryParser {

    private static final String PRICE_UNITS = "(?:triệu|trieu|tr|m|k|nghìn|nghin)";
    private static final String AREA_UNITS = "(?:m2|m²|mét vuông|met vuong)";
    private static final String BOUND_END = "(?=\\s|$|[,;.!?])";

    private static final Pattern PRICE_RANGE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:từ|tu)\\s+(\\d+(?:[.,]\\d+)?)\\s*(" + PRICE_UNITS + ")?\\s*(?:đến|den|-|tới|toi)\\s*(\\d+(?:[.,]\\d+)?)\\s*(" + PRICE_UNITS + ")" + BOUND_END);

    private static final Pattern PRICE_MAX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:dưới|duoi|<=|tối đa|toi da|không quá|khong qua)\\s*(\\d+(?:[.,]\\d+)?)\\s*(" + PRICE_UNITS + ")" + BOUND_END);

    private static final Pattern PRICE_MIN_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:trên|tren|>=|từ|tu|tối thiểu|toi thieu)\\s*(\\d+(?:[.,]\\d+)?)\\s*(" + PRICE_UNITS + ")" + BOUND_END);

    private static final Pattern PRICE_APPROX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:tầm|tam|khoảng|khoang)\\s*(\\d+(?:[.,]\\d+)?)\\s*(" + PRICE_UNITS + ")" + BOUND_END);

    private static final Pattern AREA_RANGE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:từ|tu)\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:" + AREA_UNITS + ")?\\s*(?:đến|den|-|tới|toi)\\s*(\\d+(?:[.,]\\d+)?)\\s*" + AREA_UNITS + BOUND_END);

    private static final Pattern AREA_MAX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:dưới|duoi|<=|tối đa|toi da)\\s*(\\d+(?:[.,]\\d+)?)\\s*" + AREA_UNITS + BOUND_END);

    private static final Pattern AREA_MIN_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:trên|tren|>=|từ|tu|tối thiểu|toi thieu)\\s*(\\d+(?:[.,]\\d+)?)\\s*" + AREA_UNITS + BOUND_END);

    private static final Pattern CAPACITY_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:ở|o|cho|tối đa|toi da)?\\s*(\\d{1,2})\\s*(?:người|nguoi)" + BOUND_END);

    private static final Set<String> FILLER_WORDS = Set.of(
            "tìm", "tim", "phòng", "phong", "trọ", "tro", "tại", "tai",
            "ở", "o", "có", "co", "cần", "can", "thuê", "thue", "cho",
            "giá", "gia", "với", "voi", "và", "va", "gần", "gan", "khu", "vực", "vuc"
    );

    private NaturalQueryParser() {
    }

    public static RoomFilterRequest parse(RoomFilterRequest input) {
        RoomFilterRequest copy = copy(input);
        String rawKeyword = copy.getKeyword();
        if (rawKeyword == null || rawKeyword.isBlank()) {
            copy.setKeyword(null);
            return copy;
        }

        String working = " " + rawKeyword.trim() + " ";

        Long parsedMinPrice = null;
        Long parsedMaxPrice = null;

        Matcher priceRange = PRICE_RANGE_PATTERN.matcher(working);
        if (priceRange.find()) {
            String unit2 = priceRange.group(4);
            String unit1 = (priceRange.group(2) != null && !priceRange.group(2).isBlank()) ? priceRange.group(2) : unit2;
            long v1 = toVnd(priceRange.group(1), unit1);
            long v2 = toVnd(priceRange.group(3), unit2);
            parsedMinPrice = Math.min(v1, v2);
            parsedMaxPrice = Math.max(v1, v2);
            working = replaceSpan(working, priceRange.start(), priceRange.end());
        } else {
            Matcher priceMax = PRICE_MAX_PATTERN.matcher(working);
            if (priceMax.find()) {
                parsedMaxPrice = toVnd(priceMax.group(1), priceMax.group(2));
                working = replaceSpan(working, priceMax.start(), priceMax.end());
            }
            Matcher priceMin = PRICE_MIN_PATTERN.matcher(working);
            if (priceMin.find()) {
                parsedMinPrice = toVnd(priceMin.group(1), priceMin.group(2));
                working = replaceSpan(working, priceMin.start(), priceMin.end());
            }
            if (parsedMinPrice == null && parsedMaxPrice == null) {
                Matcher priceApprox = PRICE_APPROX_PATTERN.matcher(working);
                if (priceApprox.find()) {
                    long base = toVnd(priceApprox.group(1), priceApprox.group(2));
                    parsedMinPrice = Math.round(base * 0.8);
                    parsedMaxPrice = Math.round(base * 1.2);
                    working = replaceSpan(working, priceApprox.start(), priceApprox.end());
                }
            }
        }

        Integer parsedMinArea = null;
        Integer parsedMaxArea = null;

        Matcher areaRange = AREA_RANGE_PATTERN.matcher(working);
        if (areaRange.find()) {
            int a1 = toInt(areaRange.group(1));
            int a2 = toInt(areaRange.group(2));
            parsedMinArea = Math.min(a1, a2);
            parsedMaxArea = Math.max(a1, a2);
            working = replaceSpan(working, areaRange.start(), areaRange.end());
        } else {
            Matcher areaMax = AREA_MAX_PATTERN.matcher(working);
            if (areaMax.find()) {
                parsedMaxArea = toInt(areaMax.group(1));
                working = replaceSpan(working, areaMax.start(), areaMax.end());
            }
            Matcher areaMin = AREA_MIN_PATTERN.matcher(working);
            if (areaMin.find()) {
                parsedMinArea = toInt(areaMin.group(1));
                working = replaceSpan(working, areaMin.start(), areaMin.end());
            }
        }

        Integer parsedCapacity = null;
        Matcher capacity = CAPACITY_PATTERN.matcher(working);
        if (capacity.find()) {
            int cap = Integer.parseInt(capacity.group(1));
            if (cap > 0 && cap <= 100) {
                parsedCapacity = cap;
                working = replaceSpan(working, capacity.start(), capacity.end());
            }
        }

        // Only apply parsed criteria when the caller did not specify explicit values
        if (copy.getMinGia() == null && parsedMinPrice != null) {
            copy.setMinGia(parsedMinPrice);
        }
        if (copy.getMaxGia() == null && parsedMaxPrice != null) {
            copy.setMaxGia(parsedMaxPrice);
        }
        if (copy.getMinDienTich() == null && parsedMinArea != null) {
            copy.setMinDienTich(parsedMinArea);
        }
        if (copy.getMaxDienTich() == null && parsedMaxArea != null) {
            copy.setMaxDienTich(parsedMaxArea);
        }
        if (copy.getSoNguoi() == null && parsedCapacity != null) {
            copy.setSoNguoi(parsedCapacity);
        }

        String cleaned = stripFillerWords(working);
        copy.setKeyword(cleaned.isEmpty() ? null : cleaned);
        return copy;
    }

    private static RoomFilterRequest copy(RoomFilterRequest src) {
        RoomFilterRequest target = new RoomFilterRequest();
        if (src == null) return target;
        target.setKeyword(src.getKeyword());
        target.setArea(src.getArea());
        target.setMinGia(src.getMinGia());
        target.setMaxGia(src.getMaxGia());
        target.setMinDienTich(src.getMinDienTich());
        target.setMaxDienTich(src.getMaxDienTich());
        target.setSoNguoi(src.getSoNguoi());
        target.setMinDiemUyTin(src.getMinDiemUyTin());
        target.setMaLpt(src.getMaLpt());
        target.setDsTienIch(src.getDsTienIch());
        target.setPage(src.getPage());
        target.setSize(src.getSize());
        target.setSortBy(src.getSortBy());
        target.setSortDirection(src.getSortDirection());
        return target;
    }

    private static long toVnd(String rawNumber, String rawUnit) {
        double value = Double.parseDouble(rawNumber.replace(',', '.'));
        String unit = rawUnit == null ? "" : rawUnit.toLowerCase(Locale.ROOT);
        if (unit.equals("k") || unit.startsWith("ngh")) {
            return Math.round(value * 1_000d);
        }
        return Math.round(value * 1_000_000d);
    }

    private static int toInt(String rawNumber) {
        return (int) Math.round(Double.parseDouble(rawNumber.replace(',', '.')));
    }

    private static String replaceSpan(String text, int start, int end) {
        return text.substring(0, start) + " " + text.substring(end);
    }

    private static String stripFillerWords(String text) {
        String[] tokens = text.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (token.isBlank()) continue;
            String normalized = token.toLowerCase(Locale.ROOT).replaceAll("^[,;.!?]+|[,;.!?]+$", "");
            if (normalized.isEmpty() || FILLER_WORDS.contains(normalized)) continue;
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(token.replaceAll("^[,;.!?]+|[,;.!?]+$", ""));
        }
        return sb.toString().trim();
    }
}
