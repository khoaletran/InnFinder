import React, { useState } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { Dialog, Button, Chip } from 'heroui-native';

export interface CancelReasonModalProps {
  visible: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

// 4 lý do mẫu thường gặp
const QUICK_REASONS = [
  'Bận việc đột xuất',
  'Đã tìm được phòng khác',
  'Thời gian không phù hợp',
  'Đổi ý định thuê khu vực này',
];

export const CancelReasonModal: React.FC<CancelReasonModalProps> = ({
  visible,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const [selectedQuickReason, setSelectedQuickReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const finalReason = customReason.trim() || selectedQuickReason;

  const handleSelectQuick = (reason: string) => {
    if (selectedQuickReason === reason) {
      setSelectedQuickReason('');
    } else {
      setSelectedQuickReason(reason);
      setCustomReason('');
    }
  };

  const handleConfirm = () => {
    if (!finalReason) return;
    onConfirm(finalReason);
  };

  return (
    <Dialog isOpen={visible} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="w-[90%] max-w-md p-5 rounded-2xl bg-content1">
          <Dialog.Close />

          <View className="mb-4">
            <Dialog.Title className="text-lg font-bold text-foreground">
              Hủy lịch xem phòng
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground mt-1">
              Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này
            </Dialog.Description>
          </View>

          {/* Danh sách lý do nhanh dạng Chip của HeroUI Native */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {QUICK_REASONS.map((reason) => {
              const isSelected = selectedQuickReason === reason;
              return (
                <Chip
                  key={reason}
                  variant={isSelected ? 'primary' : 'secondary'}
                  color={isSelected ? 'accent' : 'default'}
                  size="sm"
                  onPress={() => handleSelectQuick(reason)}
                >
                  <Chip.Label>{reason}</Chip.Label>
                </Chip>
              );
            })}
          </View>

          {/* Ô nhập lý do chi tiết */}
          <View className="mb-5">
            <TextInput
              className="border border-divider bg-muted/20 rounded-xl p-3 text-sm text-foreground min-h-[75px]"
              placeholder="Hoặc nhập lý do khác..."
              placeholderTextColor="#94A3B8"
              value={customReason}
              onChangeText={(text) => {
                setCustomReason(text);
                if (text) setSelectedQuickReason('');
              }}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Các nút hành động HeroUI Button */}
          <View className="flex-row justify-end gap-3">
            <Button
              variant="tertiary"
              size="sm"
              onPress={onClose}
              isDisabled={isLoading}
            >
              <Button.Label>Giữ lại lịch</Button.Label>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onPress={handleConfirm}
              isDisabled={!finalReason || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Button.Label>Xác nhận hủy</Button.Label>
              )}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
