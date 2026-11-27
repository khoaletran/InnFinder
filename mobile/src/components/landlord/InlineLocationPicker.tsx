import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface AddressSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
  fullAddress: string;
  coords: LocationCoords;
}

interface InlineLocationPickerProps {
  address: string;
  onChangeAddress: (address: string) => void;
  coordinates: LocationCoords;
  onChangeCoordinates: (coords: LocationCoords) => void;
  onOpenFullMap?: () => void;
}

interface NominatimItem {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    city_district?: string;
    county?: string;
    district?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

function formatNominatimSuggestion(item: NominatimItem): AddressSuggestion {
  const addr = item.address || {};
  const streetPart = [addr.house_number, addr.road].filter(Boolean).join(' ').trim();
  const wardPart = addr.quarter || addr.neighbourhood || addr.suburb || '';
  const districtPart = addr.city_district || addr.district || addr.county || '';
  const cityPart = addr.city || addr.town || addr.state || '';

  const primaryText = streetPart || item.name || item.display_name.split(',')[0]?.trim() || item.display_name;
  const secondaryParts = [wardPart, districtPart, cityPart].filter(
    (part, idx, arr) => Boolean(part) && part !== primaryText && arr.indexOf(part) === idx
  );
  const secondaryText = secondaryParts.join(', ') || item.display_name;
  const fullAddress = [primaryText, ...secondaryParts].filter(Boolean).join(', ') || item.display_name;

  return {
    id: String(item.place_id),
    primaryText,
    secondaryText,
    fullAddress,
    coords: {
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    },
  };
}

function formatExpoGeocodeAddress(item: Location.LocationGeocodedAddress): string {
  const street = [item.streetNumber, item.street].filter(Boolean).join(' ').trim();
  const parts = [
    street || item.name,
    item.district || item.subregion,
    item.city || item.region,
  ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx);
  return parts.join(', ');
}

export const InlineLocationPicker: React.FC<InlineLocationPickerProps> = ({
  address,
  onChangeAddress,
  coordinates,
  onChangeCoordinates,
  onOpenFullMap,
}) => {
  const mapRef = useRef<MapView>(null);
  const suppressNextSearchRef = useRef(false);
  const lastAnimatedRef = useRef<LocationCoords>(coordinates);

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hasPinned, setHasPinned] = useState(false);

