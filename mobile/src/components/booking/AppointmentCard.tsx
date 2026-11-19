import React from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Button } from "heroui-native";
import { router } from "expo-router";
import {
  AppointmentResponse,
  TrangThaiDatLich,
} from "../../types/booking.types";
import { useBookingStore } from "../../store/useBookingStore";

interface AppointmentCardProps {
  item: AppointmentResponse;
  onCancel: (maDatLich: string) => void;
  onDetail?: (maDatLich: string) => void;
}

const getAvatarInitials = (name?: string): string => {
  if (!name || name.trim() === "") return "CT";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const formatDateTime = (isoString?: string) => {
  if (!isoString) return { date: "--/--/----", time: "--:--" };
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}`,
    };
  } catch {
    return { date: isoString, time: "" };
  }
};

const STATUS_CONFIG: Record<
  TrangThaiDatLich,
  { label: string; color: "warning" | "success" | "accent" | "danger" }
> = {
  CHO_XAC_NHAN: {
    label: "Chờ xác nhận",
    color: "warning",
  },
  XAC_NHAN: {
    label: "Đã xác nhận",
    color: "success",
  },
  HOAN_THANH: {
    label: "Hoàn tất",
    color: "accent",
  },
  HUY: {
    label: "Đã hủy",
    color: "danger",
  },
};

const getCancelledByText = (
  liDoHuy?: string,
  khachHangDongY?: boolean | null,
): string => {
  if (khachHangDongY === false) return "Bạn đã từ chối thuê";
  if (!liDoHuy || liDoHuy.trim() === "") return "Đã hủy lịch";
  const lower = liDoHuy.toLowerCase();
  if (lower.includes("chủ trọ") || lower.includes("chutro")) {
    return "Chủ trọ đã hủy";
  }
  return "Bạn đã hủy";
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  item,
  onCancel,
  onDetail,
}) => {
  const { date, time } = formatDateTime(item.ngayHen);
  const statusInfo = STATUS_CONFIG[item.trangThai] || {
    label: item.trangThai,
    color: "default" as any,
  };
  const reviewedRoomIds = useBookingStore((s) => s.reviewedRoomIds);
  const paidAppointmentIds = useBookingStore((s) => s.paidAppointmentIds);
  const confirmReceivedDeposit = useBookingStore((s) => s.confirmReceivedDeposit);
  const submitCustomerDecision = useBookingStore((s) => s.submitCustomerDecision);
  const isDepositPaid = !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich);

  const canCancel =
    item.trangThai === "CHO_XAC_NHAN" || item.trangThai === "XAC_NHAN";
  const initials = getAvatarInitials(item.tenChuTro);

  const handleCardPress = () => {
    if (onDetail) {
      onDetail(item.maDatLich);
    } else {
      router.push(`/booking/rental-detail?id=${item.maDatLich}`);
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
      className="mb-3 active:opacity-95"
    >
      <Card className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        {/* Phần thân: Ảnh phòng bên trái + Nội dung bên phải */}
        <View className="flex-row">
          {item.hinhAnh ? (
            <Image
              source={{ uri: item.hinhAnh }}
              style={{ width: 92, height: 92, borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: 92, height: 92, borderRadius: 12 }}
              className="bg-slate-100 items-center justify-center border border-slate-200"
            >
              <Ionicons name="home-outline" size={28} color="#94A3B8" />
            </View>
          )}

          <View className="flex-1 ml-3.5 justify-between py-0.5">
            <View>
              <View className="flex-row items-center justify-between gap-1 mb-1">
                <Text
                  numberOfLines={1}
                  className="text-base font-bold text-slate-800 flex-1 mr-1.5"
                >
                  {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
                </Text>
                <Chip
                  variant="soft"
                  color={
                    item.trangThai === "XAC_NHAN" && !isDepositPaid
                      ? "danger"
                      : statusInfo.color
                  }
                  size="sm"
                >
                  <Chip.Label className="text-[10px] font-bold">
                    {item.trangThai === "XAC_NHAN" && !isDepositPaid
                      ? "Chờ nộp cọc"
                      : statusInfo.label}
                  </Chip.Label>
                </Chip>
              </View>

              <Text numberOfLines={1} className="text-xs text-slate-500 mb-2">
                {item.diaChiPhong || "Chưa cập nhật địa chỉ"}
              </Text>
            </View>

            {/* Thông tin lịch hẹn: Ngày & Giờ */}
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={13} color="#0D9488" />
                <Text className="text-xs font-semibold text-slate-700">
                  {date}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={13} color="#0D9488" />
                <Text className="text-xs font-semibold text-slate-700">
                  {time}
                </Text>
              </View>
            </View>

            {/* Chủ trọ */}
            <View className="flex-row items-center mt-1.5">
              <View className="w-4 h-4 rounded-full bg-teal-50 border border-teal-200 items-center justify-center mr-1.5">
                <Text className="text-[8px] font-bold text-teal-700">
                  {initials}
                </Text>
              </View>
              <Text numberOfLines={1} className="text-xs text-slate-600 font-medium">
                {item.tenChuTro || "Chủ trọ"}
              </Text>
            </View>
          </View>
        </View>

        {/* Hàng nút tác vụ bên dưới */}
        {item.trangThai === "HUY" ? (
          <View className="flex-row items-center justify-between pt-2 mt-2 border-t border-slate-100">
            <Text className="text-[11px] text-slate-400">
              Lý do hủy
            </Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="close-circle-outline" size={13} color="#E11D48" />
              <Text className="text-xs text-rose-600 font-semibold">
                {getCancelledByText(item.liDoHuy, item.khachHangDongY)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
            {/* Nút Hủy lịch: Button bo viền nằm về phía bên trái của các nút tác vụ khác */}
            {canCancel && !item.daNhanLaiCoc && (
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 bg-rose-50/70 rounded-xl px-3 py-1.5 active:bg-rose-100"
                onPress={() => onCancel(item.maDatLich)}
              >
                <Button.Label className="text-xs font-semibold text-rose-600">
                  Hủy lịch
                </Button.Label>
              </Button>
            )}

            {/* Nút Nộp cọc khi chưa nộp cọc (áp dụng cho cả Chờ duyệt và Đã duyệt) */}
            {!isDepositPaid && (item.trangThai === "CHO_XAC_NHAN" || item.trangThai === "XAC_NHAN") && (
              <Button
                variant="primary"
                size="sm"
                className="bg-teal-600 rounded-xl px-3.5 py-1.5"
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
              >
                <Button.Label className="text-xs font-bold text-white">
                  Nộp cọc
                </Button.Label>
              </Button>
            )}

            {/* BƯỚC 4 SWIMLANE: Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực */}
            {item.trangThai === "XAC_NHAN" && isDepositPaid && !item.daNhanLaiCoc && (
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 rounded-xl px-3 py-1.5"
                onPress={() => {
                  Alert.alert(
                    "Xác nhận nhận lại cọc",
                    "Chủ trọ đã trả lại đủ tiền cọc trực tiếp cho bạn tại buổi xem phòng chưa?",
                    [
                      { text: "Chưa nhận", style: "cancel" },
                      {
                        text: "Đã nhận đủ",
                        onPress: async () => {
                          const res = await confirmReceivedDeposit(item.maDatLich);
                          if (res.success) {
                            Alert.alert("Thành công", "Đã xác nhận nhận lại cọc! Hãy đưa ra quyết định thuê phòng.");
                          } else {
                            Alert.alert("Lỗi", res.message || "Xác nhận không thành công");
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Button.Label className="text-xs font-bold text-white">
                  Đã nhận cọc
                </Button.Label>
              </Button>
            )}

            {/* BƯỚC 5 SWIMLANE: Khách hàng đưa ra quyết định thuê / không thuê sau khi đã nhận lại cọc */}
            {item.trangThai === "XAC_NHAN" && isDepositPaid && item.daNhanLaiCoc && (
              item.khachHangDongY === null || item.khachHangDongY === undefined ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 bg-rose-50 rounded-xl px-2.5 py-1.5"
                    onPress={() => onCancel(item.maDatLich)}
                  >
                    <Button.Label className="text-xs font-semibold text-rose-600">
                      Không thuê
                    </Button.Label>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-teal-600 rounded-xl px-3 py-1.5"
                    onPress={async () => {
                      const res = await submitCustomerDecision(item.maDatLich, true);
                      if (res.success) {
                        if (res.isCompleted) {
                          Alert.alert(
                            "Thuê phòng thành công!",
                            "Chúc mừng bạn! Cả hai bên đã đồng ý thuê phòng. Hợp đồng thuê phòng đã chính thức hoàn tất thành công!"
                          );
                        } else {
                          Alert.alert(
                            "Đã ghi nhận lựa chọn!",
                            "Bạn đã chọn Thuê phòng! Đang chờ Chủ trọ xác nhận trên ứng dụng để hoàn tất."
                          );
                        }
                      } else {
                        Alert.alert("Lỗi", res.message || "Gửi quyết định thất bại");
                      }
                    }}
                  >
                    <Button.Label className="text-xs font-bold text-white">
                      Thuê phòng
                    </Button.Label>
                  </Button>
                </>
              ) : (
                <Chip
                  variant="soft"
                  color={item.khachHangDongY ? "success" : "danger"}
                  size="sm"
                >
                  <Chip.Label className="text-[10px] font-bold">
                    {item.khachHangDongY ? "Chờ chủ trọ chốt" : "Đã từ chối thuê"}
                  </Chip.Label>
                </Chip>
              )
            )}

            {/* Nút Đánh giá / Xem đánh giá khi lịch hẹn đã Hoàn tất */}
            {item.trangThai === "HOAN_THANH" &&
              (reviewedRoomIds.includes(item.maPhongTro) ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-teal-600 bg-teal-50/50 rounded-xl px-3 py-1.5"
                  onPress={() =>
                    router.push({
                      pathname: "/booking/review",
                      params: {
                        roomId: item.maPhongTro,
                        roomTitle:
                          item.tieuDePhong || `Phòng #${item.maPhongTro}`,
                        roomAddress: item.diaChiPhong || "",
                        roomImage: item.hinhAnh || "",
                      },
                    })
                  }
                >
                  <Button.Label className="text-xs font-bold text-teal-700">
                    Xem đánh giá
                  </Button.Label>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-teal-600 rounded-xl px-3.5 py-1.5"
                  onPress={() =>
                    router.push({
                      pathname: "/booking/review",
                      params: {
                        roomId: item.maPhongTro,
                        roomTitle:
                          item.tieuDePhong || `Phòng #${item.maPhongTro}`,
                        roomAddress: item.diaChiPhong || "",
                        roomImage: item.hinhAnh || "",
                      },
                    })
                  }
                >
                  <Button.Label className="text-xs font-bold text-white">
                    Đánh giá
                  </Button.Label>
                </Button>
              ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
};
