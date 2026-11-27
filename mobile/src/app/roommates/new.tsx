import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RoommateForm, RoommateImage } from '../../components/roommate/RoommateUI';
import { roommateService } from '../../services/roommate.service';
import type { RoommateInput } from '../../services/roommate.service';
import { useAuthStore } from '../../store/useAuthStore';

export default function RoommateCreateScreen() {
  const { bookingId = '' } = useLocalSearchParams<{ bookingId: string }>();
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const client = useQueryClient();
  const booking = useQuery({ queryKey: ['roommates', 'booking', userId, bookingId],
    queryFn: () => roommateService.booking(bookingId), enabled: !!userId && !!bookingId, retry: false });
  const create = useMutation({
    mutationFn: (input: RoommateInput) => roommateService.create(bookingId, input),
    onSuccess: (id) => {
      void client.invalidateQueries({ queryKey: ['roommates'] });
      router.replace({ pathname: '/roommates/[id]', params: { id } });
    },
  });

  if (!userId) return <Redirect href="/(auth)/login" />;
  if (booking.data?.baiDangId) return <Redirect href={{
    pathname: '/roommates/[id]', params: { id: booking.data.baiDangId },
  }} />;
  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: true, title: 'Tìm bạn ở ghép' }} />
      <View className="gap-4 p-4 pb-safe">
        {!bookingId ? <Text accessibilityRole="alert">Thiếu mã phiếu đặt lịch.</Text>
          : booking.isPending ? <Text>Đang xác minh phiếu thuê…</Text> : null}
        {booking.error && <Text accessibilityRole="alert" className="text-red-700">{booking.error.message}</Text>}
        {booking.data && <>
          <View className="overflow-hidden rounded-2xl bg-slate-50">
            <RoommateImage url={booking.data.anhPhong} />
            <Text className="p-3 font-semibold">{booking.data.loaiPhong} · Phiếu thuê đã hoàn thành</Text>
          </View>
          <RoommateForm pending={create.isPending} error={create.error} onSave={create.mutate} />
        </>}
      </View>
    </ScrollView>
  );
}
