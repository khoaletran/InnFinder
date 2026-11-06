import React from "react";
import { View, Text } from "react-native";
import { Card } from "heroui-native";
import { TransactionResponse, TrangThaiGD } from "../../types/booking.types";

export interface TransactionCardProps {
  item: TransactionResponse;
}

// Map trạng thái khớp đúng 4 giá trị của TrangThaiGD.java
const getStatusBadge = (status: TrangThaiGD) => {
  switch (status) {
    case "THANH_CONG":
      return {
        label: "Thành công",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
      };
    case "CHO_THANH_TOAN":
      return {
        label: "Đang xử lý",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
      };
    case "HOAN_TIEN":
      return {
        label: "Hoàn tiền",
        bgColor: "bg-sky-50",
        textColor: "text-sky-700",
      };
    case "THAT_BAI":
    default:
      return {
        label: "Thất bại",
        bgColor: "bg-rose-50",
        textColor: "text-rose-600",
      };
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

const formatDateTime = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
};

export const TransactionCard: React.FC<TransactionCardProps> = ({ item }) => {
  const badge = getStatusBadge(item.trangThai);

  return (
    <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-3.5 shadow-none">
      {/* 1. Mã giao dịch & Badge trạng thái */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs text-slate-400 font-medium">
          Mã: #{item.maGiaoDich}
        </Text>
        <View className={`${badge.bgColor} px-2.5 py-1 rounded-lg`}>
          <Text className={`text-xs font-semibold ${badge.textColor}`}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* 2. Nội dung giao dịch */}
      <Text
        className="text-base font-bold text-slate-900 mb-1.5"
        numberOfLines={1}
      >
        {item.noiDung}
      </Text>

      {/* 3. Số tiền biến động */}
      <Text className="text-lg font-bold text-teal-600 mb-2">
        {formatCurrency(item.soTien)}
      </Text>

      {/* 4. Thời gian giao dịch & Loại giao dịch */}
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-slate-400 font-medium">
          {formatDateTime(item.ngayGiaoDich)}
        </Text>
        <Text className="text-xs text-slate-400 font-medium">
          {item.loaiGiaoDich}
        </Text>
      </View>
    </Card>
  );
};
