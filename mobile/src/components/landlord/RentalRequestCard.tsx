import React from 'react';
import { View, Text } from 'react-native';
import { Card, Button } from 'heroui-native';
import { LandlordRentalRequestItem } from '../../types/landlord.types';

interface Props {
  request: LandlordRentalRequestItem;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

export const RentalRequestCard: React.FC<Props> = ({ request, onConfirm, onReject }) => {
  return (
    <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
      {/* Khách hàng & SĐT */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-9 h-9 rounded-full bg-teal-100 items-center justify-center">
            <Text className="text-xs font-bold text-teal-800">
              {request.khachHangTen.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-900">{request.khachHangTen}</Text>
            <Text className="text-xs text-gray-400">{request.sdt}</Text>
          </View>
        </View>

        <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Text className="text-[11px] font-semibold text-amber-700">Chờ duyệt</Text>
        </View>
      </View>

      {/* Phòng & Giá */}
      <View className="my-1">
        <Text className="text-sm font-bold text-gray-900">{request.phongTen}</Text>
        <Text className="text-sm font-semibold text-teal-700">
          {(request.giaThue / 1000000).toFixed(1)} triệu/tháng
        </Text>
      </View>

      {/* Chi tiết hợp đồng */}
      <View className="bg-gray-50 p-2.5 rounded-xl my-2 gap-y-1">
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Ngày dự kiến nhận phòng:</Text>
          <Text className="text-xs font-semibold text-gray-800">{request.ngayNhanPhong}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Thời gian thuê:</Text>
          <Text className="text-xs font-semibold text-gray-800">{request.thoiGianThue}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Số người ở:</Text>
          <Text className="text-xs font-semibold text-gray-800">{request.soNguoi} người</Text>
        </View>
      </View>

      {/* Ghi chú */}
      {request.ghiChu && (
        <Text className="text-xs text-gray-500 italic mb-3">"{request.ghiChu}"</Text>
      )}

      {/* 2 nút hành động */}
      <View className="flex-row gap-2 mt-1">
        <View className="flex-1">
          <Button
            variant="outline"
            size="sm"
            onPress={() => onReject(request.id)}
            className="w-full border-gray-200"
          >
            <Button.Label className="text-gray-600 text-xs font-medium">Từ chối</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="primary"
            size="sm"
            onPress={() => onConfirm(request.id)}
            className="w-full bg-teal-700"
          >
            <Button.Label className="text-white text-xs font-bold">Xác nhận</Button.Label>
          </Button>
        </View>
      </View>
    </Card>
  );
};
