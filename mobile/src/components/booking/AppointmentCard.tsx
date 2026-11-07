import React from "react";
import { View, Text, Image, Pressable } from "react-native";
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
  onDetail: (maDatLich: string) => void;
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
  const canCancel =
    item.trangThai === "CHO_XAC_NHAN" || item.trangThai === "XAC_NHAN";
  const initials = getAvatarInitials(item.tenChuTro);

  return (
    <Pressable
      onPress={() => onDetail(item.maDatLich)}
      className="mb-3 active:opacity-95"
    >
      <Card className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        {/* Phần thân: Ảnh phòng bên trái + Nội dung bên phải (tương tự RoomCard horizontal) */}
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
                <Chip variant="soft" color={statusInfo.color} size="sm">
                  <Chip.Label className="text-[10px] font-bold">
                    {statusInfo.label}
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
        <View className="flex-row items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
          {canCancel ? (
            <Button
              variant="ghost"
              size="sm"
              className="px-1"
              onPress={() => onCancel(item.maDatLich)}
            >
              <Button.Label className="text-xs font-semibold text-rose-500">
                Hủy lịch hẹn
              </Button.Label>
            </Button>
          ) : (
            <View className="flex-1" />
          )}

          <View className="flex-row items-center gap-2">
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

            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 rounded-xl px-4 py-1.5 bg-slate-50 active:bg-slate-100"
              onPress={() => onDetail(item.maDatLich)}
            >
              <Button.Label className="text-xs font-semibold text-slate-700">
                Chi tiết
              </Button.Label>
            </Button>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
