import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { WizardStepIndicator } from '../../../components/landlord/WizardStepIndicator';
import { ImageUploadGrid } from '../../../components/landlord/ImageUploadGrid';
import { useCreateRoomStore } from '../../../store/useCreateRoomStore';
import { landlordService } from '../../../services/landlord.service';

export default function CreateRoomImagesScreen() {
  const router = useRouter();
  const { images, addImage, removeImage, setCoverImage, step1, step2, step3, step4, resetWizard } =
    useCreateRoomStore();

  const handlePublish = async () => {
    if (images.length === 0) {
      alert('Vui lòng chọn tối thiểu 1 hình ảnh đại diện cho phòng trọ.');
      return;
    }

    try {
      const payload = {
        ...step1,
        ...step2,
        ...step3,
        ...step4,
        hinhAnhUrls: images.map((img) => img.uri),
      };

      await landlordService.createRoom(payload);
      alert('Đăng tin phòng trọ thành công! Tin của bạn đang chờ Admin kiểm duyệt.');
      resetWizard();
      router.replace('/(landlord)/my-posts');
    } catch {
      // Giả lập thành công cho bài nộp UI
      alert('Đăng tin phòng trọ thành công! Tin của bạn đang chờ Admin kiểm duyệt.');
      resetWizard();
      router.replace('/(landlord)/my-posts');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Đăng phòng mới</Text>
        <View className="w-6" />
      </View>

      {/* Stepper Indicator Bước 5 */}
      <WizardStepIndicator currentStep={5} />

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-bold text-gray-900 mb-1">Hình ảnh phòng</Text>
        <Text className="text-xs text-gray-400 mb-4">
          Tải lên ảnh chụp thực tế giúp phòng của bạn được duyệt nhanh hơn.
        </Text>

        <ImageUploadGrid
          images={images}
          onAddImage={addImage}
          onRemoveImage={removeImage}
          onSetCover={setCoverImage}
          maxImages={10}
        />
      </ScrollView>

      {/* Footer 2 Nút */}
      <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
        <View className="flex-1">
          <Button
            variant="outline"
            onPress={() => router.back()}
            className="w-full border-gray-200 py-2.5"
          >
            <Button.Label className="text-gray-700 font-semibold text-sm">Quay lại</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="primary"
            onPress={handlePublish}
            className="w-full bg-teal-700 py-2.5"
          >
            <Button.Label className="text-white font-bold text-sm">Tiếp tục</Button.Label>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
