import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { CheckCircle2, Clock, Compass, XCircle, Eye, MapPin, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { tour360Service } from '@/services/tour360.service';
import { Modal } from '@/components/common/Modal';
import { Tour360ViewerModal } from '@/components/tour360/Tour360ViewerModal';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import {
  AdminErrorState,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';
import type { AdminPostItem } from '@/types/admin.types';
import type { TrangThaiPhongTro } from '@/types/room.types';

export const PostsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TrangThaiPhongTro>('CHO_DUYET');
  const [previewRoom, setPreviewRoom] = useState<AdminPostItem | null>(null);
  const [tour360Open, setTour360Open] = useState(false);

  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: previewRoomTour } = useQuery({
    queryKey: ['rooms', 'tour-360', previewRoom?.maPhongTro],
    queryFn: () => tour360Service.getRoomTour(previewRoom!.maPhongTro),
    enabled: Boolean(previewRoom?.maPhongTro),
    retry: false,
  });

  const {
    data: allRooms = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'rooms', 'all'],
    queryFn: () => adminService.getAllRooms(),
  });

  const handleRefresh = () => {
    void refetch();
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminService.approveRoom(id),
    onSuccess: () => {
      toast.success('Phê duyệt bài đăng thành công! Phòng đã được hiển thị công khai.');
      setPreviewRoom(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi phê duyệt bài đăng');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.rejectRoom(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối bài đăng và gửi thông báo tới Chủ trọ');
      setRejectingRoomId(null);
      setRejectReason('');
      setPreviewRoom(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi từ chối bài đăng');
    },
  });

  const handleConfirmReject = () => {
    if (!rejectingRoomId) return;
    const reason =
      rejectReason.trim() ||
      'Thông tin phòng hoặc hình ảnh không đáp ứng tiêu chuẩn kiểm duyệt của sàn';
    rejectMutation.mutate({ id: rejectingRoomId, reason });
  };

  const renderRoomStatusChip = (status: TrangThaiPhongTro) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-warning-bg text-warning-text">
            Chờ duyệt
          </span>
        );
      case 'DA_DUYET':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-success-bg text-success-text">
            Đã duyệt
          </span>
        );
      case 'HOAN_THANH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-accent-soft text-accent">
            Đã thuê
          </span>
        );
      case 'HUY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap bg-danger-bg text-danger-text">
            Đã hủy / Từ chối
          </span>
        );
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<TrangThaiPhongTro, number> = {
      CHO_DUYET: 0,
      DA_DUYET: 0,
      HOAN_THANH: 0,
      HUY: 0,
    };
    for (const room of allRooms) {
      if (room.trangThai && room.trangThai in counts) {
        counts[room.trangThai]++;
      }
    }
    return counts;
  }, [allRooms]);

  const currentList = allRooms.filter((r) => r.trangThai === statusFilter);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Status Tab Bar (giống mẫu tab Lịch xem phòng) */}
      <StatusTabBar
        ariaLabel="Lọc bài đăng theo trạng thái"
        activeKey={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { key: 'CHO_DUYET', label: 'Chờ duyệt', count: statusCounts.CHO_DUYET, icon: Clock },
          {
            key: 'DA_DUYET',
            label: 'Đã duyệt',
            count: statusCounts.DA_DUYET,
            icon: CheckCircle2,
          },
          {
            key: 'HOAN_THANH',
            label: 'Đã thuê',
            count: statusCounts.HOAN_THANH,
            icon: ShieldCheck,
          },
          {
            key: 'HUY',
            label: 'Đã hủy / Từ chối',
            count: statusCounts.HUY,
            icon: XCircle,
          },
        ]}
      />

      {/* Main Table Card */}
      {isError ? (
        <AdminErrorState
          title="Không thể tải danh sách bài đăng phòng trọ"
          message={error instanceof Error ? error.message : undefined}
          onRetry={handleRefresh}
        />
      ) : (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table aria-label="Kiểm duyệt phòng" className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Mã & Phòng trọ</th>
                  <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Giá thuê / Tháng</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Địa chỉ</th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">Chủ trọ</th>
                  <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  <AdminTableSkeleton rows={6} cols={5} />
                ) : currentList.length > 0 ? (
                  currentList.map((room) => {
                    const coverImg =
                      room.hinhAnh?.[0] ||
                      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';
                    const displayTitle = room.tieuDe || `Phòng #${room.maPhongTro}`;
                    return (
                      <tr key={room.maPhongTro} className="hover:bg-surface-subtle transition-colors">
                        <td className="py-3 px-4 min-w-[260px]">
                          <div className="flex items-center gap-3">
                            <img
                              src={coverImg}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <div
                                title={displayTitle}
                                className="font-semibold text-text max-w-xs truncate"
                              >
                                {displayTitle}
                              </div>
                              <code className="text-[11px] text-accent font-mono">
                                {room.maPhongTro}
                              </code>
                              <div className="text-[11px] text-text-muted whitespace-nowrap">
                                {room.dienTich} m² • {room.soNguoi} người
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                          <div className="font-semibold text-text">{formatVND(room.giaThue)}</div>
                          <div className="text-[11px] text-text-muted whitespace-nowrap">
                            Cọc HĐ: {formatVND(room.cocPhong)}
                          </div>
                        </td>
                        <td
                          title={room.diaChi}
                          className="py-3 px-4 text-text-secondary max-w-[240px] truncate"
                        >
                          {room.diaChi}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-text whitespace-nowrap">
                            {room.tenChuTro || 'Chủ trọ'}
                          </div>
                          <div className="text-[11px] text-text-muted whitespace-nowrap">
                            {room.sdtChuTro}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap w-px">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewRoom(room)}
                              title="Xem chi tiết kiểm duyệt"
                              className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-soft rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {room.trangThai === 'CHO_DUYET' && (
                              <>
                                <button
                                  type="button"
                                  disabled={approveMutation.isPending}
                                  onClick={() => approveMutation.mutate(room.maPhongTro)}
                                  title="Phê duyệt bài đăng"
                                  className="p-1.5 text-success-text hover:bg-success-bg rounded-lg transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingRoomId(room.maPhongTro);
                                    setRejectReason('');
                                  }}
                                  title="Từ chối duyệt"
                                  className="p-1.5 text-danger-text hover:bg-danger-bg rounded-lg transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      Không có bài đăng nào trong danh sách này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* MODAL CHI TIẾT DUYỆT BÀI ĐĂNG */}
      <Modal
        isOpen={!!previewRoom}
        onClose={() => setPreviewRoom(null)}
        title={previewRoom ? previewRoom.tieuDe || `Phòng #${previewRoom.maPhongTro}` : 'Chi tiết bài đăng'}
        subtitle={previewRoom ? `Mã phòng trọ: ${previewRoom.maPhongTro}` : undefined}
        maxWidth="2xl"
        footer={
          previewRoom?.trangThai === 'CHO_DUYET' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setRejectingRoomId(previewRoom.maPhongTro);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-lg border border-danger-border bg-surface text-danger-text hover:bg-danger-bg text-xs font-medium cursor-pointer transition-colors"
              >
                Từ chối duyệt bài
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(previewRoom.maPhongTro)}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {approveMutation.isPending && <Spinner size="sm" color="current" />}
                Phê duyệt hiển thị
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPreviewRoom(null)}
              className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-secondary text-xs font-medium cursor-pointer transition-colors"
            >
              Đóng
            </button>
          )
        }
      >
        {previewRoom && (
          <div className="space-y-4">
            {/* Photo Gallery */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-medium text-text-secondary">
                  Hình ảnh chụp thực tế ({previewRoom.hinhAnh?.length || 0} ảnh)
                </span>
                {previewRoomTour && previewRoomTour.nodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTour360Open(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover cursor-pointer transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Xem Tour 360° ({previewRoomTour.nodeCount} góc)</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {previewRoom.hinhAnh?.map((img, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-lg border border-border overflow-hidden bg-surface-subtle"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-surface-subtle border border-border rounded-lg">
                <span className="text-[11px] text-text-muted block">Giá thuê</span>
                <span className="font-semibold text-accent tabular-nums">
                  {formatVND(previewRoom.giaThue)} / tháng
                </span>
              </div>
              <div className="p-3 bg-surface-subtle border border-border rounded-lg">
                <span className="text-[11px] text-text-muted block">Cọc hợp đồng</span>
                <span className="font-semibold text-text tabular-nums">{formatVND(previewRoom.cocPhong)}</span>
              </div>
              <div className="p-3 bg-surface-subtle border border-border rounded-lg">
                <span className="text-[11px] text-text-muted block">Diện tích</span>
                <span className="font-semibold text-text tabular-nums">{previewRoom.dienTich} m²</span>
              </div>
              <div className="p-3 bg-surface-subtle border border-border rounded-lg">
                <span className="text-[11px] text-text-muted block">Số người ở</span>
                <span className="font-semibold text-text tabular-nums">{previewRoom.soNguoi} người</span>
              </div>
            </div>

            {/* Address & GPS */}
            <div className="p-3 bg-surface-subtle border border-border rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>{previewRoom.diaChi}</span>
              </div>
              {previewRoom.kinhDo && previewRoom.viDo && (
                <div className="text-[11px] text-text-muted font-mono">
                  Tọa độ GPS: ({previewRoom.kinhDo}, {previewRoom.viDo})
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <span className="block text-xs font-medium text-text-secondary mb-1">
                Mô tả chi tiết phòng trọ
              </span>
              <p className="text-xs text-text-secondary leading-relaxed bg-surface-subtle border border-border p-3 rounded-lg">
                {previewRoom.moTa || 'Chưa có mô tả chi tiết'}
              </p>
            </div>

            {/* Landlord Info */}
            <div className="p-3 bg-surface-subtle border border-border rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-muted text-text-secondary font-semibold flex items-center justify-center text-xs">
                  CT
                </div>
                <div>
                  <span className="font-medium text-text">{previewRoom.tenChuTro}</span>
                  <div className="text-text-muted text-[11px]">{previewRoom.sdtChuTro}</div>
                </div>
              </div>
              {renderRoomStatusChip(previewRoom.trangThai)}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TỪ CHỐI BÀI ĐĂNG KÈM LÝ DO */}
      <Modal
        isOpen={!!rejectingRoomId}
        onClose={() => setRejectingRoomId(null)}
        title="Từ chối bài đăng phòng trọ"
        subtitle="Bài đăng sẽ chuyển sang trạng thái đã từ chối và gửi thông báo tới Chủ trọ."
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectingRoomId(null)}
              className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectMutation.isPending}
              onClick={handleConfirmReject}
              className="px-4 py-2 rounded-lg bg-danger-text hover:opacity-90 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-opacity"
            >
              {rejectMutation.isPending && <Spinner size="sm" color="current" />}
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <textarea
          rows={3}
          placeholder="VD: Giá thuê không nhất quán, hình ảnh chụp bị mờ, địa chỉ không rõ ràng..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-danger-text"
        />
      </Modal>

      <Tour360ViewerModal
        isOpen={tour360Open}
        tour={previewRoomTour ?? null}
        title={previewRoom ? previewRoom.tieuDe || `Phòng #${previewRoom.maPhongTro}` : 'Tour 360°'}
        subtitle={previewRoom?.diaChi}
        onClose={() => setTour360Open(false)}
      />
    </div>
  );
};
