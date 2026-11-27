import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { AlertTriangle, Coins, Edit3, History, Layers, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { roomService } from '@/services/room.service';
import { Modal } from '@/components/common/Modal';
import {
  AdminErrorState,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { formatDateTime, formatVND } from '@/utils/formatters';
import { categoryDepositFeeSchema } from '@/utils/validators';
import type { RoomTypeDepositFee } from '@/types/admin.types';
import type { AmenityResponse, CategoryResponse } from '@/types/room.types';

type ActiveTab = 'DEPOSIT_FEES' | 'ROOM_TYPES' | 'AMENITIES';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('DEPOSIT_FEES');

  // Modal chỉnh sửa Biểu phí Cọc & Hoa hồng
  const [editingFeeItem, setEditingFeeItem] = useState<RoomTypeDepositFee | null>(null);
  const [editCoc, setEditCoc] = useState<number>(0);
  const [editPhi, setEditPhi] = useState<number>(0);
  const [editLyDo, setEditLyDo] = useState<string>('');
  const [editMatKhauAdmin, setEditMatKhauAdmin] = useState<string>('');
  const [feeError, setFeeError] = useState<string>('');

  // Modal chỉnh sửa Loại phòng trọ
  const [editingRoomType, setEditingRoomType] = useState<{
    code: string;
    ten: string;
    moTa: string;
  } | null>(null);

  // Modal chỉnh sửa Tiện ích
  const [editingAmenity, setEditingAmenity] = useState<AmenityResponse | null>(null);
  const [amenityName, setAmenityName] = useState('');
  const [amenityDesc, setAmenityDesc] = useState('');

  const {
    data: apiDepositFees = [],
    isLoading: isLoadingFees,
    isError: isErrorFees,
    error: errorFees,
    refetch: refetchFees,
  } = useQuery({
    queryKey: ['admin', 'deposit-fees'],
    queryFn: () => adminService.getRoomTypeDepositFees(),
  });

  const {
    data: depositFeeHistory = [],
    isLoading: isLoadingFeeHistory,
  } = useQuery({
    queryKey: ['admin', 'deposit-fee-history'],
    queryFn: () => adminService.getDepositFeeHistory(),
  });

  const {
    data: apiRoomTypes = [],
    isLoading: isLoadingRoomTypes,
    isError: isErrorRoomTypes,
    error: errorRoomTypes,
    refetch: refetchRoomTypes,
  } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: () => roomService.getRoomTypes(),
  });

  const {
    data: apiAmenities = [],
    isLoading: isLoadingAmenities,
    isError: isErrorAmenities,
    error: errorAmenities,
    refetch: refetchAmenities,
  } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: () => roomService.getAmenities(),
  });

  const updateDepositFeeMutation = useMutation({
    mutationFn: ({
      maLpt,
      soTienCoc,
      phiThu,
      lyDo,
      matKhauAdmin,
    }: {
      maLpt: string;
      soTienCoc: number;
      phiThu: number;
      lyDo: string;
      matKhauAdmin: string;
    }) => adminService.updateDepositFee(maLpt, { soTienCoc, phiThu, lyDo, matKhauAdmin }),
    onSuccess: (_res, vars) => {
      toast.success(`Cập nhật biểu phí cọc & hoa hồng cho mã ${vars.maLpt} thành công!`);
      setEditingFeeItem(null);
      setEditLyDo('');
      setEditMatKhauAdmin('');
      setFeeError('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-fees'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-fee-history'] });
      void queryClient.invalidateQueries({ queryKey: ['categories', 'room-types'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật biểu phí';
      setFeeError(msg);
      toast.error(msg);
    },
  });

  const updateRoomTypeMutation = useMutation({
    mutationFn: ({ maLpt, ten, moTa }: { maLpt: string; ten: string; moTa?: string }) =>
      adminService.updateRoomType(maLpt, { ten, moTa }),
    onSuccess: (_res, vars) => {
      toast.success(`Đã cập nhật loại phòng ${vars.ten} (${vars.maLpt})`);
      setEditingRoomType(null);
      void queryClient.invalidateQueries({ queryKey: ['categories', 'room-types'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-fees'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật loại phòng');
    },
  });

  const updateAmenityMutation = useMutation({
    mutationFn: ({ maTienIch, ten, moTa }: { maTienIch: string; ten: string; moTa?: string }) =>
      adminService.updateAmenity(maTienIch, { ten, moTa }),
    onSuccess: (_res, vars) => {
      toast.success(`Đã cập nhật tiện ích ${vars.ten} (${vars.maTienIch})`);
      setEditingAmenity(null);
      void queryClient.invalidateQueries({ queryKey: ['categories', 'amenities'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật tiện ích');
    },
  });

  const normalizedRoomTypes: Array<{ code: string; ten: string; moTa: string }> = apiRoomTypes.map(
    (rt: CategoryResponse, idx: number) => ({
      code: rt.maLpt || rt.maLoaiPhong || `LPT${String(idx + 1).padStart(3, '0')}`,
      ten: rt.tenLoaiPhongTro || rt.tenLoaiPhong || `Loại phòng ${idx + 1}`,
      moTa: rt.moTa || '',
    }),
  );

  const handleStartEditFee = (item: RoomTypeDepositFee) => {
    setEditingFeeItem(item);
    setEditCoc(item.soTienCoc);
    setEditPhi(item.phiThu);
    setEditLyDo('');
    setEditMatKhauAdmin('');
    setFeeError('');
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeeItem) return;

    if (editCoc === editingFeeItem.soTienCoc && editPhi === editingFeeItem.phiThu) {
      const msg = 'Biểu phí mới không có thay đổi nào so với cấu hình hiện tại';
      setFeeError(msg);
      toast.error(msg);
      return;
    }

    const parsed = categoryDepositFeeSchema.safeParse({
      soTienCoc: Number(editCoc),
      phiThu: Number(editPhi),
      lyDo: editLyDo,
      matKhauAdmin: editMatKhauAdmin,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dữ liệu biểu phí không hợp lệ';
      setFeeError(msg);
      toast.error(msg);
      return;
    }

    updateDepositFeeMutation.mutate({
      maLpt: editingFeeItem.maLoaiPhong,
      soTienCoc: parsed.data.soTienCoc,
      phiThu: parsed.data.phiThu,
      lyDo: parsed.data.lyDo,
      matKhauAdmin: parsed.data.matKhauAdmin,
    });
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomType) return;
    if (!editingRoomType.ten.trim()) {
      toast.error('Tên loại phòng không được để trống');
      return;
    }
    updateRoomTypeMutation.mutate({
      maLpt: editingRoomType.code,
      ten: editingRoomType.ten.trim(),
      moTa: editingRoomType.moTa.trim() || undefined,
    });
  };

  const handleSaveAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAmenity) return;
    if (!amenityName.trim()) {
      toast.error('Tên tiện ích không được để trống');
      return;
    }
    updateAmenityMutation.mutate({
      maTienIch: editingAmenity.maTienIch,
      ten: amenityName.trim(),
      moTa: amenityDesc.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap rounded-lg bg-surface-muted p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('DEPOSIT_FEES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'DEPOSIT_FEES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Biểu phí Cọc & Hoa hồng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ROOM_TYPES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ROOM_TYPES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Loại phòng ({normalizedRoomTypes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AMENITIES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'AMENITIES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tiện ích ({apiAmenities.length})
            </button>
          </div>
      </div>

      {activeTab === 'DEPOSIT_FEES' &&
        (isErrorFees ? (
          <AdminErrorState
            title="Không thể tải biểu phí cọc giữ chân"
            message={errorFees instanceof Error ? errorFees.message : undefined}
            onRetry={() => void refetchFees()}
          />
        ) : (
          <div className="space-y-6">
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã & Loại phòng trọ</th>
                    <th scope="col" className="py-3 px-4">Mô tả đặc trưng</th>
                    <th scope="col" className="py-3 px-4 text-right">Cọc giữ chân</th>
                    <th scope="col" className="py-3 px-4 text-right">Hoa hồng sàn</th>
                    <th scope="col" className="py-3 px-4 text-right">Chủ trọ thực nhận</th>
                    <th scope="col" className="py-3 px-4 text-right">Điều chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingFees ? (
                    <AdminTableSkeleton rows={5} cols={6} />
                  ) : apiDepositFees.length > 0 ? (
                    apiDepositFees.map((f) => (
                      <tr key={f.maLoaiPhong} className="hover:bg-tone-teal-soft/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-text block">{f.tenLoaiPhong}</span>
                          <span className="inline-block font-mono text-[11px] text-text-muted bg-surface-muted px-2 py-0.5 rounded-md mt-1">
                            {f.maLoaiPhong}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-secondary max-w-xs">{f.moTa || '--'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-tone-amber-strong text-[13px] tabular-nums">
                          {formatVND(f.soTienCoc)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold text-[13px] tabular-nums ${
                            f.phiThu > 0 ? 'text-tone-teal-base' : 'text-text-muted'
                          }`}
                        >
                          <span>{formatVND(f.phiThu)}</span>
                          <span className="ml-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary">
                            {f.soTienCoc > 0
                              ? `${(f.tyLePhiPercent ?? (f.phiThu * 100) / f.soTienCoc).toFixed(1)}%`
                              : '0.0%'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-tone-blue-base text-[13px] tabular-nums">
                          {formatVND(Math.max(f.soTienCoc - f.phiThu, 0))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleStartEditFee(f)}
                            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                            Cập nhật phí
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">
                        Chưa có cấu hình biểu phí cọc giữ chân nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>

          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Header className="px-4 py-3 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                <div>
                  <Card.Title className="text-sm font-semibold text-text">
                    Lịch sử thay đổi biểu phí (Audit Log)
                  </Card.Title>
                  <Card.Description className="text-[11px] text-text-muted">
                    Ghi nhận toàn bộ điều chỉnh tiền cọc và hoa hồng sàn kèm lý do &amp; người thực hiện
                  </Card.Description>
                </div>
              </div>
              <span className="text-[11px] font-medium text-text-muted tabular-nums">
                {depositFeeHistory.length} bản ghi gần nhất
              </span>
            </Card.Header>
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Lịch sử thay đổi biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-2.5 px-4">Thời gian</th>
                    <th scope="col" className="py-2.5 px-4">Loại phòng</th>
                    <th scope="col" className="py-2.5 px-4 text-right">Cọc (Cũ ➔ Mới)</th>
                    <th scope="col" className="py-2.5 px-4 text-right">Hoa hồng (Cũ ➔ Mới)</th>
                    <th scope="col" className="py-2.5 px-4">Lý do điều chỉnh</th>
                    <th scope="col" className="py-2.5 px-4">Người sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingFeeHistory ? (
                    <AdminTableSkeleton rows={3} cols={6} />
                  ) : depositFeeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        Chưa có lịch sử điều chỉnh biểu phí nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    depositFeeHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-surface-subtle/60">
                        <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                          {formatDateTime(h.thoiGian)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-text">{h.tenLoaiPhong}</span>
                          <span className="ml-1.5 font-mono text-[10px] text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
                            {h.maLpt}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap">
                          <span className="text-text-muted">{formatVND(h.cocCu)}</span>
                          <span className="mx-1 text-text-muted">➔</span>
                          <span className="font-semibold text-tone-amber-strong">
                            {formatVND(h.cocMoi)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap">
                          <span className="text-text-muted">{formatVND(h.phiCu)}</span>
                          <span className="mx-1 text-text-muted">➔</span>
                          <span className="font-semibold text-tone-teal-base">
                            {formatVND(h.phiMoi)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary max-w-xs">{h.lyDo}</td>
                        <td className="py-2.5 px-4 text-text font-medium whitespace-nowrap">
                          {h.nguoiSua}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
          </div>
        ))}

      {activeTab === 'ROOM_TYPES' &&
        (isErrorRoomTypes ? (
          <AdminErrorState
            title="Không thể tải danh mục loại phòng"
            message={errorRoomTypes instanceof Error ? errorRoomTypes.message : undefined}
            onRetry={() => void refetchRoomTypes()}
          />
        ) : (
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã loại phòng</th>
                    <th scope="col" className="py-3 px-4">Tên loại phòng trọ</th>
                    <th scope="col" className="py-3 px-4">Mô tả chi tiết</th>
                    <th scope="col" className="py-3 px-4 text-right">Chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingRoomTypes ? (
                    <AdminTableSkeleton rows={5} cols={4} />
                  ) : normalizedRoomTypes.length > 0 ? (
                    normalizedRoomTypes.map((rt) => (
                      <tr key={rt.code} className="hover:bg-tone-teal-soft/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-block font-mono text-[11px] font-medium text-text-secondary bg-surface-muted px-2 py-0.5 rounded-md">
                            {rt.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-text">{rt.ten}</td>
                        <td className="py-3 px-4 text-text-secondary">{rt.moTa || '--'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRoomType({ code: rt.code, ten: rt.ten, moTa: rt.moTa })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                            Sửa tên / mô tả
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-text-muted">
                        Chưa có danh mục loại phòng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        ))}

      {activeTab === 'AMENITIES' &&
        (isErrorAmenities ? (
          <AdminErrorState
            title="Không thể tải danh mục tiện ích"
            message={errorAmenities instanceof Error ? errorAmenities.message : undefined}
            onRetry={() => void refetchAmenities()}
          />
        ) : (
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã tiện ích</th>
                    <th scope="col" className="py-3 px-4">Tên tiện ích</th>
                    <th scope="col" className="py-3 px-4">Mô tả tiện ích</th>
                    <th scope="col" className="py-3 px-4 text-right">Chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingAmenities ? (
                    <AdminTableSkeleton rows={6} cols={4} />
                  ) : apiAmenities.length > 0 ? (
                    apiAmenities.map((am, idx) => {
                      const displayCode = am.maTienIch || `TI${String(idx + 1).padStart(4, '0')}`;
                      return (
                        <tr key={displayCode} className="hover:bg-tone-teal-soft/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="inline-block font-mono text-[11px] font-medium text-text-secondary bg-surface-muted px-2 py-0.5 rounded-md">
                              {displayCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-text">{am.tenTienIch}</td>
                          <td className="py-3 px-4 text-text-secondary">{am.moTa || '--'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAmenity({ ...am, maTienIch: displayCode });
                                setAmenityName(am.tenTienIch);
                                setAmenityDesc(am.moTa || '');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                              Sửa tiện ích
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-text-muted">
                        Chưa có danh mục tiện ích nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        ))}

      {/* MODAL CẬP NHẬT BIỂU PHÍ CỌC & HOA HỒNG */}
      <Modal
        isOpen={!!editingFeeItem}
        onClose={() => setEditingFeeItem(null)}
        title={
          editingFeeItem
            ? `Cập nhật biểu phí: ${editingFeeItem.tenLoaiPhong}`
            : 'Cập nhật biểu phí'
        }
        subtitle={editingFeeItem ? `Mã loại phòng: ${editingFeeItem.maLoaiPhong}` : undefined}
        maxWidth="md"
      >
        {editingFeeItem && (() => {
          const isUnchanged =
            editCoc === editingFeeItem.soTienCoc && editPhi === editingFeeItem.phiThu;
          const oldPercent =
            editingFeeItem.soTienCoc > 0
              ? ((editingFeeItem.phiThu * 100) / editingFeeItem.soTienCoc).toFixed(1)
              : '0.0';
          const newPercent =
            editCoc > 0 ? ((editPhi * 100) / editCoc).toFixed(1) : '0.0';
          const cocDeltaRatio =
            editingFeeItem.soTienCoc > 0
              ? Math.abs(editCoc - editingFeeItem.soTienCoc) / editingFeeItem.soTienCoc
              : 0;
          const phiDeltaRatio =
            editingFeeItem.phiThu > 0
              ? Math.abs(editPhi - editingFeeItem.phiThu) / editingFeeItem.phiThu
              : editPhi > 0
                ? 1
                : 0;
          const isLargeChange = cocDeltaRatio > 0.2 || phiDeltaRatio > 0.2;

          return (
            <form onSubmit={handleSaveFee} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Mức tiền cọc giữ chân (50.000 – 2.000.000 đ)
                  </label>
                  <div className="relative">
                    <CurrencyInput
                      value={editCoc}
                      onValueChange={(digits) => {
                        setEditCoc(digits ? Number(digits) : 0);
                        setFeeError('');
                      }}
                      placeholder="VD: 200.000"
                      className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent font-semibold tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₫
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Hoa hồng sàn (tối đa 30% cọc, bội số 1.000 đ)
                  </label>
                  <div className="relative">
                    <CurrencyInput
                      value={editPhi}
                      onValueChange={(digits) => {
                        setEditPhi(digits ? Number(digits) : 0);
                        setFeeError('');
                      }}
                      placeholder="VD: 20.000"
                      className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:border-accent font-semibold text-accent tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₫
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] space-y-1.5">
                <div className="flex justify-between text-text-secondary">
                  <span>Tiền cọc giữ chân:</span>
                  <span className="tabular-nums">
                    {formatVND(editingFeeItem.soTienCoc)} ➔{' '}
                    <strong className="text-text">{formatVND(editCoc)}</strong>
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Hoa hồng sàn (% cọc):</span>
                  <span className="tabular-nums">
                    {formatVND(editingFeeItem.phiThu)} ({oldPercent}%) ➔{' '}
                    <strong className="text-accent">
                      {formatVND(editPhi)} ({newPercent}%)
                    </strong>
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary border-t border-border/70 pt-1.5">
                  <span>Chủ trọ thực nhận khi thuê thành công:</span>
                  <strong className="font-semibold text-success-text tabular-nums">
                    {formatVND(Math.max(editCoc - editPhi, 0))}
                  </strong>
                </div>
              </div>

              {isLargeChange && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Biến động biểu phí vượt quá <strong>20%</strong> so với mức hiện tại. Vui lòng kiểm tra kỹ trước khi xác nhận.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Lý do thay đổi biểu phí (bắt buộc, 5–500 ký tự)
                </label>
                <textarea
                  rows={2}
                  value={editLyDo}
                  onChange={(e) => {
                    setEditLyDo(e.target.value);
                    setFeeError('');
                  }}
                  placeholder="Ví dụ: Điều chỉnh cân đối tỷ lệ hoa hồng quý IV theo mặt bằng khu vực..."
                  className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary mb-1">
                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                  Mật khẩu Quản trị viên xác nhận
                </label>
                <input
                  type="password"
                  value={editMatKhauAdmin}
                  onChange={(e) => {
                    setEditMatKhauAdmin(e.target.value);
                    setFeeError('');
                  }}
                  placeholder="Nhập mật khẩu tài khoản Admin hiện tại"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
                />
              </div>

              {feeError && (
                <p className="text-[11px] font-medium text-danger-text bg-danger-bg border border-danger-border rounded-lg p-2.5">
                  {feeError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFeeItem(null)}
                  className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateDepositFeeMutation.isPending || isUnchanged}
                  className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {updateDepositFeeMutation.isPending && <Spinner size="sm" color="current" />}
                  Xác nhận lưu biểu phí
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* MODAL CHỈNH SỬA LOẠI PHÒNG TRỌ */}
      <Modal
        isOpen={!!editingRoomType}
        onClose={() => setEditingRoomType(null)}
        title="Chỉnh sửa Loại phòng trọ"
        subtitle={editingRoomType ? `Mã loại phòng: ${editingRoomType.code}` : undefined}
        maxWidth="sm"
      >
        {editingRoomType && (
          <form onSubmit={handleSaveRoomType} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tên loại phòng trọ
              </label>
              <input
                type="text"
                value={editingRoomType.ten}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, ten: e.target.value } : null))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={editingRoomType.moTa}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, moTa: e.target.value } : null))
                }
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoomType(null)}
                className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateRoomTypeMutation.isPending}
                className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {updateRoomTypeMutation.isPending && <Spinner size="sm" color="current" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL CHỈNH SỬA TIỆN ÍCH */}
      <Modal
        isOpen={!!editingAmenity}
        onClose={() => setEditingAmenity(null)}
        title="Chỉnh sửa Tiện ích phòng"
        subtitle={editingAmenity ? `Mã tiện ích: ${editingAmenity.maTienIch}` : undefined}
        maxWidth="sm"
      >
        {editingAmenity && (
          <form onSubmit={handleSaveAmenity} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tên tiện ích
              </label>
              <input
                type="text"
                value={amenityName}
                onChange={(e) => setAmenityName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={amenityDesc}
                onChange={(e) => setAmenityDesc(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAmenity(null)}
                className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateAmenityMutation.isPending}
                className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {updateAmenityMutation.isPending && <Spinner size="sm" color="current" />}
                Lưu tiện ích
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
