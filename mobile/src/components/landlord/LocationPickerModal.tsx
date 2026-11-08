import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'heroui-native';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords?: LocationCoords | null;
  onClose: () => void;
  onSelectLocation: (coords: LocationCoords, suggestedAddress?: string) => void;
}

// Tọa độ mặc định: Trung tâm TP. Hồ Chí Minh
const DEFAULT_COORDS: LocationCoords = {
  latitude: 10.8231,
  longitude: 106.6874,
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoords,
  onClose,
  onSelectLocation,
}) => {
  const mapRef = useRef<MapView>(null);
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords>(
    initialCoords || DEFAULT_COORDS
  );
  const [suggestedAddress, setSuggestedAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Khi modal mở, cập nhật tọa độ ban đầu
  useEffect(() => {
    if (visible) {
      const coords = initialCoords && initialCoords.latitude ? initialCoords : DEFAULT_COORDS;
      setSelectedCoords(coords);
      lookupAddress(coords.latitude, coords.longitude);

      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          600
        );
      }, 300);
    }
  }, [visible, initialCoords]);

  // Tra cứu địa chỉ ngược từ tọa độ (Reverse Geocoding)
  const lookupAddress = async (lat: number, lng: number) => {
    try {
      setIsGeocoding(true);
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const item = results[0];
        const parts = [
          item.streetNumber,
          item.street,
          item.subregion || item.district,
          item.city || item.region,
        ].filter(Boolean);
        const full = parts.join(', ');
        setSuggestedAddress(full);
      } else {
        setSuggestedAddress('');
      }
    } catch {
      setSuggestedAddress('');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Người dùng chạm vào bản đồ để chọn điểm
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newCoords = { latitude, longitude };
    setSelectedCoords(newCoords);
    lookupAddress(latitude, longitude);
  };

  // Người dùng kéo thả Marker
  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newCoords = { latitude, longitude };
    setSelectedCoords(newCoords);
    lookupAddress(latitude, longitude);
  };

  // Nút lấy tọa độ GPS hiện tại của thiết bị
  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền vị trí bị từ chối',
          'Vui lòng cấp quyền truy cập vị trí để lấy tọa độ nhà trọ của bạn.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (location?.coords) {
        const coords: LocationCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setSelectedCoords(coords);
        lookupAddress(coords.latitude, coords.longitude);

        mapRef.current?.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          800
        );
      }
    } catch (err: any) {
      Alert.alert('Không thể lấy vị trí', err?.message || 'Vui lòng kiểm tra lại GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation(selectedCoords, suggestedAddress);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between z-10">
          <Pressable onPress={onClose} className="p-1.5 -ml-1.5 active:opacity-70">
            <Ionicons name="close" size={24} color="#111827" />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-bold text-gray-900">Chọn vị trí phòng trọ</Text>
            <Text className="text-[11px] text-gray-500 font-medium">
              Chạm hoặc kéo ghim để định vị chính xác
            </Text>
          </View>
          <View className="w-8" />
        </View>

        {/* Map View */}
        <View className="flex-1 relative">
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              ...selectedCoords,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Marker
              coordinate={selectedCoords}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title="Vị trí phòng trọ"
              description="Kéo thả để điều chỉnh vị trí"
            >
              <View className="items-center">
                <View className="bg-teal-700 px-2.5 py-1 rounded-full shadow-md border-2 border-white flex-row items-center gap-1">
                  <Ionicons name="business" size={13} color="#ffffff" />
                  <Text className="text-[11px] font-bold text-white">Vị trí trọ</Text>
                </View>
                <Ionicons name="location" size={32} color="#0f766e" style={{ marginTop: -4 }} />
              </View>
            </Marker>
          </MapView>

          {/* Nút GPS: Lấy vị trí của tôi */}
          <Pressable
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
            className="absolute right-4 top-4 bg-white p-3 rounded-full shadow-lg border border-gray-200 active:bg-gray-100 items-center justify-center"
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#0f766e" />
            ) : (
              <Ionicons name="locate" size={22} color="#0f766e" />
            )}
          </Pressable>

          {/* Hướng dẫn nhanh nổi */}
          <View className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-full">
            <Text className="text-[11px] text-white font-medium">
              💡 Chạm vào bản đồ để đổi vị trí ghim
            </Text>
          </View>
        </View>

        {/* Bottom Panel */}
        <View className="bg-white p-4 border-t border-gray-100 shadow-xl">
          {/* Tọa độ hiện tại */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="navigate-circle-outline" size={18} color="#0f766e" />
              <Text className="text-xs font-bold text-gray-800">Tọa độ đã chọn:</Text>
            </View>
            <Text className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
            </Text>
          </View>

          {/* Gợi ý địa chỉ từ tọa độ */}
          <View className="mb-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
            <Text className="text-[11px] text-gray-500 font-medium mb-0.5">
              Địa chỉ ước tính theo vị trí ghim:
            </Text>
            {isGeocoding ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : (
              <Text className="text-xs font-semibold text-gray-900" numberOfLines={2}>
                {suggestedAddress || 'Chưa xác định được địa chỉ cụ thể'}
              </Text>
            )}
          </View>

          {/* Nút xác nhận */}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={onClose}
                className="w-full border-gray-200 py-2.5 rounded-xl"
              >
                <Button.Label className="text-gray-700 font-semibold text-sm">Hủy bỏ</Button.Label>
              </Button>
            </View>
            <View className="flex-2">
              <Button
                variant="primary"
                onPress={handleConfirm}
                className="w-full bg-teal-700 py-2.5 rounded-xl"
              >
                <Button.Label className="text-white font-bold text-sm">
                  Xác nhận vị trí này
                </Button.Label>
              </Button>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
