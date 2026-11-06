import React, { useEffect, useState } from "react";
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
import { Button } from "heroui-native";

import { StarRatingInput } from "../../components/booking/StarRatingInput";
import { bookingService } from "../../services/booking.service";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookingStore } from "../../store/useBookingStore";
import { ReviewRequestDTO } from "../../types/booking.types";

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    roomId?: string;
    roomTitle?: string;
    roomAddress?: string;
    roomImage?: string;
  }>();

  const user = useAuthStore((state) => state.user);
  const markRoomAsReviewed = useBookingStore(
    (state) => state.markRoomAsReviewed,
  );

  // Điểm đánh giá chung
  const [overallScore, setOverallScore] = useState<number>(5);
  const [content, setContent] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(false);
  const [existingReviewDate, setExistingReviewDate] = useState<string | null>(
    null,
  );

  // 5 tiêu chí phụ
  const [scores, setScores] = useState({
    chatLuong: 5,
    tienIch: 4,
    viTri: 4,
    chuNha: 5,
    dichVu: 4,
  });

  // Tải đánh giá đã có trước đó của người dùng trên phòng này (nếu có)
  useEffect(() => {
    if (params.roomId && user?.maNguoiDung) {
      setIsLoadingExisting(true);
      bookingService
        .getRoomReviews(params.roomId)
        .then((reviews) => {
          // Tìm đánh giá của chính người dùng hiện tại
          const myRev = reviews.find(
            (r: any) => r.maNguoiDung === user.maNguoiDung,
          );
          if (myRev) {
            setOverallScore(myRev.diem || 5);
            setContent(myRev.noiDung || "");
            if (myRev.ngayDanhGia) {
              const d = new Date(myRev.ngayDanhGia);
              setExistingReviewDate(
                `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
              );
            }
            markRoomAsReviewed(params.roomId!);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingExisting(false));
    }
  }, [params.roomId, user?.maNguoiDung]);

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

  const handleSubmit = async () => {
    if (!user?.maNguoiDung) {
      Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để đánh giá.");
      return;
    }

    if (!params.roomId) {
      Alert.alert("Lỗi dữ liệu", "Không tìm thấy thông tin phòng trọ.");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập trải nghiệm thực tế của bạn.");
      return;
    }

    const payload: ReviewRequestDTO = {
      maNguoiDung: user.maNguoiDung,
      diem: overallScore,
      noiDung: content.trim(),
    };

    setIsSubmitting(true);
    try {
      await bookingService.createReview(params.roomId, payload);
      await markRoomAsReviewed(params.roomId);
      setIsSubmitting(false);

      Alert.alert(
        "Thành công",
        existingReviewDate
          ? "Đã cập nhật đánh giá của bạn!"
          : "Cảm ơn bạn đã gửi đánh giá cho phòng trọ!",
        [{ text: "Đóng", onPress: () => router.back() }],
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert("Lỗi", err.message || "Không thể lưu đánh giá.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 1. Header */}
      <ScrollView>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">
            {existingReviewDate
              ? "Chi tiết đánh giá của bạn"
              : "Đánh giá phòng"}
          </Text>
        </View>

        <View
          className="flex-1 px-4 pt-3"
          // showsVerticalScrollIndicator={false}
        >
          {/* Banner thông báo nếu đã từng đánh giá trước đó */}
          {existingReviewDate && (
            <View className="flex-row items-center bg-teal-50 border border-teal-200 rounded-xl p-3 mb-3 gap-2">
              <Ionicons name="checkmark-circle" size={18} color="#0D9488" />
              <Text className="text-xs text-teal-800 flex-1 leading-4">
                Bạn đã đánh giá phòng này vào ngày{" "}
                <Text className="font-bold">{existingReviewDate}</Text>. Bạn có
                thể xem lại hoặc chỉnh sửa nhận xét bên dưới.
              </Text>
            </View>
          )}

          {/* 2. Tóm tắt phòng */}
          <View className="flex-row items-center gap-3 pb-4 border-b border-slate-100">
            {params.roomImage ? (
              <Image
                source={{ uri: params.roomImage }}
                className="w-16 h-16 rounded-xl bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View className="w-16 h-16 rounded-xl bg-slate-100 items-center justify-center">
                <Ionicons name="home-outline" size={24} color="#94A3B8" />
              </View>
            )}
            <View className="flex-1">
              <Text
                className="text-base font-bold text-slate-900"
                numberOfLines={1}
              >
                {params.roomTitle || `Phòng trọ mã #${params.roomId || ""}`}
              </Text>
              <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                {params.roomAddress || "Địa chỉ phòng trọ"}
              </Text>
            </View>
          </View>

          {/* 3. Điểm đánh giá chung */}
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

          {/* 4. 5 tiêu chí phụ */}
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
              Trải nghiệm thực tế của bạn
            </Text>
            <TextInput
              className="border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-800 bg-white min-h-[110px]"
              placeholder="Nhập cảm nhận của bạn về phòng..."
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
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50 active:bg-slate-100"
              >
                <Ionicons name="add" size={26} color="#64748B" />
              </TouchableOpacity>
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
        </View>

        {/* 7. Nút Hành động */}
        <View className="px-4 py-3 bg-white border-t border-slate-100">
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            isDisabled={isSubmitting || isLoadingExisting}
            className="w-full rounded-xl bg-teal-600"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Button.Label className="font-bold text-white text-base">
                {existingReviewDate ? "Cập nhật đánh giá" : "Gửi đánh giá"}
              </Button.Label>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