  const animateMapTo = (coords: LocationCoords, delta = 0.006) => {
    lastAnimatedRef.current = coords;
    mapRef.current?.animateToRegion(
      {
        ...coords,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      500
    );
  };

  // Đồng bộ vùng hiển thị khi tọa độ được cập nhật từ bên ngoài (vd: Modal toàn màn hình)
  useEffect(() => {
    const moved =
      Math.abs(coordinates.latitude - lastAnimatedRef.current.latitude) > 0.0001 ||
      Math.abs(coordinates.longitude - lastAnimatedRef.current.longitude) > 0.0001;
    if (moved) {
      animateMapTo(coordinates, 0.008);
      setHasPinned(true);
    }
  }, [coordinates.latitude, coordinates.longitude]);

  // Tìm kiếm gợi ý địa chỉ khi người dùng nhập (debounce 400ms)
  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    const query = address.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url =
          'https://nominatim.openstreetmap.org/search?' +
          new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            countrycodes: 'vn',
            limit: '5',
            'accept-language': 'vi',
          }).toString();

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'vi',
            'User-Agent': 'InnFinder-Mobile/1.0',
          },
        });

        let mapped: AddressSuggestion[] = [];
        if (response.ok) {
          const data: NominatimItem[] = await response.json();
          mapped = data
            .filter((item) => !Number.isNaN(Number(item.lat)) && !Number.isNaN(Number(item.lon)))
            .map(formatNominatimSuggestion);
        }

        // Fallback sang geocoding của thiết bị nếu Nominatim không trả kết quả
        if (mapped.length === 0) {
          const geoResults = await Location.geocodeAsync(query);
          const first = geoResults?.[0];
          if (first) {
            const rev = await Location.reverseGeocodeAsync({
              latitude: first.latitude,
              longitude: first.longitude,
            });
            const formatted = rev?.[0] ? formatExpoGeocodeAddress(rev[0]) : query;
            mapped = [
              {
                id: `${first.latitude}_${first.longitude}`,
                primaryText: formatted || query,
                secondaryText: 'Kết quả định vị trên bản đồ',
                fullAddress: formatted || query,
                coords: { latitude: first.latitude, longitude: first.longitude },
              },
            ];
          }
        }

        if (!controller.signal.aborted) {
          setSuggestions(mapped);
          setShowSuggestions(mapped.length > 0);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  const reverseLookupAndFill = async (coords: LocationCoords) => {
    setIsReverseGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      const formatted = results?.[0] ? formatExpoGeocodeAddress(results[0]) : '';
      if (formatted) {
        suppressNextSearchRef.current = true;
        onChangeAddress(formatted);
        return;
      }

      // Fallback Nominatim reverse
      const url =
        'https://nominatim.openstreetmap.org/reverse?' +
        new URLSearchParams({
          lat: String(coords.latitude),
          lon: String(coords.longitude),
          format: 'json',
          addressdetails: '1',
          'accept-language': 'vi',
        }).toString();
      const resp = await fetch(url, {
        headers: { 'Accept-Language': 'vi', 'User-Agent': 'InnFinder-Mobile/1.0' },
      });
      if (resp.ok) {
        const item: NominatimItem = await resp.json();
        const suggestion = formatNominatimSuggestion(item);
        if (suggestion.fullAddress) {
          suppressNextSearchRef.current = true;
          onChangeAddress(suggestion.fullAddress);
        }
      }
    } catch {
      // Giữ nguyên địa chỉ hiện tại nếu reverse geocode thất bại
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    suppressNextSearchRef.current = true;
    onChangeAddress(item.fullAddress);
    onChangeCoordinates(item.coords);
    setHasPinned(true);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();
    animateMapTo(item.coords, 0.005);
  };

  const handlePinAt = (coords: LocationCoords) => {
    setShowSuggestions(false);
    setHasPinned(true);
    onChangeCoordinates(coords);
    lastAnimatedRef.current = coords;
    reverseLookupAndFill(coords);
  };

  const handleMapPress = (e: MapPressEvent) => {
    handlePinAt(e.nativeEvent.coordinate);
  };

  const handleMarkerDragEnd = (e: any) => {
    handlePinAt(e.nativeEvent.coordinate);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền vị trí bị từ chối',
          'Vui lòng cấp quyền vị trí để tự động ghim nhà trọ tại nơi bạn đang đứng.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (loc?.coords) {
        const nextCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        onChangeCoordinates(nextCoords);
        setHasPinned(true);
        animateMapTo(nextCoords, 0.005);
        reverseLookupAndFill(nextCoords);
      }
    } catch (err: any) {
      Alert.alert('Không thể lấy vị trí', err?.message || 'Vui lòng bật GPS và thử lại.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddressTextChange = (text: string) => {
    onChangeAddress(text);
    if (text.trim().length < 3) {
      setShowSuggestions(false);
    }
  };

  return (
    <View>
      {/* Ô nhập địa chỉ cụ thể */}
      <Text className="text-xs font-semibold text-gray-700 mb-1.5">Địa chỉ cụ thể *</Text>
      <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50/70">
        <Ionicons name="search-outline" size={16} color="#6b7280" />
        <TextInput
          placeholder="Nhập số nhà, tên đường, phường, quận..."
          placeholderTextColor="#9ca3af"
          value={address}
          onChangeText={handleAddressTextChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          className="flex-1 px-2.5 py-2.5 text-sm text-gray-900"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color="#0f766e" />
        ) : (
          address.length > 0 && (
            <Pressable
              onPress={() => {
                suppressNextSearchRef.current = true;
                onChangeAddress('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </Pressable>
          )
        )}
      </View>

      {/* Danh sách gợi ý địa điểm liên quan */}
      {showSuggestions && suggestions.length > 0 && (
        <View className="mt-1.5 rounded-xl border border-teal-200 bg-white overflow-hidden shadow-sm">
          {suggestions.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => handleSelectSuggestion(item)}
              className={`px-3 py-2.5 flex-row items-start gap-2.5 active:bg-teal-50 ${
                idx < suggestions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className="w-7 h-7 rounded-full bg-teal-50 items-center justify-center mt-0.5">
                <Ionicons name="location-outline" size={15} color="#0f766e" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                  {item.primaryText}
                </Text>
                <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                  {item.secondaryText}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle-outline" size={16} color="#0f766e" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Bản đồ hiển thị trực tiếp ngay bên dưới */}
      <View className="mt-3">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-semibold text-gray-700">Ghim vị trí trên bản đồ</Text>
          {isReverseGeocoding ? (
            <View className="flex-row items-center gap-1">
              <ActivityIndicator size="small" color="#0f766e" />
              <Text className="text-[11px] text-teal-700 font-medium">Đang cập nhật địa chỉ...</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={hasPinned ? 'checkmark-circle' : 'pin-outline'}
                size={13}
                color={hasPinned ? '#0f766e' : '#6b7280'}
              />
              <Text
                className={`text-[11px] font-medium ${
                  hasPinned ? 'text-teal-700' : 'text-gray-500'
                }`}
              >
                {hasPinned ? 'Đã ghim vị trí' : 'Chạm bản đồ để ghim'}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{ height: 220, width: '100%' }}
          className="rounded-2xl overflow-hidden border border-gray-200 relative bg-gray-100"
        >
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              ...coordinates,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Marker
              coordinate={coordinates}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title="Vị trí phòng trọ"
              description="Kéo thả hoặc chạm bản đồ để chọn lại"
            >
              <View className="items-center">
                <View className="bg-teal-700 px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex-row items-center gap-1">
                  <Ionicons name="business" size={11} color="#ffffff" />
                  <Text className="text-[10px] font-bold text-white">Nhà trọ</Text>
                </View>
                <Ionicons name="location" size={28} color="#0f766e" style={{ marginTop: -4 }} />
              </View>
            </Marker>
          </MapView>

          {/* Gợi ý thao tác nổi */}
          <View className="absolute top-2.5 left-2.5 bg-black/60 px-2.5 py-1 rounded-full">
            <Text className="text-[10px] text-white font-medium">
              Chạm hoặc kéo ghim để chọn vị trí
            </Text>
          </View>

          {/* Nút GPS & Mở rộng bản đồ */}
          <View className="absolute right-2.5 top-2.5 gap-2">
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center active:bg-gray-100"
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#0f766e" />
              ) : (
                <Ionicons name="locate" size={18} color="#0f766e" />
              )}
            </Pressable>

            {onOpenFullMap && (
              <Pressable
                onPress={onOpenFullMap}
                className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center active:bg-gray-100"
              >
                <Ionicons name="expand-outline" size={17} color="#374151" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
