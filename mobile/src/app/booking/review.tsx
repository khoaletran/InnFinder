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
import { Button } from "heroui-native";

import { StarRatingInput } from "../../components/booking/StarRatingInput";
import { bookingService } from "../../services/booking.service";
import { useAuthStore } from "../../store/useAuthStore";
import { useBookingStore } from "../../store/useBookingStore";
import { ReviewRequestDTO } from "../../types/booking.types";

const RATING_MOODS: Record<number, { text: string; color: string }> = {
  5: { text: "Tuyệt vời (5/5 sao)", color: "text-amber-600" },
  4: { text: "Rất tốt (4/5 sao)", color: "text-emerald-600" },
  3: { text: "Bình thường (3/5 sao)", color: "text-blue-600" },
  2: { text: "Chưa hài lòng (2/5 sao)", color: "text-orange-600" },
  1: { text: "Rất tệ (1/5 sao)", color: "text-rose-600" },
};

const CRITERIA = [
  {
    key: "chatLuong" as const,
    label: "Chất lượng phòng",
    icon: "bed-outline" as const,
  },
  {
    key: "tienIch" as const,
    label: "Tiện ích đi kèm",
    icon: "wifi-outline" as const,
  },
  {
    key: "viTri" as const,
    label: "Vị trí địa lý",
    icon: "location-outline" as const,
  },
  {
    key: "chuNha" as const,
    label: "Chủ nhà / Hỗ trợ",
    icon: "person-outline" as const,
  },
  {
    key: "dichVu" as const,
    label: "Dịch vụ & Vệ sinh",
    icon: "sparkles-outline" as const,
  },
];

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

  // Tải đánh giá đã có trước đó của người dùng trên phòng này
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
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      {/* 1. Header cố định */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">
            {existingReviewDate ? "Chi tiết đánh giá của bạn" : "Đánh giá phòng"}
          </Text>
        </View>
      </View>

      {/* 2. Scrollable Body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner thông báo nếu đã từng đánh giá trước đó */}
        {existingReviewDate && (
          <View className="flex-row items-center bg-teal-50 border border-teal-200 rounded-2xl p-3.5 mb-4 gap-2.5">
            <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
            <Text className="text-xs text-teal-800 flex-1 leading-4">
              Bạn đã đánh giá phòng này vào ngày{" "}
              <Text className="font-bold">{existingReviewDate}</Text>. Bạn có
              thể cập nhật lại cảm nhận và số sao bên dưới.
            </Text>
          </View>
        )}

        {/* Thẻ tóm tắt thông tin phòng trọ */}
        <View className="flex-row items-center gap-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-4 shadow-sm">
          {params.roomImage ? (
            <Image
              source={{ uri: params.roomImage }}
              className="w-16 h-16 rounded-xl bg-slate-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-slate-200 items-center justify-center">
              <Ionicons name="home-outline" size={24} color="#64748B" />
            </View>
          )}
          <View className="flex-1">
            <Text
              className="text-sm font-bold text-slate-900"
              numberOfLines={1}
            >
              {params.roomTitle || `Phòng trọ mã #${params.roomId || ""}`}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons name="location-sharp" size={13} color="#0D9488" />
              <Text className="text-xs text-slate-500 flex-1" numberOfLines={1}>
                {params.roomAddress || "Địa chỉ phòng trọ"}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Điểm đánh giá chung */}
        <View className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-5 items-center mb-4">
          <Text className="text-sm font-bold text-slate-800 mb-1">
            Điểm đánh giá chung
          </Text>
          <Text
            className={`text-xs font-bold mb-3 ${
              RATING_MOODS[overallScore]?.color || "text-amber-600"
            }`}
          >
            {RATING_MOODS[overallScore]?.text || `${overallScore}/5 sao`}
          </Text>
          <StarRatingInput
            value={overallScore}
            onChange={(val) => setOverallScore(val)}
            size={36}
          />
        </View>

        {/* Card 5 tiêu chí phụ chi tiết */}
        <View className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Tiêu chí đánh giá chi tiết
            </Text>
            <Text className="text-[11px] text-slate-400">1 - 5 sao</Text>
          </View>
          {CRITERIA.map((criterion, idx) => {
            const isLast = idx === CRITERIA.length - 1;
            return (
              <View
                key={criterion.key}
                className={`flex-row justify-between items-center py-2.5 ${
                  !isLast ? "border-b border-slate-200/40" : ""
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name={criterion.icon} size={16} color="#64748B" />
                  <Text className="text-xs font-semibold text-slate-700">
                    {criterion.label}
                  </Text>
                </View>
                <StarRatingInput
                  value={scores[criterion.key]}
                  onChange={(val) =>
                    setScores((prev) => ({ ...prev, [criterion.key]: val }))
                  }
                  size={18}
                />
              </View>
            );
          })}
        </View>

        {/* Trải nghiệm thực tế */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-bold text-slate-900">
              Trải nghiệm thực tế của bạn <Text className="text-rose-500">*</Text>
            </Text>
            <Text className="text-[11px] text-slate-400">
              {content.length} ký tự
            </Text>
          </View>
          <TextInput
            className="border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-800 bg-white min-h-[110px]"
            placeholder="Chia sẻ cảm nhận chân thật về phòng trọ, chủ nhà, an ninh, tiện ích..."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* 3. Nút Hành động cố định dưới chân màn hình */}
      <View className="px-5 py-3.5 border-t border-slate-100 bg-white">
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
              {existingReviewDate ? "Cập nhật đánh giá" : "Gửi đánh giá phòng"}
            </Button.Label>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
