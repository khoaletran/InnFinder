import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Button } from 'heroui-native';
import { useQuery } from '@tanstack/react-query';
import { roommateSchema, roommateService } from '../../services/roommate.service';
import type { RoommateGender, RoommateInput, RoommatePost } from '../../services/roommate.service';
import { useAuthStore } from '../../store/useAuthStore';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export const roommatePrice = (price: number) => currency.format(price) + '/người/tháng';
export const roommateDate = (date: string) => date.split('-').reverse().join('/');
export const inputStyle = 'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900';

export const GENDER_LABELS: Record<RoommateGender, string> = {
  NAM: 'Ưu tiên Nam',
  NU: 'Ưu tiên Nữ',
  KHONG_YEU_CAU: 'Không yêu cầu giới tính',
};

export const ROOMMATE_CRITERIA_PRESETS = [
  'Không hút thuốc',
  'Giờ giấc tự do',
  'Sinh viên',
  'Người đi làm',
  'Sạch sẽ, gọn gàng',
  'Nấu ăn chung',
  'Yên tĩnh',
  'Không thú cưng',
];

export function RoommateImage({ url }: { url: string | null }) {
  return url ? (
    <Image source={url} style={{ height: 168, width: '100%' }} contentFit="cover" />
  ) : (
    <View className="h-32 items-center justify-center bg-teal-50">
      <Ionicons name="people-outline" size={32} color="#0F766E" />
    </View>
  );
}

