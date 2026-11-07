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
    reviewedRoomIds,
    refundWallet,
    paidAppointmentIds,
  } = useBookingStore();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

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

  const handleConfirmCancel = async (reason: string) => {
    setIsCanceling(true);
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

  // CÔNG CỤ DEV SIMULATOR: Giả lập Chủ trọ duyệt lịch để tự test
  const handleSimulateLandlordConfirm = async () => {
    setIsSimulating(true);
    try {
      await landlordService.confirmAppointment(item.maDatLich);
      await fetchAppointments();
      Alert.alert("Giả lập thành công", "Chủ trọ đã chấp nhận lịch hẹn!");
    } catch (err: any) {
      Alert.alert(
        "Lỗi giả lập",
        err.message || "Không thể giả lập duyệt lịch.",
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // CÔNG CỤ DEV SIMULATOR: Giả lập Chủ trọ hoàn tất xem phòng
  const handleSimulateLandlordComplete = async () => {
    setIsSimulating(true);
    try {
      await landlordService.completeRentalRequest(item.maDatLich);
      if (item.coc) {
        await refundWallet(item.coc);
      }
      await fetchAppointments();
      Alert.alert(
        "Hoàn tất buổi xem phòng!",
        "Hệ thống đã tự động hoàn trả 100% tiền cọc về ví của bạn.",
      );
    } catch (err: any) {
      Alert.alert("Lỗi giả lập", err.message || "Không thể giả lập hoàn tất.");
    } finally {
      setIsSimulating(false);
    }
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

        {/* 6. DEV SIMULATOR: Thanh giả lập Chủ trọ giúp TV3 tự test một mình */}
        <View className="bg-amber-50/80 border border-dashed border-amber-300 p-3.5 rounded-2xl mt-2 mb-4">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="construct-outline" size={16} color="#D97706" />
            <Text className="text-xs font-bold text-amber-900">
              Dev Helper (Tự test khi chưa có Chủ trọ)
            </Text>
          </View>
          <Text className="text-[11px] text-amber-700 mb-3 leading-4">
            Bấm các nút bên dưới để đóng vai Chủ trọ duyệt lịch và kết thúc buổi
            xem phòng:
          </Text>

          <View className="flex-row gap-2">
            {item.trangThai === "CHO_XAC_NHAN" && (
              <TouchableOpacity
                onPress={handleSimulateLandlordConfirm}
                disabled={isSimulating}
                className="flex-1 py-2 bg-amber-600 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-white">
                  1. Duyệt lịch xem
                </Text>
              </TouchableOpacity>
            )}

            {item.trangThai === "XAC_NHAN" &&
              (isDepositPaid ? (
                <TouchableOpacity
                  onPress={handleSimulateLandlordComplete}
                  disabled={isSimulating}
                  className="flex-1 py-2 bg-emerald-600 rounded-lg items-center"
                >
                  <Text className="text-xs font-bold text-white">
                    2. Hoàn tất xem & Hoàn cọc
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-1 py-2 bg-amber-200/80 rounded-lg items-center px-2">
                  <Text className="text-[11px] font-semibold text-amber-900 text-center">
                    (Cần nộp cọc giữ chân trước khi hoàn tất)
                  </Text>
                </View>
              ))}

            {item.trangThai === "HOAN_THANH" && (
              <View className="flex-1 py-2 bg-slate-200 rounded-lg items-center">
                <Text className="text-xs font-semibold text-slate-600">
                  ✓ Đã thông toàn bộ luồng
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 7. Nút hành động đáy màn hình */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-t border-slate-100">
        {/* Nút Nộp cọc giữ chân (Khi chủ trọ đã duyệt lịch nhưng chưa nộp cọc) */}
        {item.trangThai === "XAC_NHAN" && !isDepositPaid && (
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
            className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center"
          >
            <Text className="text-base font-bold text-white">
              Nộp cọc ({formatCurrency(item.coc || 0)})
            </Text>
          </TouchableOpacity>
        )}

        {/* Nếu đã hoàn tất: Nút Đánh giá phòng hoặc Xem đánh giá */}
        {item.trangThai === "HOAN_THANH" && (
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
            className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center"
          >
            <Text className="text-base font-bold text-white">
              {isReviewed ? "Xem đánh giá" : "Đánh giá phòng"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Nếu đang chờ hoặc đã xác nhận: Cho phép Hủy */}
        {(item.trangThai === "CHO_XAC_NHAN" ||
          item.trangThai === "XAC_NHAN") && (
          <TouchableOpacity
            onPress={() => setCancelModalVisible(true)}
            className="flex-1 py-3 rounded-xl border border-rose-500 items-center justify-center"
          >
            <Text className="text-base font-semibold text-rose-500">
              Hủy yêu cầu
            </Text>
          </TouchableOpacity>
        )}

        {/* Nút Gọi điện liên hệ */}
        {(item.trangThai !== "XAC_NHAN" || isDepositPaid) && (
          <TouchableOpacity
            onPress={handleCallLandlord}
            className={`flex-1 py-3 rounded-xl items-center justify-center ${
              item.trangThai === "HOAN_THANH"
                ? "border border-slate-300 bg-white"
                : "bg-teal-600"
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                item.trangThai === "HOAN_THANH"
                  ? "text-slate-800"
                  : "text-white"
              }`}
            >
              Liên hệ chủ trọ
            </Text>
          </TouchableOpacity>
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
