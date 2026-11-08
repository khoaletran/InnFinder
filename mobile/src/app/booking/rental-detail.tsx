import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "heroui-native";

import { RentalTimeline } from "../../components/booking/RentalTimeline";
import { CancelReasonModal } from "../../components/booking/CancelReasonModal";
import { useBookingStore } from "../../store/useBookingStore";
import { landlordService } from "../../services/landlord.service";

const formatCurrency = (amount?: number): string => {
  if (!amount) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

const formatDate = (isoDate?: string): string => {
  if (!isoDate) return "--/--/----";
  try {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
};

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    appointments,
    isLoading,
    fetchAppointments,
    cancelAppointment,
    confirmRental,
    confirmReceivedDeposit,
    submitCustomerDecision,
    reviewedRoomIds,
    refundWallet,
    paidAppointmentIds,
  } = useBookingStore();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConfirmingRental, setIsConfirmingRental] = useState(false);

  useEffect(() => {
    if (appointments.length === 0) {
      fetchAppointments();
    }
  }, []);

  const item = appointments.find((a) => a.maDatLich === id);

  if (isLoading && !item) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-white">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">
            Chi tiết yêu cầu
          </Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="text-xs text-slate-400 mt-3">
            Đang tải chi tiết...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-white">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">
            Chi tiết yêu cầu
          </Text>
        </View>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={56} color="#CBD5E1" />
          <Text className="text-base font-bold text-slate-800 mt-4 mb-2">
            Không tìm thấy thông tin
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-teal-600 rounded-xl mt-4"
          >
            <Text className="text-white font-semibold text-sm">
              Quay lại danh sách
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCallLandlord = () => {
    if (item.sdtChuTro) {
      Linking.openURL(`tel:${item.sdtChuTro}`);
    } else {
      Alert.alert("Thông báo", "Chưa có số điện thoại của chủ trọ.");
    }
  };

  // Kịch bản 2: Khách bấm Không thuê hoặc Hủy lịch hẹn
  const handleConfirmCancel = async (reason: string) => {
    setIsCanceling(true);
    if (item.daNhanLaiCoc) {
      const result = await submitCustomerDecision(item.maDatLich, false, reason);
      setIsCanceling(false);
      setCancelModalVisible(false);
      if (result.success) {
        Alert.alert("Thành công", "Đã ghi nhận bạn không thuê phòng.");
      } else {
        Alert.alert("Lỗi", result.message || "Không thể gửi quyết định.");
      }
      return;
    }

    const wasPaid =
      !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich);
    const result = await cancelAppointment(item.maDatLich, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);

    if (result.success) {
      if (item.coc && wasPaid) {
        await refundWallet(item.coc);
        Alert.alert(
          "Thành công",
          "Đã hủy yêu cầu thuê phòng và hoàn trả cọc vào ví của bạn.",
        );
      } else {
        Alert.alert("Thành công", "Đã hủy yêu cầu thuê phòng thành công.");
      }
      router.back();
    } else {
      Alert.alert("Lỗi", result.message || "Không thể hủy lịch hẹn.");
    }
  };

  // Kịch bản 1: Khách hàng bấm Xác nhận thuê phòng (CẢ 2 BÊN CÙNG BẤM XÁC NHẬN THUÊ)
  const handlePressConfirmRental = () => {
    Alert.alert(
      "Xác nhận thuê phòng",
      "Bạn có chắc chắn muốn chốt thuê phòng trọ này? Sau khi xác nhận, hợp đồng thuê sẽ hoàn tất và 100% tiền cọc giữ chân sẽ được hoàn trả vào ví của bạn.",
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Xác nhận thuê",
          style: "default",
          onPress: async () => {
            setIsConfirmingRental(true);
            const res = await submitCustomerDecision(item.maDatLich, true);
            setIsConfirmingRental(false);
            if (res.success) {
              Alert.alert(
                "Đã gửi quyết định thuê!",
                "Bạn đã xác nhận thuê phòng. Hệ thống đang chờ Chủ trọ đưa ra quyết định.",
              );
            } else {
              Alert.alert(
                "Lỗi",
                res.message || "Xác nhận thuê phòng thất bại.",
              );
            }
          },
        },
      ],
    );
  };

  const isReviewed = reviewedRoomIds.includes(item.maPhongTro);
  const isDepositPaid =
    !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">
          Chi tiết yêu cầu
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Tóm tắt phòng */}
        <View className="flex-row items-center gap-3 pb-4 border-b border-slate-100">
          {item.hinhAnh ? (
            <Image
              source={{ uri: item.hinhAnh }}
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
              {item.tieuDePhong || `Phòng trọ mã #${item.maPhongTro}`}
            </Text>
            <Text className="text-sm font-bold text-teal-600 mt-1">
              Giá thuê: {formatCurrency(item.giaThue)}/tháng
            </Text>
          </View>
        </View>

        {/* 3. THẺ TRẠNG THÁI TIỀN CỌC GIỮ CHÂN (BƯỚC 5 & 6) */}
        <View className="bg-slate-50 border border-slate-200 p-4 rounded-2xl my-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tiền cọc giữ chân (Bước 5 & 6)
            </Text>
            {item.trangThai === "HOAN_THANH" ? (
              <Chip size="sm" variant="soft" color="success">
                <Chip.Label>✓ Đã hoàn 100%</Chip.Label>
              </Chip>
            ) : item.trangThai === "HUY" ? (
              <Chip size="sm" variant="soft" color="danger">
                <Chip.Label>Đã hủy lịch</Chip.Label>
              </Chip>
            ) : item.trangThai === "CHO_XAC_NHAN" ? (
              <Chip size="sm" variant="soft" color="warning">
                <Chip.Label>Chờ chủ duyệt</Chip.Label>
              </Chip>
            ) : isDepositPaid ? (
              <Chip size="sm" variant="soft" color="accent">
                <Chip.Label>Đang tạm giữ cọc</Chip.Label>
              </Chip>
            ) : (
              <Chip size="sm" variant="soft" color="danger">
                <Chip.Label>Cần nộp cọc</Chip.Label>
              </Chip>
            )}
          </View>

          <View className="flex-row justify-between items-baseline mb-2">
            <Text className="text-xs text-slate-600">
              Số tiền cọc xem phòng:
            </Text>
            <Text className="text-lg font-extrabold text-teal-700">
              {formatCurrency(item.coc || 0)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 pt-2 border-t border-slate-200">
            <Ionicons
              name={
                item.trangThai === "HOAN_THANH"
                  ? "checkmark-circle"
                  : item.trangThai === "HUY"
                    ? "close-circle"
                    : item.trangThai === "CHO_XAC_NHAN"
                      ? "time-outline"
                      : isDepositPaid
                        ? "shield-checkmark"
                        : "alert-circle"
              }
              size={16}
              color={
                item.trangThai === "HOAN_THANH"
                  ? "#10B981"
                  : item.trangThai === "HUY" ||
                      (!isDepositPaid && item.trangThai === "XAC_NHAN")
                    ? "#EF4444"
                    : item.trangThai === "CHO_XAC_NHAN"
                      ? "#D97706"
                      : "#0D9488"
              }
            />
            <Text className="text-[11px] text-slate-500 flex-1 leading-4">
              {item.trangThai === "HOAN_THANH"
                ? "Buổi xem phòng đã kết thúc. Số tiền cọc đã được hoàn trả nguyên vẹn 100% vào ví của bạn."
                : item.trangThai === "HUY"
                  ? `Lịch hẹn đã hủy. ${isDepositPaid ? "Tiền cọc đã được hoàn trả lại ví của bạn." : "Chưa nộp tiền cọc."}`
                  : item.trangThai === "CHO_XAC_NHAN"
                    ? "Yêu cầu đang chờ Chủ trọ xác nhận. Bạn chỉ cần nộp cọc giữ chân sau khi Chủ trọ đồng ý lịch xem."
                    : isDepositPaid
                      ? "Khoản cọc đang được InnFinder tạm giữ an toàn. Hệ thống sẽ hoàn lại 100% sau buổi xem phòng."
                      : "Chủ trọ đã đồng ý lịch hẹn! Vui lòng nộp cọc giữ chân để đảm bảo giữ chỗ xem phòng."}
            </Text>
          </View>
        </View>

        {/* 4. Bảng thông tin lịch hẹn */}
        <View className="py-2 border-b border-slate-100 gap-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Ngày hẹn xem</Text>
            <Text className="text-sm font-bold text-slate-900">
              {formatDate(item.ngayHen)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Chủ phòng trọ</Text>
            <Text className="text-sm font-bold text-slate-900">
              {item.tenChuTro || "Chủ trọ"}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">
              Số điện thoại liên hệ
            </Text>
            <Text className="text-sm font-bold text-slate-900">
              {item.sdtChuTro || "Đang cập nhật"}
            </Text>
          </View>
        </View>

        {/* 5. Dòng thời gian tiến độ xử lý */}
        <View className="py-4">
          <RentalTimeline status={item.trangThai} ngayHen={item.ngayHen} />
        </View>
      </ScrollView>

      {/* 7. NÚT HÀNH ĐỘNG ĐÁY MÀN HÌNH (CHUẨN THEO SWIMLANE 2.3) */}
      <View className="flex-row items-center gap-2.5 px-4 py-3 bg-white border-t border-slate-100">
        {/* KỊCH BẢN 1 & 2: Lịch hẹn đã duyệt & đã nộp cọc -> BƯỚC 4 & BƯỚC 5 SWIMLANE */}
        {item.trangThai === "XAC_NHAN" && isDepositPaid ? (
          !item.daNhanLaiCoc ? (
            <>
              <TouchableOpacity
                onPress={handleCallLandlord}
                className="w-12 h-12 rounded-xl bg-slate-100 items-center justify-center border border-slate-200"
              >
                <Ionicons name="call-outline" size={20} color="#0D9488" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Xác nhận nhận lại cọc",
                    "Chủ trọ đã hoàn trả 100% tiền cọc trực tiếp cho bạn khi gặp xem phòng chưa?",
                    [
                      { text: "Chưa nhận", style: "cancel" },
                      {
                        text: "Đã nhận đủ",
                        onPress: async () => {
                          const res = await confirmReceivedDeposit(item.maDatLich);
                          if (res.success) {
                            Alert.alert("Thành công", "Bạn đã xác nhận nhận lại cọc! Bây giờ bạn có thể quyết định thuê hoặc không thuê.");
                          } else {
                            Alert.alert("Lỗi", res.message || "Xác nhận thất bại");
                          }
                        },
                      },
                    ]
                  );
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 items-center justify-center"
              >
                <Text className="text-sm font-bold text-white">
                  Đã nhận lại cọc từ Chủ trọ
                </Text>
              </TouchableOpacity>
            </>
          ) : item.khachHangDongY === null || item.khachHangDongY === undefined ? (
            <>
              <TouchableOpacity
                onPress={handleCallLandlord}
                className="w-12 h-12 rounded-xl bg-slate-100 items-center justify-center border border-slate-200"
              >
                <Ionicons name="call-outline" size={20} color="#0D9488" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCancelModalVisible(true)}
                className="flex-1 py-3 rounded-xl border border-rose-300 bg-rose-50 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-rose-600">
                  Không thuê
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePressConfirmRental}
                disabled={isConfirmingRental}
                className="flex-[1.5] py-3 rounded-xl bg-teal-600 items-center justify-center"
              >
                {isConfirmingRental ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Xác nhận thuê
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View className="flex-1 py-3 px-4 rounded-xl bg-slate-100 items-center justify-center">
              <Text className="text-sm font-bold text-slate-700">
                {item.khachHangDongY ? "Bạn đã chọn: Thuê phòng (Đang chờ Chủ trọ)" : "Bạn đã chọn: Không thuê"}
              </Text>
            </View>
          )
        ) : item.trangThai === "XAC_NHAN" && !isDepositPaid ? (
          /* Khi chủ trọ đã duyệt lịch nhưng khách chưa nộp cọc */
          <>
            <TouchableOpacity
              onPress={() => setCancelModalVisible(true)}
              className="flex-1 py-3 rounded-xl border border-rose-500 items-center justify-center"
            >
              <Text className="text-sm font-semibold text-rose-500">
                Hủy yêu cầu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/booking/deposit-payment",
                  params: {
                    appointmentId: item.maDatLich,
                    roomId: item.maPhongTro,
                    roomTitle: item.tieuDePhong || `Phòng #${item.maPhongTro}`,
                    roomImage: item.hinhAnh || "",
                    depositAmount: String(item.coc || 0),
                    ngayHen: item.ngayHen,
                  },
                })
              }
              className="flex-[1.5] py-3 rounded-xl bg-teal-600 items-center justify-center"
            >
              <Text className="text-sm font-bold text-white">
                Nộp cọc ({formatCurrency(item.coc || 0)})
              </Text>
            </TouchableOpacity>
          </>
        ) : item.trangThai === "HOAN_THANH" ? (
          /* Nếu đã hoàn tất: Nút Đánh giá phòng hoặc Xem đánh giá */
          <>
            <TouchableOpacity
              onPress={handleCallLandlord}
              className="flex-1 py-3 rounded-xl border border-slate-300 bg-white items-center justify-center"
            >
              <Text className="text-sm font-semibold text-slate-800">
                Liên hệ chủ trọ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/booking/review",
                  params: {
                    roomId: item.maPhongTro,
                    roomTitle: item.tieuDePhong || `Phòng #${item.maPhongTro}`,
                    roomAddress: item.diaChiPhong || "",
                    roomImage: item.hinhAnh || "",
                  },
                })
              }
              className="flex-[1.5] py-3 rounded-xl bg-teal-600 items-center justify-center"
            >
              <Text className="text-sm font-bold text-white">
                {isReviewed ? "Xem đánh giá" : "Đánh giá phòng"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Trạng thái CHO_XAC_NHAN hoặc HUY */
          <>
            {item.trangThai === "CHO_XAC_NHAN" && (
              <TouchableOpacity
                onPress={() => setCancelModalVisible(true)}
                className="flex-1 py-3 rounded-xl border border-rose-500 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-rose-500">
                  Hủy yêu cầu
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCallLandlord}
              className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center"
            >
              <Text className="text-sm font-semibold text-white">
                Liên hệ chủ trọ
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <CancelReasonModal
        visible={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </SafeAreaView>
  );
}
