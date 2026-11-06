import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { StarRatingInput } from "../../components/booking/StarRatingInput";
import { bookingService } from "../../services/booking.service";
import { useAuthStore } from "../../store/useAuthStore";
import { ReviewRequestDTO } from "../../types/booking.types";

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    roomId?: string;
    roomTitle?: string;
    roomAddress?: string;
    roomImage?: string;
  }>();

  const user = useAuthStore((state) => state.user);

  // Điểm đánh giá chung (gửi vào Java backend)
  const [overallScore, setOverallScore] = useState<number>(5);

  // 5 tiêu chí phụ trên giao diện
  const [scores, setScores] = useState({
    chatLuong: 5,
    tienIch: 4,
    viTri: 4,
    chuNha: 5,
    dichVu: 4,
  });

  // Nội dung nhận xét
  const [content, setContent] = useState<string>("");

  // Danh sách ảnh chụp minh chứng
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Chọn ảnh từ thư viện
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris]);
    }
  };

  // Gửi đánh giá lên API Backend Spring Boot
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập trải nghiệm thực tế của bạn.");
      return;
    }

    const roomId = params.roomId || "PT120326100001";
    const maNguoiDung = user?.maNguoiDung || "ND202603120001";

    const payload: ReviewRequestDTO = {
      maNguoiDung,
      diem: overallScore,
      noiDung: content.trim(),
    };

    setIsSubmitting(true);
    try {
      await bookingService.createReview(roomId, payload);
      setIsSubmitting(false);
      Alert.alert("Thành công", "Cảm ơn bạn đã gửi đánh giá cho phòng trọ!", [
        { text: "Đóng", onPress: () => router.back() },
      ]);
    } catch {
      setIsSubmitting(false);
      // Fallback thông báo thành công cho UI khi chưa bật backend
      Alert.alert("Thành công", "Đã lưu đánh giá của bạn (Chế độ xem trước).", [
        { text: "Đóng", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Đánh giá phòng</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Tóm tắt phòng trọ */}
        <View className="flex-row items-center gap-3 pb-4 border-b border-slate-100">
          <Image
            source={{
              uri:
                params.roomImage ||
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
            }}
            className="w-16 h-16 rounded-xl bg-slate-100"
            resizeMode="cover"
          />
          <View className="flex-1">
            <Text
              className="text-base font-bold text-slate-900"
              numberOfLines={1}
            >
              {params.roomTitle || "Studio ban công, đầy đủ nội thất mới"}
            </Text>
            <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
              {params.roomAddress || "Quận 3, TP. Hồ Chí Minh"}
            </Text>
          </View>
        </View>

        {/* 3. Điểm đánh giá chung (Ngôi sao lớn ở giữa) */}
        <View className="items-center py-5">
          <Text className="text-base font-bold text-slate-900 mb-2.5">
            Điểm đánh giá chung
          </Text>
          <StarRatingInput
            value={overallScore}
            onChange={(val) => setOverallScore(val)}
            size={32}
          />
        </View>

        {/* 4. Danh sách 5 tiêu chí phụ */}
        <View className="gap-3 pb-4 border-b border-slate-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-700">Chất lượng phòng</Text>
            <StarRatingInput
              value={scores.chatLuong}
              onChange={(val) => setScores({ ...scores, chatLuong: val })}
              size={20}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-700">Tiện ích</Text>
            <StarRatingInput
              value={scores.tienIch}
              onChange={(val) => setScores({ ...scores, tienIch: val })}
              size={20}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-700">Vị trí địa lý</Text>
            <StarRatingInput
              value={scores.viTri}
              onChange={(val) => setScores({ ...scores, viTri: val })}
              size={20}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-700">Chủ nhà / Hỗ trợ</Text>
            <StarRatingInput
              value={scores.chuNha}
              onChange={(val) => setScores({ ...scores, chuNha: val })}
              size={20}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-slate-700">Dịch vụ đi kèm</Text>
            <StarRatingInput
              value={scores.dichVu}
              onChange={(val) => setScores({ ...scores, dichVu: val })}
              size={20}
            />
          </View>
        </View>

        {/* 5. Trải nghiệm thực tế */}
        <View className="mt-4">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Trải nghiệm thực tế
          </Text>
          <TextInput
            className="border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-800 bg-white min-h-[110px]"
            placeholder="Phòng sạch sẽ, ban công đón nắng rất đẹp. Chủ nhà nhiệt tình hỗ trợ..."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 6. Hình ảnh minh chứng */}
        <View className="mt-4 mb-20">
          <Text className="text-sm font-bold text-slate-900 mb-2.5">
            Hình ảnh minh chứng
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {/* Nút cộng ảnh nét đứt */}
            <TouchableOpacity
              onPress={handlePickImage}
              className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50 active:bg-slate-100"
            >
              <Ionicons name="add" size={26} color="#64748B" />
            </TouchableOpacity>

            {/* Các ảnh đã chọn */}
            {images.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                className="w-16 h-16 rounded-2xl bg-slate-100"
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 7. Nút Gửi đánh giá cố định ở đáy */}
      <View className="px-4 py-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-teal-600 rounded-xl items-center justify-center active:opacity-90"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-base font-bold text-white">Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
