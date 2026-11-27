import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import { StatusBadge } from '@/components/common/TableParts';
import { AdminErrorState } from '@/components/common/AdminStates';
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
    <div className="mx-auto max-w-[1280px] space-y-6">
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
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Header className="p-4 border-b border-border flex flex-row items-center justify-between">
            <Card.Title className="text-sm font-semibold text-text">
              Danh sách đánh giá ({filteredReviews.length})
            </Card.Title>
          </Card.Header>

          <Card.Content className="p-0 divide-y divide-border/70">
            {filteredReviews.map((rev) => {
              const isHidden = rev.trangThai === 'AN';
              return (
                <div key={rev.maDanhGia} className="px-5 py-4 hover:bg-surface-subtle transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-semibold text-text text-sm">{rev.nguoiDanhGia}</span>
                      <span className="text-text-subtle text-xs mx-2">•</span>
                      <span className="text-text-secondary text-xs font-medium">
                        {rev.tenPhongTro}
                      </span>
                      <code className="ml-2 text-xs font-mono text-text-muted">
                        #{rev.phongTroId}
                      </code>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.diem ? 'fill-current text-warning-text' : 'text-border'
                            }`}
                          />
                        ))}
                      </div>
                      <StatusBadge
                        dotClass={isHidden ? 'bg-tone-slate-dot' : 'bg-tone-green-dot'}
                        className={
                          isHidden
                            ? 'bg-surface-muted text-text-muted'
                            : 'bg-success-bg text-success-text'
                        }
                      >
                        {isHidden ? 'Tạm ẩn' : 'Hiển thị'}
                      </StatusBadge>
                    </div>
                  </div>

                  <p
                    className={`mb-3 text-[13px] leading-relaxed ${
                      isHidden ? 'text-text-muted italic' : 'text-text-secondary'
                    }`}
                  >
                    "{rev.noiDung || 'Khách thuê đánh giá sao không kèm nhận xét'}"
                  </p>

                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Thời gian gửi: {formatDateTime(rev.thoiGian)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingReview(rev)}
                        className="px-2.5 py-1 rounded-lg bg-danger-bg hover:opacity-90 text-danger-text font-medium flex items-center gap-1 cursor-pointer transition-opacity"
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
              className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleteReviewMutation.isPending}
              onClick={() => deletingReview && deleteReviewMutation.mutate(deletingReview.maDanhGia)}
              className="px-4 py-2 rounded-lg bg-danger-text hover:opacity-90 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-opacity"
            >
              {deleteReviewMutation.isPending && <Spinner size="sm" color="current" />}
              Xóa vĩnh viễn
            </button>
          </>
        }
      >
        {deletingReview && (
          <div className="space-y-2 text-xs text-text-secondary">
            <p>
              Bạn có chắc chắn muốn xóa đánh giá của{' '}
              <strong className="font-semibold text-text">{deletingReview.nguoiDanhGia}</strong> khỏi hệ thống không? Thao tác này không thể hoàn tác.
            </p>
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border text-text-secondary italic">
              "{deletingReview.noiDung}"
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
