import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Chip, Card } from "heroui-native";

import { useBookingStore } from "../../store/useBookingStore";

export default function DepositPaymentScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    roomId?: string;
    roomTitle?: string;
    roomImage?: string;
    categoryName?: string;
    depositAmount?: string;
    ngayHen?: string;
    phoneNumber?: string;
  }>();

  const {
    fetchAppointments,
    walletBalance,
    topUpWallet,
    payAppointmentDeposit,
  } = useBookingStore();

  const [selectedMethod, setSelectedMethod] = useState<string>("WALLET");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const amount = Number(params.depositAmount) || 200000;
  const isWalletEnough = walletBalance >= amount;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(val) + " đ";
  };

  const formatDateTimeDisplay = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      return `${time} - Ngày ${date}`;
    } catch {
      return isoStr;
    }
  };

  // Danh sách phương thức thanh toán ĐỘNG THEO SỐ DƯ
  const paymentMethods = [
    {
      id: "WALLET",
      title: "Ví điện tử InnFinder",
      desc: `Số dư khả dụng: ${formatCurrency(walletBalance)}`,
      icon: "wallet-outline",
      color: "#0D9488",
    },
    {
      id: "VIETQR",
      title: "Chuyển khoản Ngân hàng (VietQR)",
      desc: "Quét mã QR tự động điền tiền & nội dung",
      icon: "qr-code-outline",
      color: "#2563EB",
    },
    {
      id: "MOMO",
      title: "Ví điện tử MoMo / VNPay",
      desc: "Liên kết thanh toán một chạm",
      icon: "phone-portrait-outline",
      color: "#D946EF",
    },
  ];

  const handleConfirmPayment = async () => {
    // Nếu chọn Ví nhưng không đủ tiền
    if (selectedMethod === "WALLET" && !isWalletEnough) {
      Alert.alert(
        "Số dư không đủ",
        `Số dư ví hiện tại (${formatCurrency(walletBalance)}) không đủ thanh toán cọc ${formatCurrency(amount)}. Vui lòng chọn VietQR/MoMo hoặc bấm nạp nhanh bên dưới!`,
        [
          { text: "Nạp thêm 500k", onPress: () => topUpWallet(500000) },
          { text: "Đóng", style: "cancel" },
        ],
      );
      return;
    }

    const apptId = params.appointmentId;
    if (!apptId) {
      Alert.alert("Lỗi dữ liệu", "Không tìm thấy mã lịch hẹn cần nộp cọc.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Trừ tiền ví (nếu chọn ví) và lưu trạng thái đã nộp cọc
      const ok = await payAppointmentDeposit(apptId, amount, selectedMethod);
      if (!ok) {
        setIsSubmitting(false);
        Alert.alert("Lỗi thanh toán", "Số dư ví không đủ để thanh toán.");
        return;
      }

      await fetchAppointments();
      setIsSubmitting(false);

      Alert.alert(
        "Nộp cọc giữ chân thành công!",
        `Khoản cọc ${formatCurrency(amount)} đã được nộp thành công và đang được InnFinder tạm giữ an toàn. Lịch hẹn đã được gửi tới Chủ trọ để xác nhận đón tiếp.`,
        [
          {
            text: "Xem lịch hẹn",
            onPress: () => router.replace("/(tenant)/appointments"),
          },
        ],
        { cancelable: false },
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        "Lỗi nộp cọc",
        err.message || "Không thể hoàn tất nộp cọc giữ chân.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 p-1 rounded-full active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">
          Thanh toán cọc giữ chân
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Thẻ tóm tắt phòng */}
        <Card className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4">
          <View className="flex-row items-center gap-3 pb-3 border-b border-slate-200">
            {params.roomImage ? (
              <Image
                source={{ uri: params.roomImage }}
                className="w-14 h-14 rounded-xl bg-slate-200"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
                <Ionicons name="home-outline" size={22} color="#64748B" />
              </View>
            )}
            <View className="flex-1">
              <Chip
                size="sm"
                variant="soft"
                color="accent"
                className="self-start mb-1"
              >
                <Chip.Label>{params.categoryName || "Phòng trọ"}</Chip.Label>
              </Chip>
              <Text
                className="text-sm font-bold text-slate-900"
                numberOfLines={1}
              >
                {params.roomTitle}
              </Text>
            </View>
          </View>

          <View className="pt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Lịch xem dự kiến:</Text>
              <Text className="text-xs font-semibold text-slate-800">
                {formatDateTimeDisplay(params.ngayHen)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Số điện thoại:</Text>
              <Text className="text-xs font-semibold text-slate-800">
                {params.phoneNumber || "Theo tài khoản"}
              </Text>
            </View>
            <View className="flex-row justify-between items-baseline pt-2 border-t border-slate-200">
              <Text className="text-xs font-bold text-slate-700">
                Cọc giữ chân:
              </Text>
              <Text className="text-xl font-extrabold text-teal-700">
                {formatCurrency(amount)}
              </Text>
            </View>
          </View>
        </Card>

        {/* 3. Cam kết bảo chứng */}
        <View className="flex-row items-center gap-2.5 bg-teal-50 border border-teal-200 p-3.5 rounded-2xl mb-4">
          <Ionicons name="shield-checkmark" size={24} color="#0D9488" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-teal-900">
              Cam kết hoàn trả 100% từ InnFinder
            </Text>
            <Text className="text-[11px] text-teal-700 mt-0.5 leading-4">
              Tiền cọc giữ chân sẽ được hoàn trả nguyên vẹn 100% vào tài khoản
              của bạn ngay khi buổi xem phòng kết thúc.
            </Text>
          </View>
        </View>

        {/* 4. Chọn phương thức thanh toán */}
        <View className="flex-row justify-between items-center mb-2.5">
          <Text className="text-sm font-bold text-slate-900">
            Phương thức thanh toán
          </Text>
          {/* Nút nạp nhanh tiền cho bạn test tiện lợi */}
          <TouchableOpacity
            onPress={() => {
              topUpWallet(500000);
              Alert.alert(
                "Nạp tiền thành công",
                "Đã cộng thêm +500.000 đ vào Ví InnFinder!",
              );
            }}
            className="flex-row items-center px-2 py-1 bg-teal-50 rounded-lg border border-teal-200"
          >
            <Ionicons name="add-circle" size={14} color="#0D9488" />
            <Text className="text-[11px] font-bold text-teal-700 ml-1">
              +500k Test
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3 mb-4">
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            const isWallet = method.id === "WALLET";

            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.7}
                className={`flex-row items-center p-3.5 rounded-2xl border ${
                  isSelected
                    ? "border-teal-600 bg-teal-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${method.color}15` }}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={22}
                    color={method.color}
                  />
                </View>

                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-bold text-slate-900"
                          : "font-medium text-slate-700"
                      }`}
                    >
                      {method.title}
                    </Text>
                    {isWallet && !isWalletEnough && (
                      <Chip size="sm" variant="soft" color="danger">
                        <Chip.Label>Không đủ</Chip.Label>
                      </Chip>
                    )}
                  </View>
                  <Text
                    className={`text-xs mt-0.5 ${
                      isWallet && !isWalletEnough
                        ? "text-red-500 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {method.desc}
                  </Text>
                </View>

                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    isSelected ? "border-teal-600" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <View className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* VietQR */}
        {selectedMethod === "VIETQR" && (
          <View className="items-center bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 mb-6">
            <Ionicons name="qr-code" size={120} color="#0F172A" />
            <Text className="text-xs font-bold text-slate-700 mt-2">
              Quét mã QR qua ứng dụng Ngân hàng
            </Text>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              Tự động điền: {formatCurrency(amount)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 5. Cố định nút thanh toán */}
      <View className="px-5 py-3.5 border-t border-slate-100 bg-white">
        <Button
          variant="primary"
          size="lg"
          onPress={handleConfirmPayment}
          isDisabled={isSubmitting}
          className="w-full rounded-xl bg-teal-600"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Button.Label className="font-bold text-white text-base">
              Xác nhận thanh toán {formatCurrency(amount)}
            </Button.Label>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
