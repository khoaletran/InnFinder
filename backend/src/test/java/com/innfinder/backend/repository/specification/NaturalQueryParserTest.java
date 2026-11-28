package com.innfinder.backend.repository.specification;

import com.innfinder.backend.dto.room.RoomFilterRequest;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class NaturalQueryParserTest {

    @Test
    void parsesElectricityLowerHigherRangeApproxAndExact() {
        RoomFilterRequest under = new RoomFilterRequest();
        under.setKeyword("phòng điện dưới 3.5k");
        RoomFilterRequest parsedUnder = NaturalQueryParser.parse(under);
        assertNull(parsedUnder.getMinGiaDien());
        assertEquals(3_500L, parsedUnder.getMaxGiaDien());
        assertNull(parsedUnder.getMaxGia());

        RoomFilterRequest higher = new RoomFilterRequest();
        higher.setKeyword("giá điện cao hơn 4000đ/kwh");
        RoomFilterRequest parsedHigher = NaturalQueryParser.parse(higher);
        assertEquals(4_000L, parsedHigher.getMinGiaDien());
        assertNull(parsedHigher.getMaxGiaDien());

        RoomFilterRequest range = new RoomFilterRequest();
        range.setKeyword("điện từ 3.000 đến 3.800đ");
        RoomFilterRequest parsedRange = NaturalQueryParser.parse(range);
        assertEquals(3_000L, parsedRange.getMinGiaDien());
        assertEquals(3_800L, parsedRange.getMaxGiaDien());

        RoomFilterRequest exact = new RoomFilterRequest();
        exact.setKeyword("điện 3k5");
        RoomFilterRequest parsedExact = NaturalQueryParser.parse(exact);
        assertEquals(3_500L, parsedExact.getMinGiaDien());
        assertEquals(3_500L, parsedExact.getMaxGiaDien());

        RoomFilterRequest exactKwh = new RoomFilterRequest();
        exactKwh.setKeyword("giá điện chính xác 4000 kwh");
        RoomFilterRequest parsedExactKwh = NaturalQueryParser.parse(exactKwh);
        assertEquals(4_000L, parsedExactKwh.getMinGiaDien());
        assertEquals(4_000L, parsedExactKwh.getMaxGiaDien());
    }

    @Test
    void parsesWaterModesAndBounds() {
        RoomFilterRequest byPersonExact = new RoomFilterRequest();
        byPersonExact.setKeyword("nước 100k/người");
        RoomFilterRequest parsedByPersonExact = NaturalQueryParser.parse(byPersonExact);
        assertEquals(100_000L, parsedByPersonExact.getMinGiaNuoc());
        assertEquals(100_000L, parsedByPersonExact.getMaxGiaNuoc());
        assertEquals(Boolean.TRUE, parsedByPersonExact.getNuocTheoNguoi());

        RoomFilterRequest byPersonUnder = new RoomFilterRequest();
        byPersonUnder.setKeyword("nước theo đầu người dưới 120k");
        RoomFilterRequest parsedByPersonUnder = NaturalQueryParser.parse(byPersonUnder);
        assertNull(parsedByPersonUnder.getMinGiaNuoc());
        assertEquals(120_000L, parsedByPersonUnder.getMaxGiaNuoc());
        assertEquals(Boolean.TRUE, parsedByPersonUnder.getNuocTheoNguoi());

        RoomFilterRequest byMeterRange = new RoomFilterRequest();
        byMeterRange.setKeyword("giá nước từ 15k đến 25k/m3");
        RoomFilterRequest parsedByMeterRange = NaturalQueryParser.parse(byMeterRange);
        assertEquals(15_000L, parsedByMeterRange.getMinGiaNuoc());
        assertEquals(25_000L, parsedByMeterRange.getMaxGiaNuoc());
        assertEquals(Boolean.FALSE, parsedByMeterRange.getNuocTheoNguoi());

        RoomFilterRequest modeOnly = new RoomFilterRequest();
        modeOnly.setKeyword("phòng ở Gò Vấp nước theo khối");
        RoomFilterRequest parsedModeOnly = NaturalQueryParser.parse(modeOnly);
        assertEquals(Boolean.FALSE, parsedModeOnly.getNuocTheoNguoi());
        assertEquals("Gò Vấp", parsedModeOnly.getKeyword());
    }

    @Test
    void combinesRentUtilitiesAndLocationCleanly() {
        RoomFilterRequest req = new RoomFilterRequest();
        req.setKeyword("phòng Gò Vấp dưới 3.5tr điện dưới 3.5k nước 100k/người");
        RoomFilterRequest parsed = NaturalQueryParser.parse(req);
        assertEquals(3_500_000L, parsed.getMaxGia());
        assertEquals(3_500L, parsed.getMaxGiaDien());
        assertEquals(100_000L, parsed.getMinGiaNuoc());
        assertEquals(100_000L, parsed.getMaxGiaNuoc());
        assertEquals(Boolean.TRUE, parsed.getNuocTheoNguoi());
        assertEquals("Gò Vấp", parsed.getKeyword());
    }

    @Test
    void parsesNegotiableZeroAndTrailingWaterModeQueries() {
        RoomFilterRequest elecNeg = new RoomFilterRequest();
        elecNeg.setKeyword("điện thỏa thuận");
        RoomFilterRequest parsedElecNeg = NaturalQueryParser.parse(elecNeg);
        assertEquals(0L, parsedElecNeg.getMinGiaDien());
        assertEquals(0L, parsedElecNeg.getMaxGiaDien());
        assertNull(parsedElecNeg.getKeyword());

        RoomFilterRequest waterNeg = new RoomFilterRequest();
        waterNeg.setKeyword("nước miễn phí");
        RoomFilterRequest parsedWaterNeg = NaturalQueryParser.parse(waterNeg);
        assertEquals(0L, parsedWaterNeg.getMinGiaNuoc());
        assertEquals(0L, parsedWaterNeg.getMaxGiaNuoc());
        assertNull(parsedWaterNeg.getKeyword());

        RoomFilterRequest bothNeg = new RoomFilterRequest();
        bothNeg.setKeyword("điện nước thỏa thuận");
        RoomFilterRequest parsedBothNeg = NaturalQueryParser.parse(bothNeg);
        assertEquals(0L, parsedBothNeg.getMinGiaDien());
        assertEquals(0L, parsedBothNeg.getMaxGiaDien());
        assertEquals(0L, parsedBothNeg.getMinGiaNuoc());
        assertEquals(0L, parsedBothNeg.getMaxGiaNuoc());
        assertNull(parsedBothNeg.getKeyword());

        RoomFilterRequest zeroElec = new RoomFilterRequest();
        zeroElec.setKeyword("điện 0đ");
        RoomFilterRequest parsedZero = NaturalQueryParser.parse(zeroElec);
        assertEquals(0L, parsedZero.getMinGiaDien());
        assertEquals(0L, parsedZero.getMaxGiaDien());
        assertNull(parsedZero.getKeyword());

        RoomFilterRequest trailingPerson = new RoomFilterRequest();
        trailingPerson.setKeyword("nước dưới 100k theo đầu người");
        RoomFilterRequest parsedTrailingPerson = NaturalQueryParser.parse(trailingPerson);
        assertEquals(100_000L, parsedTrailingPerson.getMaxGiaNuoc());
        assertEquals(Boolean.TRUE, parsedTrailingPerson.getNuocTheoNguoi());
        assertNull(parsedTrailingPerson.getKeyword());

        RoomFilterRequest perMonth = new RoomFilterRequest();
        perMonth.setKeyword("nước 100k/người/tháng");
        RoomFilterRequest parsedPerMonth = NaturalQueryParser.parse(perMonth);
        assertEquals(100_000L, parsedPerMonth.getMinGiaNuoc());
        assertEquals(100_000L, parsedPerMonth.getMaxGiaNuoc());
        assertEquals(Boolean.TRUE, parsedPerMonth.getNuocTheoNguoi());
        assertNull(parsedPerMonth.getKeyword());

        RoomFilterRequest compactOp = new RoomFilterRequest();
        compactOp.setKeyword("điện<=3500");
        RoomFilterRequest parsedCompactOp = NaturalQueryParser.parse(compactOp);
        assertEquals(3_500L, parsedCompactOp.getMaxGiaDien());
        assertNull(parsedCompactOp.getKeyword());

        RoomFilterRequest combined = new RoomFilterRequest();
        combined.setKeyword("Gò Vấp điện thỏa thuận nước dưới 20k theo m3");
        RoomFilterRequest parsedCombined = NaturalQueryParser.parse(combined);
        assertEquals(0L, parsedCombined.getMinGiaDien());
        assertEquals(0L, parsedCombined.getMaxGiaDien());
        assertEquals(20_000L, parsedCombined.getMaxGiaNuoc());
        assertEquals(Boolean.FALSE, parsedCombined.getNuocTheoNguoi());
        assertEquals("Gò Vấp", parsedCombined.getKeyword());
    }
}
