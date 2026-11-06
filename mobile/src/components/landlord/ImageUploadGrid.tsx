import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RoomImageItem } from '../../types/landlord.types';

interface Props {
  images: RoomImageItem[];
  onAddImage: (uri: string) => void;
  onRemoveImage: (index: number) => void;
  onSetCover: (index: number) => void;
  maxImages?: number;
}

export const ImageUploadGrid: React.FC<Props> = ({
  images,
  onAddImage,
  onRemoveImage,
  onSetCover,
  maxImages = 10,
}) => {
  const pickImage = async () => {
    if (images.length >= maxImages) {
      alert(`Bạn chỉ được chọn tối đa ${maxImages} hình ảnh.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Ứng dụng cần quyền truy cập thư viện ảnh để tải ảnh phòng trọ lên.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      result.assets.forEach((asset) => {
        onAddImage(asset.uri);
      });
    }
  };

  return (
    <View className="gap-y-4">
      {/* Box chọn ảnh */}
      <Pressable
        onPress={pickImage}
        className="border-2 border-dashed border-teal-500 bg-teal-50/40 rounded-2xl p-8 items-center justify-center active:bg-teal-100/50"
      >
        <View className="w-12 h-12 rounded-full bg-teal-100 items-center justify-center mb-2">
          <Ionicons name="camera-outline" size={24} color="#0f766e" />
        </View>
        <Text className="text-sm font-bold text-teal-800">Chọn ảnh tải lên</Text>
        <Text className="text-xs text-gray-400 mt-1">Tối đa {maxImages} tấm, mỗi ảnh &lt; 10MB</Text>
      </Pressable>

      {/* Danh sách ảnh đã chọn */}
      {images.length > 0 && (
        <View>
          <Text className="text-xs font-semibold text-gray-700 mb-2">
            Ảnh đã chọn ({images.length})
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {images.map((img, idx) => (
              <Pressable
                key={idx}
                onPress={() => onSetCover(idx)}
                className="relative w-[31%] aspect-square rounded-xl overflow-hidden border border-gray-200"
              >
                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />

                {/* Badge Ảnh bìa */}
                {img.isCover && (
                  <View className="absolute top-1 left-1 bg-teal-700 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-bold text-white">Ảnh bìa</Text>
                  </View>
                )}

                {/* Nút Xóa */}
                <Pressable
                  onPress={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 items-center justify-center"
                >
                  <Ionicons name="close" size={12} color="#ffffff" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
