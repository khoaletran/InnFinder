package com.innfinder.backend.repository.specification;

import com.innfinder.backend.dto.room.RoomFilterRequest;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses Vietnamese natural-language queries (rent price, utility electricity/water prices,
 * area, capacity, keywords) into structured {@link RoomFilterRequest} fields without calling external AI APIs.
 */
public final class NaturalQueryParser {

    private static final String PRICE_UNITS = "(?:triệu|trieu|tr|m|k|nghìn|nghin)";
    private static final String AREA_UNITS = "(?:m2|m²|mét vuông|met vuong)";
    private static final String BOUND_END = "(?=\\s|$|[,;.!?])";

    // Utility number token: supports 3k5, 3.5k, 3,5k, 3.500, 3500, 100k, 20 nghìn, 4000đ, 4000 vnd, 0đ
    private static final String UTILITY_UNIT = "(?:k(?![a-z])|nghìn|nghin|ngàn|ngan|đồng|dong|vnđ|vnd|đ|d(?![a-z]))";
    private static final String UTILITY_NUMBER = "(\\d+(?:[.,]\\d+)*(?:k\\d+)?)\\s*(?:(" + UTILITY_UNIT + "))?";
    private static final String PER_MONTH_OPT = "(?:\\s*/\\s*(?:tháng|thang))?";
    private static final String UTILITY_UNIT_SUFFIX = "(?:"
            + "(?:\\s*(?:/\\s*)?(?:kwh|kw))"
            + "|(?:\\s*/\\s*(?:số|so|chữ|chu|m3|m³|khối|khoi|đầu\\s+người|dau\\s+nguoi|người|nguoi)" + PER_MONTH_OPT + ")"
            + "|(?:\\s*/\\s*(?:tháng|thang))"
            + "|(?:\\s+(?:tính\\s+|tinh\\s+)?(?:theo\\s+(?:đầu\\s+người|dau\\s+nguoi|người|nguoi|số\\s+khối|so\\s+khoi|khối|khoi|m3|m³|đồng\\s+hồ|dong\\s+ho)|đầu\\s+người|dau\\s+nguoi|giá\\s+cố\\s+định|gia\\s+co\\s+dinh|trọn\\s+gói|tron\\s+goi)" + PER_MONTH_OPT + ")"
            + ")?";

    private static final String WATER_MODE_PHRASE = "(?:\\s+(?:tính\\s+|tinh\\s+)?(?:(?:theo\\s+(?:đầu\\s+người|dau\\s+nguoi|người|nguoi|số\\s+khối|so\\s+khoi|khối|khoi|m3|m³|đồng\\s+hồ|dong\\s+ho))|đầu\\s+người|dau\\s+nguoi|giá\\s+cố\\s+định|gia\\s+co\\s+dinh|trọn\\s+gói|tron\\s+goi))?";
    private static final String ELECTRICITY_LABEL = "(?:giá\\s+|gia\\s+|tiền\\s+|tien\\s+)?(?:điện|dien)";
    private static final String WATER_LABEL = "(?:giá\\s+|gia\\s+|tiền\\s+|tien\\s+)?(?:nước|nuoc)" + WATER_MODE_PHRASE;
    private static final String NEGOTIABLE_PHRASE = "(?:thỏa\\s+thuận|thoa\\s+thuan|miễn\\s+phí|mien\\s+phi|free)";

