import { Card } from '@heroui/react';
import { ArrowRight, Calendar, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common/PageContainer';
import { roomService } from '@/services/room.service';
import { roommateService } from '@/services/roommate.service';
import type { RoommateGender, RoommatePost } from '@/services/roommate.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVNDShort } from '@/utils/formatters';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export const roommatePrice = (price: number) => currency.format(price) + '/người/tháng';
export const roommateDate = (date: string) => date.split('-').reverse().join('/');

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

export function RoommateCards({ posts, preview = false }: { posts: RoommatePost[]; preview?: boolean }) {
  const missingPhotoRoomIds = Array.from(
    new Set(posts.filter((p) => !p.anhPhong && p.maPhongTro).map((p) => p.maPhongTro)),
  );

  const roomDetailQueries = useQueries({
    queries: missingPhotoRoomIds.map((roomId) => ({
      queryKey: ['rooms', 'detail', roomId],
      queryFn: () => roomService.getRoomDetail(roomId),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const fallbackPhotoByRoomId = new Map<string, string>();
  const roomAreaByRoomId = new Map<string, number>();
  missingPhotoRoomIds.forEach((roomId, idx) => {
    const detail = roomDetailQueries[idx]?.data;
    const firstPhoto =
      (detail?.dsHinhAnh?.[0] as { url?: string; duongDan?: string } | undefined)?.url ||
      (detail?.dsHinhAnh?.[0] as { duongDan?: string } | undefined)?.duongDan ||
      detail?.hinhAnh?.[0]?.duongDan;
    if (firstPhoto) {
      fallbackPhotoByRoomId.set(roomId, firstPhoto);
    }
    if (detail?.dienTich) {
      roomAreaByRoomId.set(roomId, detail.dienTich);
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => {
        const remaining = Math.max(0, post.soNguoiCanTim - (post.soSlotDaDuyet ?? 0));
        const isClosed = post.trangThai === 'DA_DU_NGUOI' || remaining === 0;
        const genderText = GENDER_LABELS[post.gioiTinhUuTien ?? 'KHONG_YEU_CAU'] || GENDER_LABELS.KHONG_YEU_CAU;
        const coverPhoto = post.anhPhong || fallbackPhotoByRoomId.get(post.maPhongTro) || null;
        const roomArea = roomAreaByRoomId.get(post.maPhongTro);

        return (
          <Link
            key={post.id}
            to={'/roommates/' + post.id}
            className={preview && index === 2 ? 'hidden lg:block group' : 'group'}
          >
            <Card className="h-full bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs overflow-hidden transition-all duration-200 flex flex-col justify-between p-0 cursor-pointer">
              <div>
                <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={post.khuVuc}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-teal-50/70 text-teal-700">
                      <Users size={32} aria-hidden />
                    </div>
                  )}

                  <span
                    className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs ${
                      isClosed ? 'bg-slate-900/85 text-white' : 'bg-teal-600 text-white'
                    }`}
                  >
                    {isClosed ? 'Đã đủ người' : `Còn ${remaining}/${post.soNguoiCanTim} chỗ`}
                  </span>

                  {post.gioiTinhUuTien && post.gioiTinhUuTien !== 'KHONG_YEU_CAU' && (
                    <span className="absolute top-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
                      {genderText}
                    </span>
                  )}
                </div>

                <Card.Content className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-teal-700 transition-colors">
                      Cần thêm {post.soNguoiCanTim} người ở ghép
                    </h3>
                    {roomArea ? (
                      <span className="text-xs font-semibold text-slate-600 shrink-0">
                        {roomArea} m²
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-extrabold text-teal-700 tracking-tight">
                      {formatVNDShort(post.chiPhiMoiNguoi, '/người')}
                    </span>
                    <span className="text-xs text-slate-600 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {roommateDate(post.ngayVaoO)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{post.khuVuc}</span>
                  </div>

                  {post.tieuChi && post.tieuChi.length > 0 && (
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {post.tieuChi.slice(0, 3).join(' · ')}
                      {post.tieuChi.length > 3 && ` · +${post.tieuChi.length - 3}`}
                    </p>
                  )}
                </Card.Content>
              </div>

              <Card.Footer className="px-4 pb-4 pt-2.5 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-medium text-slate-600 truncate pr-2">
                  {post.loaiPhong || 'Phòng trọ'}
                </span>
                <span className="text-sm font-semibold text-teal-700 group-hover:text-teal-800 flex items-center gap-1 py-1 shrink-0">
                  Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Card.Footer>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function RoommateBookingLink({ id }: { id: string }) {
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const isChuTro = useAuthStore((state) => state.isChuTro);
  const booking = useQuery({
    queryKey: ['roommates', 'booking', userId, id],
    queryFn: () => roommateService.booking(id),
    enabled: !!userId && !isChuTro,
    retry: false,
  });
  if (isChuTro) return null;
  const postId = booking.data?.baiDangId;
  return (
    <Link
      to={postId ? '/roommates/' + postId : '/appointments/' + id + '/roommates'}
      className="block rounded-xl border border-teal-700 bg-teal-50/50 hover:bg-teal-50 px-4 py-2.5 text-center text-xs font-bold text-teal-800 transition-colors"
    >
      {postId ? 'Quản lý bài ở ghép' : 'Tìm bạn ở ghép'}
    </Link>
  );
}

export function RoommateLanding() {
  const query = useQuery({
    queryKey: ['roommates', 'preview'],
    queryFn: () => roommateService.list({ limit: 3 }),
    retry: false,
  });
  return (
    <PageContainer width="wide" className="py-10 space-y-6">
      <section aria-labelledby="roommate-heading" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="roommate-heading" className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Tìm người ở ghép
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Xem các phòng đang tìm bạn ở ghép, đăng ký tham gia hoặc hỏi trực tiếp dưới bài.
            </p>
          </div>
          <Link
            to="/roommates"
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 shrink-0"
          >
            <span>Xem tất cả bài ở ghép</span>
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        {query.data?.items.length ? (
          <RoommateCards posts={query.data.items} preview />
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {query.isPending
              ? 'Đang tải bài ở ghép…'
              : query.isError
                ? 'Chưa tải được bài ở ghép.'
                : 'Chưa có bài tìm người ở ghép.'}
          </p>
        )}
      </section>
    </PageContainer>
  );
}
