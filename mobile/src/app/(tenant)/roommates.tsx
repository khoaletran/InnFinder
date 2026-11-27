import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'heroui-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inputStyle, RoommateBookingButton, RoommateCard, roommatePrice } from '../../components/roommate/RoommateUI';
import { roommateService } from '../../services/roommate.service';
import type { RoommateAppStatus, RoommateGender } from '../../services/roommate.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';

const APP_STATUS_LABEL: Record<RoommateAppStatus, { text: string; bg: string; color: string }> = {
  CHO_DUYET: { text: 'Chờ duyệt', bg: 'bg-amber-50', color: 'text-amber-800' },
  DA_DUYET: { text: 'Đã duyệt', bg: 'bg-emerald-50', color: 'text-emerald-800' },
  TU_CHOI: { text: 'Từ chối', bg: 'bg-rose-50', color: 'text-rose-800' },
  DA_HUY: { text: 'Đã hủy', bg: 'bg-slate-100', color: 'text-slate-600' },
};

export default function RoommatesScreen() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'MINE' | 'APPLICATIONS'>('ALL');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [gender, setGender] = useState<RoommateGender>('KHONG_YEU_CAU');
  const [filterError, setFilterError] = useState('');
  const [filters, setFilters] = useState<{ area?: string; maxPrice?: number; gender?: RoommateGender }>({});

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const { appointments, fetchAppointments } = useBookingStore();
  const client = useQueryClient();
  const effectiveTab = userId ? activeTab : 'ALL';

  useEffect(() => {
    if (createModalOpen && userId) {
      void fetchAppointments(true);
    }
  }, [createModalOpen, userId, fetchAppointments]);

  const completedBookings = appointments.filter((a) => a.trangThai === 'HOAN_THANH');

  const listQuery = useInfiniteQuery({
    queryKey:
      effectiveTab === 'MINE'
        ? ['roommates', 'mine', userId]
        : ['roommates', 'list', filters],
    queryFn: ({ pageParam }) =>
      effectiveTab === 'MINE'
        ? roommateService.mine(pageParam)
        : roommateService.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: effectiveTab !== 'APPLICATIONS',
    retry: false,
  });

  const myAppsQuery = useQuery({
    queryKey: ['roommates', 'my-applications', userId],
    queryFn: roommateService.myApplications,
    enabled: Boolean(userId) && effectiveTab === 'APPLICATIONS',
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ postId, appId }: { postId: string; appId: string }) =>
      roommateService.cancelApplication(postId, appId),
    onSuccess: async () => {
      Alert.alert('Thành công', 'Đã hủy đơn đăng ký ở ghép');
      await client.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (err: Error) => Alert.alert('Lỗi', err.message),
  });

  const Header = (
    <View className="gap-3 py-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text accessibilityRole="header" className="text-2xl font-extrabold text-slate-900">
          Tìm bạn ở ghép
        </Text>
        {userId && (
          <Button
            size="sm"
            className="bg-teal-700 rounded-xl"
            onPress={() => setCreateModalOpen(true)}
          >
            <Button.Label className="text-xs font-bold text-white">+ Tạo bài</Button.Label>
          </Button>
        )}
      </View>

      {userId && (
        <View className="flex-row rounded-xl bg-slate-200/70 p-1">
          {([
            { id: 'ALL', label: 'Khám phá' },
            { id: 'MINE', label: 'Bài của tôi' },
            { id: 'APPLICATIONS', label: 'Đơn đã gửi' },
          ] as const).map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 items-center rounded-lg py-2 ${
                effectiveTab === tab.id ? 'bg-white' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  effectiveTab === tab.id ? 'text-teal-800' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {effectiveTab === 'ALL' && (
        <View className="gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <TextInput
            accessibilityLabel="Khu vực"
            className={inputStyle}
            placeholder="Khu vực, ví dụ: Gò Vấp"
            maxLength={100}
            value={area}
            onChangeText={setArea}
          />
          <TextInput
            accessibilityLabel="Chi phí tối đa"
            className={inputStyle}
            placeholder="Chi phí tối đa (₫/người/tháng)"
            keyboardType="number-pad"
            maxLength={9}
            value={price}
            onChangeText={setPrice}
          />
          <View className="flex-row gap-2">
            {(['KHONG_YEU_CAU', 'NAM', 'NU'] as RoommateGender[]).map((g) => (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                className={`flex-1 items-center rounded-xl border py-2 ${
                  gender === g ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    gender === g ? 'text-teal-800' : 'text-slate-600'
                  }`}
                >
                  {g === 'KHONG_YEU_CAU' ? 'Tất cả' : g === 'NAM' ? 'Nam' : 'Nữ'}
                </Text>
              </Pressable>
            ))}
          </View>
          {filterError ? (
            <Text accessibilityRole="alert" className="text-xs text-red-700">
              {filterError}
            </Text>
          ) : null}
          <Button
            className="bg-teal-700 rounded-xl"
            onPress={() => {
              const maxPrice = price.trim() ? Number(price) : undefined;
              if (maxPrice !== undefined && (!Number.isInteger(maxPrice) || maxPrice < 0 || maxPrice > 100000000)) {
                setFilterError('Chi phí tối đa phải từ 0 đến 100.000.000 ₫');
                return;
              }
              setFilterError('');
              setFilters({
                area: area.trim() || undefined,
                maxPrice,
                gender: gender !== 'KHONG_YEU_CAU' ? gender : undefined,
              });
            }}
          >
            <Button.Label className="text-white font-bold">Lọc bài</Button.Label>
          </Button>
        </View>
      )}
    </View>
  );

  if (effectiveTab === 'APPLICATIONS') {
    return (
      <View className="flex-1 bg-slate-50 pt-safe">
        <FlatList
          className="px-4"
          data={myAppsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={Header}
          renderItem={({ item }) => {
            const st = APP_STATUS_LABEL[item.trangThai] || APP_STATUS_LABEL.CHO_DUYET;
            return (
              <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 gap-2">
                <View className="flex-row items-start justify-between gap-2">
                  <Pressable
                    className="flex-1"
                    onPress={() => router.push({ pathname: '/roommates/[id]', params: { id: item.postId } })}
                  >
                    <Text className="text-sm font-bold text-slate-900">
                      {item.khuVuc} · {item.loaiPhong}
                    </Text>
                    <Text className="text-xs font-bold text-teal-700 mt-0.5">
                      {roommatePrice(item.chiPhiMoiNguoi)}
                    </Text>
                  </Pressable>
                  <View className={`rounded-full px-2.5 py-1 ${st.bg}`}>
                    <Text className={`text-[11px] font-bold ${st.color}`}>{st.text}</Text>
                  </View>
                </View>

                {item.trangThai === 'TU_CHOI' && item.lyDoTuChoi && (
                  <Text className="text-xs text-rose-700">Lý do: {item.lyDoTuChoi}</Text>
                )}

                <View className="flex-row gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => router.push({ pathname: '/roommates/[id]', params: { id: item.postId } })}
                  >
                    Xem bài
                  </Button>
                  {item.trangThai === 'CHO_DUYET' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={cancelMutation.isPending}
                      onPress={() => cancelMutation.mutate({ postId: item.postId, appId: item.id })}
                    >
                      Hủy đơn
                    </Button>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            myAppsQuery.isPending ? (
              <Text className="text-slate-600">Đang tải đơn đã gửi…</Text>
            ) : (
              <Text className="text-slate-600">Bạn chưa gửi đơn đăng ký ở ghép nào.</Text>
            )
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 pt-safe">
      <FlatList
        className="px-4"
        data={listQuery.data?.pages.flatMap((page) => page.items) ?? []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <View className="mb-3">
            <RoommateCard post={item} />
          </View>
        )}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          listQuery.error ? (
            <Text accessibilityRole="alert" className="text-red-700">
              {listQuery.error.message}
            </Text>
          ) : listQuery.isPending ? (
            <Text className="text-slate-600">Đang tải bài ở ghép…</Text>
          ) : effectiveTab === 'MINE' ? (
            <Link href="/(tenant)/appointments" className="font-semibold text-teal-700">
              Xem lịch hẹn để đăng bài
            </Link>
          ) : (
            <Text className="text-slate-600">Chưa có bài ở ghép phù hợp.</Text>
          )
        }
        ListFooterComponent={
          <View className="gap-2 pb-6">
            {listQuery.hasNextPage && (
              <Button
                variant="outline"
                isDisabled={listQuery.isFetchingNextPage}
                onPress={() => void listQuery.fetchNextPage()}
              >
                Xem thêm bài
              </Button>
            )}
          </View>
        }
      />

      <Modal
        visible={createModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView className="max-h-[80%] rounded-t-3xl bg-white p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-extrabold text-slate-900">Chọn phòng đã thuê để đăng bài</Text>
              <Pressable onPress={() => setCreateModalOpen(false)} className="p-1">
                <Ionicons name="close" size={22} color="#334155" />
              </Pressable>
            </View>
            {completedBookings.length === 0 ? (
              <View className="py-6 gap-2 items-center">
                <Text className="text-xs text-slate-500 text-center">
                  Bạn cần có lịch xem phòng đã hoàn thành thuê phòng mới có thể tạo bài tìm bạn ở ghép.
                </Text>
              </View>
            ) : (
              <View className="gap-3 pb-6">
                {completedBookings.map((apt) => (
                  <View key={apt.maDatLich} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 gap-2">
                    <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                      {apt.tieuDePhong || `Phòng #${apt.maPhongTro}`}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {apt.diaChiPhong}
                    </Text>
                    <RoommateBookingButton id={apt.maDatLich} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
