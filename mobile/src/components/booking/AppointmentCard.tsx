import React from "react";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Button } from "heroui-native";
import {
  AppointmentResponse,
  TrangThaiDatLich,
} from "../../types/booking.types";

interface AppointmentCardProps {
  item: AppointmentResponse;
  onCancel: (maDatLich: string) => void;
  onDetail: (maDatLich: string) => void;
}

/**
 * Lấy 2 chữ cái đầu của tên chủ trọ (Ví dụ: "Minh Tuấn" -> "MI")
 */
const getAvatarInitials = (name?: string): string => {
  if (!name || name.trim() === "") return "CT";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Định dạng ngày giờ: "14/10/2026" & "09:00"
 */
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

/**
 * Cấu hình Badge dùng màu chuẩn semantic của HeroUI Chip
 */
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

  const canCancel =
    item.trangThai === "CHO_XAC_NHAN" || item.trangThai === "XAC_NHAN";
  const initials = getAvatarInitials(item.tenChuTro);

  return (
    <Card className="bg-white rounded-2xl border border-slate-200 p-3.5 mb-3.5 shadow-sm">
      {/* 1. Header: Ảnh phòng + Tiêu đề + Địa chỉ */}
      <Card.Header className="flex-row items-center mb-3">
        <Image
          source={{
            uri:
              item.hinhAnh ||
              "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&auto=format&fit=crop&q=80",
          }}
          className="w-[62px] h-[62px] rounded-xl bg-slate-100"
          resizeMode="cover"
        />
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
            {item.diaChiPhong || "TP. Hồ Chí Minh"}
          </Card.Description>
        </View>
      </Card.Header>

      {/* 2. Body: Ngày giờ + Chủ trọ + Badge trạng thái HeroUI */}
      <Card.Body className="p-0">
        {/* Ngày giờ hẹn xem */}
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

        {/* Chủ trọ & Chip trạng thái HeroUI */}
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

      {/* 3. Footer: Nút Hủy lịch (HeroUI Ghost) & Chi tiết (HeroUI Outline) */}
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

        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 rounded-[10px] px-7 py-2 bg-white"
          onPress={() => onDetail(item.maDatLich)}
        >
          <Button.Label className="text-[13px] font-semibold text-slate-900">
            Chi tiết
          </Button.Label>
        </Button>
      </Card.Footer>
    </Card>
  );
};
