import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { formatDateTime } from '@/utils/formatters';
import type { AdminReviewItem } from '@/types/admin.types';

type StarTabKey = '5' | '4' | '3' | '2' | '1';

export const ReviewsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState<StarTabKey>('5');
  const [deletingReview, setDeletingReview] = useState<AdminReviewItem | null>(null);

  const {
    data: reviews = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => adminService.getAllRoomReviews(),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => adminService.deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Đã xóa đánh giá vi phạm tiêu chuẩn cộng đồng');
      setDeletingReview(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa đánh giá');
    },
  });

  const starCounts = useMemo(() => {
    const counts: Record<StarTabKey, number> = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    };
    for (const r of reviews) {
      const k = String(r.diem) as StarTabKey;
      if (k in counts) {
        counts[k]++;
      }
    }
    return counts;
  }, [reviews]);

  const filteredReviews = reviews.filter((r) => r.diem === Number(ratingFilter));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Kiểm duyệt Đánh giá & Nhận xét
        </h1>

        <AdminRefreshButton
          onClick={() => void refetch()}
          isRefreshing={isFetching}
          label="Làm mới đánh giá"
        />
      </div>

      {/* Star Rating Filter */}
      <StatusTabBar
        ariaLabel="Lọc đánh giá theo số sao"
        activeKey={ratingFilter}
        onChange={setRatingFilter}
        tabs={(['5', '4', '3', '2', '1'] as const).map((star) => ({
          key: star,
          label: `${star} sao`,
          count: starCounts[star],
          icon: Star,
        }))}
      />

      {/* Main Content */}
      {isLoading ? (
        <SkeletonList variant="rows" count={4} />
      ) : isError ? (
        <AdminErrorState
          title="Không thể tải danh sách đánh giá"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : filteredReviews.length > 0 ? (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Header className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-800">
              Danh sách đánh giá ({filteredReviews.length})
            </Card.Title>
          </Card.Header>

          <Card.Content className="p-0 divide-y divide-slate-100">
            {filteredReviews.map((rev) => {
              const isHidden = rev.trangThai === 'AN';
              return (
                <div key={rev.maDanhGia} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{rev.nguoiDanhGia}</span>
                      <span className="text-slate-400 text-xs mx-2">•</span>
                      <span className="text-slate-600 text-xs font-semibold">
                        {rev.tenPhongTro}
                      </span>
                      <code className="ml-2 text-[10px] font-mono text-teal-700">
                        #{rev.phongTroId}
                      </code>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.diem ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={isHidden ? 'default' : 'success'}
                        className="font-bold"
                      >
                        {isHidden ? 'Tạm ẩn' : 'Hiển thị'}
                      </Chip>
                    </div>
                  </div>

                  <p
                    className={`text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 ${
                      isHidden ? 'text-slate-400 italic' : 'text-slate-700'
                    }`}
                  >
                    "{rev.noiDung || 'Khách thuê đánh giá sao không kèm nhận xét'}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Thời gian gửi: {formatDateTime(rev.thoiGian)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingReview(rev)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card.Content>
        </Card>
      ) : (
        <EmptyState
          title="Chưa có đánh giá nào"
          description="Hiện tại chưa có nhận xét hoặc đánh giá phòng trọ nào khớp với tiêu chí lọc."
          icon={<MessageSquare className="w-7 h-7" />}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA ĐÁNH GIÁ */}
      <Modal
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        title="Xác nhận xóa đánh giá vi phạm"
        subtitle={
          deletingReview
            ? `Mã đánh giá #${deletingReview.maDanhGia} • ${deletingReview.tenPhongTro}`
            : undefined
        }
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletingReview(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleteReviewMutation.isPending}
              onClick={() => deletingReview && deleteReviewMutation.mutate(deletingReview.maDanhGia)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {deleteReviewMutation.isPending && <Spinner size="sm" color="current" />}
              Xóa vĩnh viễn
            </button>
          </>
        }
      >
        {deletingReview && (
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Bạn có chắc chắn muốn xóa đánh giá của{' '}
              <strong className="text-slate-900">{deletingReview.nguoiDanhGia}</strong> khỏi hệ thống không? Thao tác này không thể hoàn tác.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic">
              "{deletingReview.noiDung}"
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