export function RoommateCard({ post }: { post: RoommatePost }) {
  const remaining = Math.max(0, post.soNguoiCanTim - (post.soSlotDaDuyet ?? 0));
  const isClosed = post.trangThai === 'DA_DU_NGUOI' || remaining === 0;

  return (
    <Link href={{ pathname: '/roommates/[id]', params: { id: post.id } }} asChild>
      <Pressable
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white active:opacity-95"
        accessibilityRole="link"
      >
        <View className="relative">
          <RoommateImage url={post.anhPhong} />
          <View className="absolute left-3 top-3 flex-row gap-1.5">
            <View
              className={`rounded-full px-2.5 py-1 ${
                isClosed ? 'bg-slate-900/80' : 'bg-teal-700/90'
              }`}
            >
              <Text className="text-[11px] font-bold text-white">
                {isClosed ? 'Đã đủ người' : `Còn ${remaining}/${post.soNguoiCanTim} chỗ`}
              </Text>
            </View>
          </View>
          {post.gioiTinhUuTien && post.gioiTinhUuTien !== 'KHONG_YEU_CAU' && (
            <View className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                {GENDER_LABELS[post.gioiTinhUuTien]}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5 p-4">
          <Text className="text-base font-bold text-slate-900">
            Cần thêm {post.soNguoiCanTim} người ở ghép
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} color="#0F766E" />
            <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
              {post.khuVuc} · {post.loaiPhong}
            </Text>
          </View>
          <Text className="text-base font-extrabold text-teal-700">
            {roommatePrice(post.chiPhiMoiNguoi)}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text className="text-xs text-slate-600">Vào ở từ {roommateDate(post.ngayVaoO)}</Text>
          </View>

          {post.tieuChi && post.tieuChi.length > 0 && (
            <View className="mt-1 flex-row flex-wrap gap-1.5">
              {post.tieuChi.slice(0, 3).map((tag) => (
                <View key={tag} className="rounded-lg bg-slate-100 px-2 py-0.5">
                  <Text className="text-[11px] font-medium text-slate-700">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

export function RoommateLanding() {
  const query = useQuery({
    queryKey: ['roommates', 'preview'],
    queryFn: () => roommateService.list({ limit: 2 }),
    retry: false,
  });
  return (
    <View className="gap-3 px-4 py-5">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-lg font-bold text-slate-900">Tìm người ở ghép</Text>
        <Link href="/(tenant)/roommates" className="font-semibold text-teal-700">
          Xem tất cả
        </Link>
      </View>
      {query.data?.items.length ? (
        query.data.items.map((post) => <RoommateCard key={post.id} post={post} />)
      ) : (
        <Text className="text-slate-600">
          {query.isPending
            ? 'Đang tải bài ở ghép…'
            : query.isError
              ? 'Chưa tải được bài ở ghép.'
              : 'Chưa có bài tìm người ở ghép.'}
        </Text>
      )}
    </View>
  );
}

export function RoommateBookingButton({ id }: { id: string }) {
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const isChuTro = useAuthStore((state) => Boolean(state.user?.chuTro));
  const booking = useQuery({
    queryKey: ['roommates', 'booking', userId, id],
    queryFn: () => roommateService.booking(id),
    enabled: !!userId && !isChuTro,
    retry: false,
  });
  if (isChuTro) return null;
  const postId = booking.data?.baiDangId;
  return (
    <Button
      variant="outline"
      onPress={() =>
        postId
          ? router.push({ pathname: '/roommates/[id]', params: { id: postId } })
          : router.push({ pathname: '/roommates/new', params: { bookingId: id } })
      }
    >
      <Button.Label>{postId ? 'Quản lý bài ở ghép' : 'Tìm bạn ở ghép'}</Button.Label>
    </Button>
  );
}

export function RoommateForm({
  initial,
  pending,
  error,
  onSave,
}: {
  initial?: RoommateInput;
  pending: boolean;
  error: Error | null;
  onSave: (input: RoommateInput) => void;
}) {
  const [area, setArea] = useState(initial?.khuVuc ?? '');
  const [people, setPeople] = useState(String(initial?.soNguoiCanTim ?? 1));
  const [price, setPrice] = useState(initial ? String(initial.chiPhiMoiNguoi) : '');
  const [date, setDate] = useState(initial?.ngayVaoO ?? '');
  const [gender, setGender] = useState<RoommateGender>(initial?.gioiTinhUuTien ?? 'KHONG_YEU_CAU');
  const [criteria, setCriteria] = useState<string[]>(initial?.tieuChi ?? []);
  const [description, setDescription] = useState(initial?.moTa ?? '');
  const [validation, setValidation] = useState('');

  const toggleCriterion = (tag: string) => {
    setCriteria((prev) =>
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : prev.length >= 8
          ? prev
          : [...prev, tag],
    );
  };

  function submit() {
    if (!price.trim()) {
      setValidation('Vui lòng nhập chi phí mỗi người');
      return;
    }
    const result = roommateSchema.safeParse({
      khuVuc: area,
      soNguoiCanTim: Number(people),
      chiPhiMoiNguoi: Number(price),
      ngayVaoO: date.trim(),
      moTa: description,
      gioiTinhUuTien: gender,
      tieuChi: criteria,
    });
    if (!result.success) {
      setValidation(result.error.issues[0].message);
      return;
    }
    setValidation('');
    onSave(result.data);
  }

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Text className="text-xs font-bold text-slate-700">Khu vực phòng trọ *</Text>
        <TextInput
          accessibilityLabel="Khu vực"
          className={inputStyle}
          maxLength={100}
          value={area}
          onChangeText={setArea}
          placeholder="Ví dụ: Gò Vấp, gần ĐH Công Nghiệp"
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="text-xs font-bold text-slate-700">Số người cần tìm *</Text>
          <TextInput
            accessibilityLabel="Số người cần tìm"
            className={inputStyle}
            keyboardType="number-pad"
            maxLength={2}
            value={people}
            onChangeText={setPeople}
          />
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-xs font-bold text-slate-700">Chi phí (₫/người) *</Text>
          <TextInput
            accessibilityLabel="Chi phí mỗi người mỗi tháng"
            className={inputStyle}
            keyboardType="number-pad"
            maxLength={9}
            value={price}
            onChangeText={setPrice}
            placeholder="1800000"
          />
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold text-slate-700">Ngày có thể vào ở (YYYY-MM-DD) *</Text>
        <TextInput
          accessibilityLabel="Ngày có thể vào ở"
          className={inputStyle}
          autoCorrect={false}
          maxLength={10}
          value={date}
          onChangeText={setDate}
          placeholder="2026-12-01"
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold text-slate-700">Giới tính ưu tiên</Text>
        <View className="flex-row gap-2">
          {(['KHONG_YEU_CAU', 'NAM', 'NU'] as RoommateGender[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              className={`flex-1 items-center rounded-xl border py-2.5 ${
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
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold text-slate-700">
          Tiêu chí & thói quen ({criteria.length}/8)
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ROOMMATE_CRITERIA_PRESETS.map((tag) => {
            const active = criteria.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleCriterion(tag)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-teal-700 bg-teal-700' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-bold text-slate-700">Mô tả chi tiết *</Text>
        <TextInput
          accessibilityLabel="Mô tả"
          className={inputStyle}
          multiline
          maxLength={1500}
          value={description}
          onChangeText={setDescription}
          placeholder="Chia sẻ giờ giấc, chia điện nước, yêu cầu bạn ở ghép..."
        />
      </View>

      <View className="flex-row items-start gap-2 rounded-xl bg-teal-50 p-3 border border-teal-100">
        <Ionicons name="shield-checkmark-outline" size={16} color="#0F766E" />
        <Text className="flex-1 text-xs text-teal-900">
          Bài đăng công khai. Chỉ ghi khu vực, tránh đăng số nhà cụ thể hoặc số điện thoại.
        </Text>
      </View>

      {validation || error ? (
        <Text accessibilityRole="alert" className="text-xs font-semibold text-red-700">
          {validation || error?.message}
        </Text>
      ) : null}

      <Button onPress={submit} isDisabled={pending} className="bg-teal-700 rounded-xl">
        <Button.Label className="text-white font-bold">
          {initial ? 'Lưu thay đổi' : 'Đăng bài tìm bạn ở ghép'}
        </Button.Label>
      </Button>
    </View>
  );
}
