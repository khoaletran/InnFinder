import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'heroui-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GENDER_LABELS,
  inputStyle,
  RoommateForm,
  RoommateImage,
  roommateDate,
  roommatePrice,
} from '../../components/roommate/RoommateUI';
import { roommateApplySchema, roommateService } from '../../services/roommate.service';
import type {
  RoommateAppStatus,
  RoommateApplyInput,
  RoommateInput,
} from '../../services/roommate.service';
import { useAuthStore } from '../../store/useAuthStore';

const APP_STATUS_UI: Record<RoommateAppStatus, { label: string; bg: string; color: string }> = {
  CHO_DUYET: { label: 'Chờ chủ bài duyệt', bg: 'bg-amber-50', color: 'text-amber-800' },
  DA_DUYET: { label: 'Đã được duyệt', bg: 'bg-emerald-50', color: 'text-emerald-800' },
  TU_CHOI: { label: 'Đã bị từ chối', bg: 'bg-rose-50', color: 'text-rose-800' },
  DA_HUY: { label: 'Đã hủy đơn', bg: 'bg-slate-100', color: 'text-slate-600' },
};

export default function RoommateDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const [editing, setEditing] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const [applyPhone, setApplyPhone] = useState('');
  const [applyGender, setApplyGender] = useState<'NAM' | 'NU' | 'KHAC'>('NAM');
  const [applyJob, setApplyJob] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [applyError, setApplyError] = useState('');

  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ['roommates', 'detail', id, userId],
    queryFn: () => roommateService.detail(id),
    retry: false,
  });

  const post = detail.data;
  const open = post?.trangThai === 'DANG_TIM';
  const isOwner = Boolean(post?.chuBai);

  const myAppQuery = useQuery({
    queryKey: ['roommates', 'my-application', id, userId],
    queryFn: () => roommateService.myApplicationForPost(id),
    enabled: Boolean(userId) && Boolean(post) && !isOwner,
    retry: false,
  });

  const hostAppsQuery = useQuery({
    queryKey: ['roommates', 'applications', id, userId],
    queryFn: () => roommateService.applications(id),
    enabled: Boolean(userId) && isOwner,
    retry: false,
  });

  const comments = useInfiniteQuery({
    queryKey: ['roommates', 'comments', id],
    queryFn: ({ pageParam }) => roommateService.comments(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: detail.isSuccess,
    retry: false,
  });

  const refreshAll = () => client.invalidateQueries({ queryKey: ['roommates'] });

  const closeMutation = useMutation({
    mutationFn: () => roommateService.close(id),
    onSuccess: refreshAll,
  });

  const editMutation = useMutation({
    mutationFn: (input: RoommateInput) => roommateService.edit(id, input),
    onSuccess: async () => {
      await refreshAll();
      setEditing(false);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (input: RoommateApplyInput) => roommateService.apply(id, input),
    onSuccess: async () => {
      Alert.alert('Thành công', 'Đã gửi đơn đăng ký ở ghép!');
      setApplyModalOpen(false);
      setApplyPhone('');
      setApplyJob('');
      setApplyNote('');
      await refreshAll();
    },
    onError: (err: Error) => setApplyError(err.message),
  });

  const cancelAppMutation = useMutation({
    mutationFn: (appId: string) => roommateService.cancelApplication(id, appId),
    onSuccess: refreshAll,
  });

  const approveMutation = useMutation({
    mutationFn: (appId: string) => roommateService.approveApplication(id, appId),
    onSuccess: async () => {
      Alert.alert('Thành công', 'Đã duyệt người ở ghép!');
      await refreshAll();
    },
    onError: (err: Error) => Alert.alert('Lỗi', err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (appId: string) => roommateService.rejectApplication(id, appId),
    onSuccess: async () => {
      Alert.alert('Đã từ chối', 'Đã từ chối đơn đăng ký.');
      await refreshAll();
    },
    onError: (err: Error) => Alert.alert('Lỗi', err.message),
  });

  const send = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId?: string | null }) =>
      roommateService.comment(id, text, parentId),
    onSuccess: async (_res, vars) => {
      if (vars.parentId) {
        setReplyBody('');
        setReplyTo(null);
      } else {
        setBody('');
      }
      await client.invalidateQueries({ queryKey: ['roommates', 'comments', id] });
    },
  });

  const handleSubmitApply = () => {
    const res = roommateApplySchema.safeParse({
      sdtLienHe: applyPhone,
      gioiTinh: applyGender,
      ngheNghiep: applyJob,
      loiNhan: applyNote,
    });
    if (!res.success) {
      setApplyError(res.error.issues[0].message);
      return;
    }
    setApplyError('');
    applyMutation.mutate(res.data);
  };

  const myApp = myAppQuery.data;
  const hostApps = hostAppsQuery.data ?? [];

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: true, title: 'Chi tiết ở ghép' }} />
      <FlatList
        className="px-4"
        data={comments.data?.pages.flatMap((page) => page.items) ?? []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3 gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-slate-900">
                {item.tenNguoiViet}{item.chuBai ? ' · Chủ bài' : ''}
              </Text>
              {open && userId && (
                <Pressable
                  onPress={() => {
                    setReplyTo(replyTo?.id === item.id ? null : { id: item.id, author: item.tenNguoiViet });
                    setReplyBody('');
                  }}
                >
                  <Text className="text-xs font-bold text-teal-700">
                    {replyTo?.id === item.id ? 'Đóng' : 'Trả lời'}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text className="text-[11px] text-slate-500">{new Date(item.guiLuc).toLocaleString('vi-VN')}</Text>
            <Text className="text-sm text-slate-800">{item.noiDung}</Text>

            {item.replies && item.replies.length > 0 && (
              <View className="mt-1 gap-2 border-l-2 border-teal-200 pl-3">
                {item.replies.map((reply) => (
                  <View key={reply.id} className="rounded-xl bg-slate-50 p-2.5 gap-0.5">
                    <Text className="text-xs font-bold text-slate-900">
                      {reply.tenNguoiViet}{reply.chuBai ? ' · Chủ bài' : ''}
                    </Text>
                    <Text className="text-[11px] text-slate-400">
                      {new Date(reply.guiLuc).toLocaleString('vi-VN')}
                    </Text>
                    <Text className="text-sm text-slate-800">{reply.noiDung}</Text>
                  </View>
                ))}
              </View>
            )}

            {open && userId && replyTo?.id === item.id && (
              <View className="mt-1 gap-2 border-l-2 border-teal-200 pl-3">
                <Text className="text-xs text-slate-600">
                  Đang trả lời <Text className="font-bold text-slate-900">{replyTo.author}</Text>
                </Text>
                <TextInput
                  className={inputStyle}
                  placeholder="Nhập câu trả lời..."
                  multiline
                  maxLength={1000}
                  value={replyBody}
                  onChangeText={setReplyBody}
                />
                <View className="flex-row gap-2">
                  <Button
                    size="sm"
                    className="bg-teal-700"
                    isDisabled={!replyBody.trim() || send.isPending}
                    onPress={() => send.mutate({ text: replyBody.trim(), parentId: item.id })}
                  >
                    <Button.Label className="text-white">Gửi trả lời</Button.Label>
                  </Button>
                  <Button size="sm" variant="outline" onPress={() => setReplyTo(null)}>
                    Hủy
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}
        ListHeaderComponent={
          <View className="gap-4 py-4">
            {detail.isPending && <Text>Đang tải bài ở ghép…</Text>}
            {detail.error && <Text accessibilityRole="alert" className="text-red-700">{detail.error.message}</Text>}
            {post && (
              <>
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <RoommateImage url={post.anhPhong} />
                  <View className="gap-2.5 p-4">
                    <View className="flex-row flex-wrap gap-1.5">
                      <View className={`rounded-full px-2.5 py-1 ${open ? 'bg-teal-50' : 'bg-slate-100'}`}>
                        <Text className={`text-[11px] font-bold ${open ? 'text-teal-800' : 'text-slate-600'}`}>
                          {open
                            ? `Đang tìm (${post.soSlotDaDuyet ?? 0}/${post.soNguoiCanTim} chỗ đã nhận)`
                            : 'Đã đủ người'}
                        </Text>
                      </View>
                      <View className="rounded-full bg-slate-100 px-2.5 py-1">
                        <Text className="text-[11px] font-semibold text-slate-700">
                          {GENDER_LABELS[post.gioiTinhUuTien ?? 'KHONG_YEU_CAU']}
                        </Text>
                      </View>
                    </View>

                    <Text accessibilityRole="header" className="text-xl font-extrabold text-slate-900">
                      Cần thêm {post.soNguoiCanTim} người ở ghép
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {post.khuVuc} · {post.loaiPhong}
                    </Text>
                    <Text className="text-lg font-extrabold text-teal-700">
                      {roommatePrice(post.chiPhiMoiNguoi)}
                    </Text>
                    <Text className="text-xs text-slate-600">
                      Vào ở từ {roommateDate(post.ngayVaoO)} · Đăng bởi {post.tenNguoiDang || 'Thành viên'}
                    </Text>

                    {post.tieuChi && post.tieuChi.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 pt-1">
                        {post.tieuChi.map((tag) => (
                          <View key={tag} className="rounded-full bg-teal-50 px-2.5 py-1 border border-teal-200">
                            <Text className="text-[11px] font-semibold text-teal-800">{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text className="text-sm text-slate-700 leading-5 pt-1">{post.moTa}</Text>

                    {isOwner && open && (
                      <View className="gap-3 pt-2 border-t border-slate-100">
                        <View className="flex-row gap-2">
                          <Button variant="outline" className="flex-1" onPress={() => setEditing((v) => !v)}>
                            {editing ? 'Hủy sửa' : 'Sửa bài'}
                          </Button>
                          <Button
                            variant="secondary"
                            className="flex-1"
                            isDisabled={closeMutation.isPending || editMutation.isPending}
                            onPress={() =>
                              Alert.alert('Đóng bài ở ghép?', 'Bài sẽ ngừng nhận đơn và bình luận mới.', [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Đã đủ người', onPress: () => closeMutation.mutate() },
                              ])
                            }
                          >
                            Đã đủ người
                          </Button>
                        </View>
                        {editing && (
                          <RoommateForm
                            initial={post}
                            pending={editMutation.isPending || closeMutation.isPending}
                            error={editMutation.error}
                            onSave={editMutation.mutate}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* VAI TRÒ NGƯỜI ĐĂNG KÝ Ở GHÉP */}
                {!isOwner && (
                  <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-2.5">
                    <Text className="text-sm font-bold text-slate-900">Đăng ký ở ghép</Text>
                    {!userId ? (
                      <Button
                        className="bg-teal-700 rounded-xl"
                        onPress={() =>
                          router.push({ pathname: '/(auth)/login', params: { roommatePostId: id } })
                        }
                      >
                        <Button.Label className="text-white font-bold">
                          Đăng nhập để đăng ký ở ghép
                        </Button.Label>
                      </Button>
                    ) : myApp ? (
                      <View className="gap-2">
                        <View
                          className={`rounded-xl p-3 ${(APP_STATUS_UI[myApp.trangThai] || APP_STATUS_UI.CHO_DUYET).bg}`}
                        >
                          <Text
                            className={`text-xs font-bold ${(APP_STATUS_UI[myApp.trangThai] || APP_STATUS_UI.CHO_DUYET).color}`}
                          >
                            {(APP_STATUS_UI[myApp.trangThai] || APP_STATUS_UI.CHO_DUYET).label}
                          </Text>
                          <Text className="text-xs text-slate-600 mt-1">
                            {myApp.ngheNghiep} · {myApp.sdtLienHe}
                          </Text>
                        </View>
                        {myApp.trangThai === 'CHO_DUYET' && (
                          <Button
                            variant="outline"
                            isDisabled={cancelAppMutation.isPending}
                            onPress={() => cancelAppMutation.mutate(myApp.id)}
                          >
                            Hủy đơn đăng ký
                          </Button>
                        )}
                        {open && (myApp.trangThai === 'TU_CHOI' || myApp.trangThai === 'DA_HUY') && (
                          <Button className="bg-teal-700" onPress={() => setApplyModalOpen(true)}>
                            <Button.Label className="text-white font-bold">Gửi lại đơn</Button.Label>
                          </Button>
                        )}
                      </View>
                    ) : open ? (
                      <Button className="bg-teal-700 rounded-xl" onPress={() => setApplyModalOpen(true)}>
                        <Button.Label className="text-white font-bold">
                          Đăng ký ở ghép ngay
                        </Button.Label>
                      </Button>
                    ) : (
                      <Text className="text-xs text-slate-500">Bài đăng đã đủ người.</Text>
                    )}
                  </View>
                )}

                {/* VAI TRÒ CHỦ BÀI: QUẢN LÝ ĐƠN ĐĂNG KÝ */}
                {isOwner && (
                  <View className="rounded-2xl border border-slate-200 bg-white p-4 gap-3">
                    <Text className="text-sm font-bold text-slate-900">
                      Đơn đăng ký ở ghép ({hostApps.length})
                    </Text>
                    {hostApps.length === 0 ? (
                      <Text className="text-xs text-slate-500">Chưa có ai đăng ký.</Text>
                    ) : (
                      hostApps.map((app) => {
                        const st = APP_STATUS_UI[app.trangThai] || APP_STATUS_UI.CHO_DUYET;
                        return (
                          <View key={app.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 gap-1.5">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-sm font-bold text-slate-900">{app.tenNguoiDangKy}</Text>
                              <View className={`rounded-full px-2 py-0.5 ${st.bg}`}>
                                <Text className={`text-[10px] font-bold ${st.color}`}>{st.label}</Text>
                              </View>
                            </View>
                            <Text className="text-xs text-slate-600">
                              {app.ngheNghiep} · SĐT: {app.sdtLienHe}
                            </Text>
                            <Text className="text-xs text-slate-800">{app.loiNhan}</Text>
                            {app.trangThai === 'CHO_DUYET' && open && (
                              <View className="flex-row gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-emerald-600"
                                  isDisabled={approveMutation.isPending}
                                  onPress={() => approveMutation.mutate(app.id)}
                                >
                                  <Button.Label className="text-white font-bold">Duyệt</Button.Label>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  isDisabled={rejectMutation.isPending}
                                  onPress={() => rejectMutation.mutate(app.id)}
                                >
                                  Từ chối
                                </Button>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                <Text accessibilityRole="header" className="text-lg font-bold text-slate-900">
                  Hỏi đáp công khai
                </Text>
                {open &&
                  (userId ? (
                    <View className="gap-2">
                      <TextInput
                        accessibilityLabel="Câu hỏi hoặc phản hồi công khai"
                        className={inputStyle}
                        placeholder="Viết câu hỏi hoặc phản hồi công khai"
                        multiline
                        maxLength={1000}
                        value={body}
                        onChangeText={setBody}
                      />
                      {send.error && (
                        <Text accessibilityRole="alert" className="text-xs text-red-700">
                          {send.error.message}
                        </Text>
                      )}
                      <Button
                        className="bg-teal-700 rounded-xl"
                        isDisabled={!body.trim() || send.isPending}
                        onPress={() => send.mutate({ text: body.trim() })}
                      >
                        <Button.Label className="text-white font-bold">Gửi bình luận</Button.Label>
                      </Button>
                    </View>
                  ) : null)}
              </>
            )}
          </View>
        }
        ListEmptyComponent={comments.isSuccess ? <Text className="text-slate-500">Chưa có bình luận.</Text> : undefined}
        ListFooterComponent={
          comments.hasNextPage ? (
            <View className="pb-safe">
              <Button
                variant="outline"
                isDisabled={comments.isFetchingNextPage}
                onPress={() => void comments.fetchNextPage()}
              >
                Xem bình luận cũ hơn
              </Button>
            </View>
          ) : undefined
        }
      />

      {/* MODAL ĐĂNG KÝ Ở GHÉP */}
      <Modal visible={applyModalOpen} animationType="slide" transparent onRequestClose={() => setApplyModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView className="max-h-[85%] rounded-t-3xl bg-white p-5" keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-extrabold text-slate-900">Đăng ký ở ghép</Text>
              <Pressable onPress={() => setApplyModalOpen(false)} className="p-1">
                <Ionicons name="close" size={22} color="#334155" />
              </Pressable>
            </View>

            <View className="gap-3 pb-6">
              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Số điện thoại / Zalo *</Text>
                <TextInput
                  className={inputStyle}
                  placeholder="09xxxxxxxx"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={applyPhone}
                  onChangeText={setApplyPhone}
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Giới tính</Text>
                <View className="flex-row gap-2">
                  {(['NAM', 'NU', 'KHAC'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setApplyGender(g)}
                      className={`flex-1 items-center rounded-xl border py-2 ${
                        applyGender === g ? 'border-teal-700 bg-teal-50' : 'border-slate-200'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${applyGender === g ? 'text-teal-800' : 'text-slate-600'}`}>
                        {g === 'NAM' ? 'Nam' : g === 'NU' ? 'Nữ' : 'Khác'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Nghề nghiệp / Trường học *</Text>
                <TextInput
                  className={inputStyle}
                  placeholder="Ví dụ: Sinh viên ĐH Công Nghiệp"
                  maxLength={80}
                  value={applyJob}
                  onChangeText={setApplyJob}
                />
              </View>

              <View className="gap-1">
                <Text className="text-xs font-bold text-slate-700">Giới thiệu ngắn *</Text>
                <TextInput
                  className={inputStyle}
                  placeholder="Thói quen sinh hoạt, thời gian dự kiến vào ở..."
                  multiline
                  maxLength={500}
                  value={applyNote}
                  onChangeText={setApplyNote}
                />
              </View>

              {applyError ? (
                <Text className="text-xs font-semibold text-red-700">{applyError}</Text>
              ) : null}

              <Button
                className="bg-teal-700 rounded-xl mt-2"
                isDisabled={applyMutation.isPending}
                onPress={handleSubmitApply}
              >
                <Button.Label className="text-white font-bold">
                  {applyMutation.isPending ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
                </Button.Label>
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
