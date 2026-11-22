package com.innfinder.backend.service;

import com.innfinder.backend.entity.PhongTro;

record SearchCoordinates(double lat, double lng) {
    static boolean valid(Double lat, Double lng) {
        return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }

    static SearchCoordinates of(PhongTro room) {
        if (room.getViDo() == null || room.getKinhDo() == null) return null;
        try {
            double lat = Double.parseDouble(room.getViDo());
            double lng = Double.parseDouble(room.getKinhDo());
            if (valid(lat, lng)) return new SearchCoordinates(lat, lng);
            return valid(lng, lat) ? new SearchCoordinates(lng, lat) : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    double distanceTo(SearchCoordinates other) {
        double dLat = Math.toRadians(other.lat - lat);
        double dLng = Math.toRadians(other.lng - lng);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(other.lat))
                * Math.pow(Math.sin(dLng / 2), 2);
        return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
    }
}
