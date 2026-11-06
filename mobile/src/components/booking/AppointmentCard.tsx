import React from "react";
import { View, Text, Image } from "react-native";
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
    <Card className="bg-white rounded-2xl border border-slate-200 p-3.5 mb-3.5 shadow-sm">
      {/* 1. Header: Ảnh phòng + Tiêu đề + Địa chỉ */}
      <Card.Header className="flex-row items-center mb-3">
        {item.hinhAnh ? (
          <Image
            source={{ uri: item.hinhAnh }}
            className="w-[62px] h-[62px] rounded-xl bg-slate-100"
            resizeMode="cover"
          />
        ) : (
          <View className="w-[62px] h-[62px] rounded-xl bg-slate-100 items-center justify-center">
            <Ionicons name="home-outline" size={24} color="#94A3B8" />
          </View>
        )}
        <View className="flex-1 ml-3 justify-center">
          <Card.Title
            className="text-[15px] font-bold text-slate-900 mb-1"
            numberOfLines={1}
          >
            {item.tieuDePhong || `Phòng trọ mã #${item.maPhongTro}`}
          </Card.Title>
          <Card.Description
            className="text-[13px] text-slate-500"
            numberOfLines={1}
          >
            {item.diaChiPhong || "Chưa cập nhật địa chỉ"}
          </Card.Description>
        </View>
      </Card.Header>

      {/* 2. Body: Ngày giờ + Chủ trọ + Badge trạng thái */}
      <Card.Body className="p-0">
        <View className="flex-row items-center mb-3">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#475569" />
            <Text className="text-[13px] text-slate-700 font-medium ml-1.5">
              {date}
            </Text>
          </View>
          <View className="flex-row items-center ml-4">
            <Ionicons name="time-outline" size={16} color="#475569" />
            <Text className="text-[13px] text-slate-700 font-medium ml-1.5">
              {time}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-3.5">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-emerald-100 justify-center items-center mr-2">
              <Text className="text-xs font-bold text-emerald-700">
                {initials}
              </Text>
            </View>
            <Text
              className="text-[13px] font-semibold text-slate-800"
              numberOfLines={1}
            >
              {item.tenChuTro || "Chủ trọ"}
            </Text>
          </View>

          <Chip variant="soft" color={statusInfo.color} size="sm">
            <Chip.Label>{statusInfo.label}</Chip.Label>
          </Chip>
        </View>
      </Card.Body>

      {/* 3. Footer: Nút Hủy, Đánh giá (nếu hoàn tất) & Chi tiết */}
      <Card.Footer className="flex-row justify-between items-center pt-2 border-t border-slate-100 p-0">
        {canCancel ? (
          <Button
            variant="ghost"
            size="sm"
            className="px-1"
            onPress={() => onCancel(item.maDatLich)}
          >
            <Button.Label className="text-sm font-semibold text-red-500">
              Hủy lịch
            </Button.Label>
          </Button>
        ) : (
          <View className="flex-1" />
        )}

        <View className="flex-row items-center gap-2">
          {/* Nút Đánh giá / Xem đánh giá khi lịch hẹn đã Hoàn tất */}
          {item.trangThai === "HOAN_THANH" &&
            (reviewedRoomIds.includes(item.maPhongTro) ? (
              <Button
                variant="outline"
                size="sm"
                className="border-teal-600 bg-teal-50/50 rounded-[10px] px-3.5 py-2"
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
                <Button.Label className="text-[13px] font-bold text-teal-700">
                  Xem đánh giá
                </Button.Label>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="bg-teal-600 rounded-[10px] px-4 py-2"
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
                <Button.Label className="text-[13px] font-bold text-white">
                  Đánh giá
                </Button.Label>
              </Button>
            ))}

          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 rounded-[10px] px-6 py-2 bg-white"
            onPress={() => onDetail(item.maDatLich)}
          >
            <Button.Label className="text-[13px] font-semibold text-slate-900">
              Chi tiết
            </Button.Label>
          </Button>
        </View>
      </Card.Footer>
    </Card>
  );
};
