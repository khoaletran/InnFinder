import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Dialog, Button, Chip, Card } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";

export interface DepositPaymentModalProps {
  visible: boolean;
  amount: number; // Mức cọc động theo loại phòng (Ví dụ: 150.000 hoặc 200.000)
  roomTitle: string;
  categoryName?: string;
  onClose: () => void;
  onConfirmPayment: (paymentMethod: string) => Promise<void>;
}

const PAYMENT_METHODS = [
  {
    id: "WALLET",
    title: "Ví điện tử InnFinder",
    desc: "Số dư khả dụng: 1.500.000 đ",
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

export const DepositPaymentModal: React.FC<DepositPaymentModalProps> = ({
  visible,
  amount,
  roomTitle,
  categoryName = "Phòng trọ",
  onClose,
  onConfirmPayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("WALLET");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(val) + " đ";
  };

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await onConfirmPayment(selectedMethod);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog isOpen={visible} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="w-[94%] max-w-lg p-5 rounded-3xl bg-white">
          <Dialog.Close />

          {/* 1. Header */}
          <View className="mb-3">
            <Dialog.Title className="text-lg font-bold text-slate-900">
              Thanh toán cọc giữ chân
            </Dialog.Title>
            <Dialog.Description className="text-xs text-slate-500 mt-0.5">
              Bước 6: Tạm giữ cọc trên hệ thống để đảm bảo lịch hẹn
            </Dialog.Description>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[460px]">
            {/* 2. Thẻ tóm tắt tiền cọc theo Loại phòng */}
            <Card className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-xs text-slate-500">Loại hình phòng</Text>
                <Chip size="sm" variant="soft" color="accent">
                  <Chip.Label>{categoryName}</Chip.Label>
                </Chip>
              </View>

              <Text
                className="text-sm font-semibold text-slate-800 mb-2"
                numberOfLines={1}
              >
                {roomTitle}
              </Text>

              <View className="flex-row justify-between items-baseline pt-2 border-t border-slate-200">
                <Text className="text-xs font-medium text-slate-600">
                  Số tiền cọc giữ chân:
                </Text>
                <Text className="text-xl font-extrabold text-teal-700">
                  {formatCurrency(amount)}
                </Text>
              </View>
            </Card>

            {/* 3. Cam kết bảo chứng hoàn trả 100% */}
            <View className="flex-row items-center gap-2.5 bg-teal-50/70 border border-teal-200 p-3 rounded-xl mb-4">
              <Ionicons name="shield-checkmark" size={22} color="#0D9488" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-teal-900">
                  Cam kết bảo vệ 100% từ InnFinder
                </Text>
                <Text className="text-[11px] text-teal-700 mt-0.5 leading-4">
                  Hệ thống chỉ tạm giữ số tiền này. Khoản cọc sẽ được hoàn trả 100% vào tài khoản của bạn ngay khi buổi xem phòng kết thúc.
                </Text>
              </View>
            </View>

            {/* 4. Danh sách phương thức thanh toán */}
            <Text className="text-xs font-bold text-slate-800 mb-2">
              Chọn phương thức nộp cọc:
            </Text>

            <View className="gap-2.5 mb-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => setSelectedMethod(method.id)}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-3 rounded-xl border ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${method.color}15` }}
                    >
                      <Ionicons name={method.icon as any} size={20} color={method.color} />
                    </View>

                    <View className="flex-1 mr-2">
                      <Text
                        className={`text-sm ${
                          isSelected ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {method.title}
                      </Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">
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

            {/* Hiển thị QR mẫu nếu chọn VietQR */}
            {selectedMethod === "VIETQR" && (
              <View className="items-center bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300 my-2">
                <Ionicons name="qr-code" size={100} color="#0F172A" />
                <Text className="text-xs font-bold text-slate-700 mt-2">
                  Quét mã QR qua App Ngân hàng
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Nội dung: COC {roomTitle.slice(0, 10)}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 5. Nút bấm hành động */}
          <View className="flex-row items-center gap-2.5 pt-3 border-t border-slate-100 mt-2">
            <Button
              variant="tertiary"
              size="md"
              onPress={onClose}
              isDisabled={isProcessing}
              className="flex-1"
            >
              <Button.Label className="text-slate-600">Để sau</Button.Label>
            </Button>

            <Button
              variant="primary"
              size="md"
              onPress={handlePay}
              isDisabled={isProcessing}
              className="flex-[2] bg-teal-600 rounded-xl"
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Button.Label className="font-bold text-white text-sm">
                  Thanh toán {formatCurrency(amount)}
                </Button.Label>
              )}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};