    private static final Pattern BOTH_UTILITIES_NEGOTIABLE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:giá\\s+|gia\\s+|tiền\\s+|tien\\s+)?(?:điện|dien)(?:\\s*(?:và|va|&|/|,)\\s*|\\s+)(?:nước|nuoc)\\s+"
                    + NEGOTIABLE_PHRASE + BOUND_END);
    private static final Pattern ELECTRICITY_NEGOTIABLE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + "\\s+" + NEGOTIABLE_PHRASE + BOUND_END);
    private static final Pattern WATER_NEGOTIABLE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + "\\s+" + NEGOTIABLE_PHRASE + UTILITY_UNIT_SUFFIX + BOUND_END);

    private static final String LABEL_OP_SEP = "(?:\\s+|(?=[<>=]))";
    private static final String RANGE_OP = "(?:đến|den|-|–|tới|toi)";
    private static final String MAX_OP = "(?:<=|<|dưới|duoi|thấp\\s+hơn|thap\\s+hon|rẻ\\s+hơn|re\\s+hon|tối\\s+đa|toi\\s+da|không\\s+quá|khong\\s+qua|không\\s+hơn|khong\\s+hon)";
    private static final String MIN_OP = "(?:>=|>|trên|tren|cao\\s+hơn|cao\\s+hon|lớn\\s+hơn|lon\\s+hon|nhiều\\s+hơn|nhieu\\s+hơn|từ|tu|tối\\s+thiểu|toi\\s+thieu|ít\\s+nhất|it\\s+nhat)";
    private static final String APPROX_OP = "(?:tầm|tam|khoảng|khoang)";
    private static final String EXACT_OP = "(?:đúng|dung|chính\\s+xác|chinh\\s+xac|bằng|bang|=|là|la|mức|muc|giá|gia)";

    private static final Pattern ELECTRICITY_RANGE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + "\\s+(?:từ\\s+|tu\\s+)?" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX
                    + "\\s*" + RANGE_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern ELECTRICITY_MAX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + LABEL_OP_SEP + MAX_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern ELECTRICITY_MIN_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + LABEL_OP_SEP + MIN_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern ELECTRICITY_APPROX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + "\\s+" + APPROX_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern ELECTRICITY_EXACT_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + ELECTRICITY_LABEL + "(?:\\s+(?:" + EXACT_OP + "\\s*)?|(?==)\\s*=\\s*)" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);

    private static final Pattern WATER_RANGE_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + "\\s+(?:từ\\s+|tu\\s+)?" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX
                    + "\\s*" + RANGE_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern WATER_MAX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + LABEL_OP_SEP + MAX_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern WATER_MIN_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + LABEL_OP_SEP + MIN_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern WATER_APPROX_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + "\\s+" + APPROX_OP + "\\s*" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);
    private static final Pattern WATER_EXACT_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)" + WATER_LABEL + "(?:\\s+(?:" + EXACT_OP + "\\s*)?|(?==)\\s*=\\s*)" + UTILITY_NUMBER + UTILITY_UNIT_SUFFIX + BOUND_END);

    private static final Pattern WATER_BY_PERSON_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:(?:giá\\s+|gia\\s+|tiền\\s+|tien\\s+)?(?:nước|nuoc)\\s+(?:tính\\s+|tinh\\s+)?(?:theo\\s+(?:đầu\\s+người|dau\\s+nguoi|người|nguoi)|đầu\\s+người|dau\\s+nguoi|mỗi\\s+người|moi\\s+nguoi)|tính\\s+nước\\s+theo\\s+(?:đầu\\s+)?người|tinh\\s+nuoc\\s+theo\\s+(?:dau\\s+)?nguoi)" + BOUND_END);
    private static final Pattern WATER_BY_METER_PATTERN = Pattern.compile(
            "(?iu)(?:^|\\s)(?:(?:giá\\s+|gia\\s+|tiền\\s+|tien\\s+)?(?:nước|nuoc)\\s+(?:tính\\s+|tinh\\s+)?(?:theo\\s+(?:số\\s+khối|so\\s+khoi|khối|khoi|m3|m³|đồng\\s+hồ|dong\\s+ho)|giá\\s+cố\\s+định|gia\\s+co\\s+dinh|trọn\\s+gói|tron\\s+goi)|tính\\s+nước\\s+theo\\s+(?:số\\s+)?khối|tinh\\s+nuoc\\s+theo\\s+(?:so\\s+)?khoi)" + BOUND_END);

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

    private record UtilityParseResult(Long min, Long max, Boolean waterByPerson, String remaining) {}

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

        Long parsedMinElec = null;
        Long parsedMaxElec = null;
        Long parsedMinWater = null;
        Long parsedMaxWater = null;
        Boolean parsedWaterByPerson = null;

        // 1. Parse negotiable/free utility expressions first (e.g. "điện thỏa thuận", "điện nước thỏa thuận")
        Matcher bothNeg = BOTH_UTILITIES_NEGOTIABLE_PATTERN.matcher(working);
        if (bothNeg.find()) {
            parsedMinElec = 0L;
            parsedMaxElec = 0L;
            parsedMinWater = 0L;
            parsedMaxWater = 0L;
            working = replaceSpan(working, bothNeg.start(), bothNeg.end());
        } else {
            Matcher elecNeg = ELECTRICITY_NEGOTIABLE_PATTERN.matcher(working);
            if (elecNeg.find()) {
                parsedMinElec = 0L;
                parsedMaxElec = 0L;
                working = replaceSpan(working, elecNeg.start(), elecNeg.end());
            }
            Matcher waterNeg = WATER_NEGOTIABLE_PATTERN.matcher(working);
            if (waterNeg.find()) {
                parsedMinWater = 0L;
                parsedMaxWater = 0L;
                parsedWaterByPerson = inferWaterModeFromSpan(waterNeg.group(0));
                working = replaceSpan(working, waterNeg.start(), waterNeg.end());
            }
        }

        // 2. Parse numeric electricity and water criteria before room rent so 3.5k / 100k never collides with rent bounds.
        if (parsedMinElec == null && parsedMaxElec == null) {
            UtilityParseResult electricityParsed = parseUtilityCriteria(
                    working,
                    ELECTRICITY_RANGE_PATTERN,
                    ELECTRICITY_MAX_PATTERN,
                    ELECTRICITY_MIN_PATTERN,
                    ELECTRICITY_APPROX_PATTERN,
                    ELECTRICITY_EXACT_PATTERN,
                    false);
            parsedMinElec = electricityParsed.min();
            parsedMaxElec = electricityParsed.max();
            working = electricityParsed.remaining();
        }

        if (parsedMinWater == null && parsedMaxWater == null) {
            UtilityParseResult waterParsed = parseUtilityCriteria(
                    working,
                    WATER_RANGE_PATTERN,
                    WATER_MAX_PATTERN,
                    WATER_MIN_PATTERN,
                    WATER_APPROX_PATTERN,
                    WATER_EXACT_PATTERN,
                    true);
            parsedMinWater = waterParsed.min();
            parsedMaxWater = waterParsed.max();
            if (parsedWaterByPerson == null) {
                parsedWaterByPerson = waterParsed.waterByPerson();
            }
            working = waterParsed.remaining();
        }

        if (parsedWaterByPerson == null) {
            Matcher byPerson = WATER_BY_PERSON_PATTERN.matcher(working);
            if (byPerson.find()) {
                parsedWaterByPerson = true;
                working = replaceSpan(working, byPerson.start(), byPerson.end());
            } else {
                Matcher byMeter = WATER_BY_METER_PATTERN.matcher(working);
                if (byMeter.find()) {
                    parsedWaterByPerson = false;
                    working = replaceSpan(working, byMeter.start(), byMeter.end());
                }
            }
        }

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
        if (copy.getMinGiaDien() == null && parsedMinElec != null) {
            copy.setMinGiaDien(parsedMinElec);
        }
        if (copy.getMaxGiaDien() == null && parsedMaxElec != null) {
            copy.setMaxGiaDien(parsedMaxElec);
        }
        if (copy.getMinGiaNuoc() == null && parsedMinWater != null) {
            copy.setMinGiaNuoc(parsedMinWater);
        }
        if (copy.getMaxGiaNuoc() == null && parsedMaxWater != null) {
            copy.setMaxGiaNuoc(parsedMaxWater);
        }
        if (copy.getNuocTheoNguoi() == null && parsedWaterByPerson != null) {
            copy.setNuocTheoNguoi(parsedWaterByPerson);
        }
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

    private static UtilityParseResult parseUtilityCriteria(
            String working,
            Pattern rangePattern,
            Pattern maxPattern,
            Pattern minPattern,
            Pattern approxPattern,
            Pattern exactPattern,
            boolean detectWaterMode) {
        Matcher range = rangePattern.matcher(working);
        if (range.find()) {
            String unit2 = range.group(4);
            String unit1 = (range.group(2) != null && !range.group(2).isBlank()) ? range.group(2) : unit2;
            Long v1 = toUtilityVnd(range.group(1), unit1);
            Long v2 = toUtilityVnd(range.group(3), unit2);
            if (v1 != null && v2 != null) {
                Boolean waterMode = detectWaterMode ? inferWaterModeFromSpan(range.group(0)) : null;
                return new UtilityParseResult(
                        Math.min(v1, v2),
                        Math.max(v1, v2),
                        waterMode,
                        replaceSpan(working, range.start(), range.end()));
            }
        }

        Matcher maxM = maxPattern.matcher(working);
        if (maxM.find()) {
            Long v = toUtilityVnd(maxM.group(1), maxM.group(2));
            if (v != null) {
                Boolean waterMode = detectWaterMode ? inferWaterModeFromSpan(maxM.group(0)) : null;
                return new UtilityParseResult(
                        null,
                        v,
                        waterMode,
                        replaceSpan(working, maxM.start(), maxM.end()));
            }
        }

        Matcher minM = minPattern.matcher(working);
        if (minM.find()) {
            Long v = toUtilityVnd(minM.group(1), minM.group(2));
            if (v != null) {
                Boolean waterMode = detectWaterMode ? inferWaterModeFromSpan(minM.group(0)) : null;
                return new UtilityParseResult(
                        v,
                        null,
                        waterMode,
                        replaceSpan(working, minM.start(), minM.end()));
            }
        }

        Matcher approxM = approxPattern.matcher(working);
        if (approxM.find()) {
            Long v = toUtilityVnd(approxM.group(1), approxM.group(2));
            if (v != null) {
                Boolean waterMode = detectWaterMode ? inferWaterModeFromSpan(approxM.group(0)) : null;
                return new UtilityParseResult(
                        Math.round(v * 0.85),
                        Math.round(v * 1.15),
                        waterMode,
                        replaceSpan(working, approxM.start(), approxM.end()));
            }
        }

        Matcher exactM = exactPattern.matcher(working);
        if (exactM.find()) {
            Long v = toUtilityVnd(exactM.group(1), exactM.group(2));
            if (v != null) {
                Boolean waterMode = detectWaterMode ? inferWaterModeFromSpan(exactM.group(0)) : null;
                return new UtilityParseResult(
                        v,
                        v,
                        waterMode,
                        replaceSpan(working, exactM.start(), exactM.end()));
            }
        }

        return new UtilityParseResult(null, null, null, working);
    }

    private static Boolean inferWaterModeFromSpan(String span) {
        if (span == null || span.isBlank()) return null;
        String lower = span.toLowerCase(Locale.ROOT);
        if (lower.matches("(?is).*(?:/\\s*(?:đầu\\s+người|dau\\s+nguoi|người|nguoi)|theo\\s+(?:đầu\\s+)?người|theo\\s+(?:dau\\s+)?nguoi|đầu\\s+người|dau\\s+nguoi).*")) {
            return Boolean.TRUE;
        }
        if (lower.matches("(?is).*(?:/\\s*(?:m3|m³|khối|khoi)|theo\\s+(?:số\\s+)?khối|theo\\s+(?:so\\s+)?khoi|theo\\s+(?:m3|m³|đồng\\s+hồ|dong\\s+ho)|giá\\s+cố\\s+định|gia\\s+co\\s+dinh|trọn\\s+gói|tron\\s+goi).*")) {
            return Boolean.FALSE;
        }
        return null;
    }

    private static Long toUtilityVnd(String rawNumber, String rawUnit) {
        if (rawNumber == null || rawNumber.isBlank()) return null;
        String lowerNum = rawNumber.trim().toLowerCase(Locale.ROOT);
        String unit = rawUnit == null ? "" : rawUnit.trim().toLowerCase(Locale.ROOT);

        // Pattern like "3k5" or "3k500"
        if (lowerNum.contains("k")) {
            String[] parts = lowerNum.split("k", 2);
            if (parts.length == 2 && !parts[0].isBlank() && !parts[1].isBlank()) {
                double val = Double.parseDouble(parts[0] + "." + parts[1]);
                return Math.round(val * 1_000d);
            }
            return null;
        }

        // Pattern like "3.500", "20.000", "100.000" (dot/comma thousands grouping)
        if (lowerNum.matches("\\d{1,3}(?:[.,]\\d{3})+")) {
            long digits = Long.parseLong(lowerNum.replaceAll("[.,]", ""));
            if (unit.equals("k") || unit.startsWith("ngh") || unit.startsWith("nga")) {
                return digits * 1_000L;
            }
            return digits;
        }

        double value = Double.parseDouble(lowerNum.replace(',', '.'));
        if (value == 0d) {
            return 0L;
        }
        if (unit.equals("k") || unit.startsWith("ngh") || unit.startsWith("nga")) {
            return Math.round(value * 1_000d);
        }
        // Guard against stray small positive integers without currency/thousand unit (e.g. "điện 3 pha")
        if (unit.isEmpty() && value > 0 && value < 100) {
            return null;
        }
        return Math.round(value);
    }

    private static RoomFilterRequest copy(RoomFilterRequest src) {
        RoomFilterRequest target = new RoomFilterRequest();
        if (src == null) return target;
        target.setKeyword(src.getKeyword());
        target.setArea(src.getArea());
        target.setMinGia(src.getMinGia());
        target.setMaxGia(src.getMaxGia());
        target.setMinGiaDien(src.getMinGiaDien());
        target.setMaxGiaDien(src.getMaxGiaDien());
        target.setMinGiaNuoc(src.getMinGiaNuoc());
        target.setMaxGiaNuoc(src.getMaxGiaNuoc());
        target.setNuocTheoNguoi(src.getNuocTheoNguoi());
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
