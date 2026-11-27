import { useAuthStore } from '@/store/useAuthStore';
import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useEffect, useRef, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPicker } from '@/components/map/MapPicker';
import { landlordService } from '@/services/landlord.service';
import type {
  AmenityItem,
  CategoryItem,
  LandlordRoomItem,
  RoomCreatePayload,
} from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';
import {
  getCachedAddressSuggestions,
  searchAddressSuggestions,
  type AddressSuggestion,
} from '@/utils/geocoding';
import { REGEX_PATTERNS } from '@/utils/validators';
import { z } from 'zod';

interface CreateRoomPageProps {
  isEdit?: boolean;
}

const roomFormSchema = z.object({
  categoryId: z.string().regex(REGEX_PATTERNS.ROOM_TYPE_CODE, 'Vui lòng chọn loại phòng hợp lệ'),
  area: z.number().int('Diện tích phải là số nguyên').min(5, 'Diện tích tối thiểu 5 m²').max(500, 'Diện tích tối đa 500 m²'),
  maxPeople: z.number().int('Số người phải là số nguyên').min(1, 'Số người tối thiểu là 1').max(20, 'Số người tối đa là 20'),
  price: z.number().int().positive('Vui lòng nhập giá thuê lớn hơn 0').max(Number.MAX_SAFE_INTEGER, 'Giá thuê quá lớn'),
  contractDeposit: z.number().int().min(0, 'Tiền cọc không được âm').max(Number.MAX_SAFE_INTEGER, 'Tiền cọc quá lớn'),
  address: z.string().trim().min(5, 'Vui lòng nhập địa chỉ cụ thể (ít nhất 5 ký tự)'),
  lat: z.number().min(-90, 'Vĩ độ phải từ -90 đến 90').max(90, 'Vĩ độ phải từ -90 đến 90'),
  lng: z.number().min(-180, 'Kinh độ phải từ -180 đến 180').max(180, 'Kinh độ phải từ -180 đến 180'),
  imageUrls: z.array(z.url()).min(1, 'Vui lòng thêm ít nhất 1 hình ảnh thực tế của phòng'),
});

type RoomFormField = keyof z.infer<typeof roomFormSchema>;

const draftSchema = z.object({
  categoryId: z.string(), area: z.string(), maxPeople: z.string(), description: z.string(),
  address: z.string(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  selectedAmenityCodes: z.array(z.string()), imageUrls: z.array(z.url()).max(10),
  price: z.string(), contractDeposit: z.string(),
});

interface CreateRoomFormProps {
  isEdit: boolean;
  id?: string;
  categories: CategoryItem[];
  amenities: AmenityItem[];
  existingRoom?: LandlordRoomItem;
}

const CreateRoomForm: React.FC<CreateRoomFormProps> = ({
  isEdit,
  id,
  categories,
  amenities,
  existingRoom,
}) => {
  const userId = useAuthStore((state) => state.user?.maNguoiDung ?? '');
  const draftKey = `innfinder-landlord-draft:${userId}:${id ?? 'new'}`;
  const [draft] = useState(() => {
    try {
      const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(draftKey) ?? 'null'));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  });
  const savedSuccessfully = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Partial<Record<RoomFormField, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Basic Info
  const [selectedCategoryId, setCategoryId] = useState<string>(
    () => draft?.categoryId ?? existingRoom?.maLpt ?? categories[0]?.maLpt ?? '',
  );
  const categoryId = selectedCategoryId;

  const [area, setArea] = useState<string>(() => draft?.area ?? String(existingRoom?.dienTich ?? 25));
  const [maxPeople, setMaxPeople] = useState<string>(() => draft?.maxPeople ?? String(existingRoom?.soNguoi ?? 2));
  const [description, setDescription] = useState<string>(() => draft?.description ?? existingRoom?.moTa ?? '');

  // Location & Map
  const [address, setAddress] = useState<string>(() => draft?.address ?? existingRoom?.diaChi ?? '');
  const [lat, setLat] = useState<number>(() =>
    draft?.lat ?? (existingRoom?.viDo ? Number(existingRoom.viDo) : 10.8012),
  );
  const [lng, setLng] = useState<number>(() =>
    draft?.lng ?? (existingRoom?.kinhDo ? Number(existingRoom.kinhDo) : 106.7145),
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [geocodedNotice, setGeocodedNotice] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Tự động tìm kiếm tọa độ thực tế khi gõ địa chỉ
  useEffect(() => {
    const trimmed = address.trim();
    if (trimmed.length < 2) {
      return;
    }

    const cached = getCachedAddressSuggestions(trimmed);
    // Nếu có trong cache, hiển thị ngay tức thì (0ms)
    if (cached) {
      const cacheTimer = setTimeout(() => {
        setGeocodeSuggestions(cached);
        if (cached.length > 0) {
          setShowSuggestions(true);
        }
      }, 0);
      return () => clearTimeout(cacheTimer);
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsGeocoding(true);
        const results = await searchAddressSuggestions(trimmed, controller.signal);
        setGeocodeSuggestions(results);
        if (results.length > 0) {
          setShowSuggestions(true);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setIsGeocoding(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  // Đóng danh sách gợi ý khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAddressSuggestion = (item: AddressSuggestion) => {
    setAddress(item.fullAddress);
    setLat(item.lat);
    setLng(item.lng);
    setGeocodeSuggestions([]);
    setShowSuggestions(false);
    setGeocodedNotice(`Đã định vị: ${item.title}`);
    toast.success('Đã cập nhật vị trí trên bản đồ');
  };

  // Amenities (maTienIch codes: TI0001...)
  const [selectedAmenityCodes, setSelectedAmenityCodes] = useState<string[]>(() => {
    if (draft) return draft.selectedAmenityCodes;
    if (existingRoom?.dsMaTienIch && existingRoom.dsMaTienIch.length > 0) {
      return existingRoom.dsMaTienIch;
    }
    if (existingRoom?.dsTienIch && existingRoom.dsTienIch.length > 0 && amenities.length > 0) {
      const mapped = amenities
        .filter((a) => existingRoom.dsTienIch?.includes(a.tenTienIch))
        .map((a) => a.maTienIch);
      if (mapped.length > 0) return mapped;
    }
    return [];
  });

  // Images
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    if (draft) return draft.imageUrls;
    if (existingRoom?.danhSachAnh && existingRoom.danhSachAnh.length > 0) {
      return existingRoom.danhSachAnh;
    }
    if (existingRoom?.hinhAnhUrl) {
      return [existingRoom.hinhAnhUrl];
    }
    return [];
  });
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Price & Contract Deposit
  const [price, setPrice] = useState<string>(() => draft?.price ?? String(existingRoom?.giaThue ?? ''));
  const [contractDeposit, setContractDeposit] = useState<string>(() =>
    draft?.contractDeposit ?? String(existingRoom?.cocPhong ?? ''),
  );

  const formSnapshot = JSON.stringify({ categoryId, area, maxPeople, description, address, lat, lng,
    selectedAmenityCodes, imageUrls, price, contractDeposit });
  const [savedSnapshot, setSavedSnapshot] = useState(formSnapshot);
  const dirty = formSnapshot !== savedSnapshot;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (savedSuccessfully.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const checkLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || savedSuccessfully.current) return;
      if (!window.confirm('Thông tin phòng chưa được lưu. Bạn muốn rời trang?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', checkLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', checkLink, true);
    };
  }, [dirty]);
  const leaveForm = () => {
    if (!dirty || window.confirm('Thông tin phòng chưa được lưu. Bạn muốn rời trang?')) navigate('/landlord/rooms');
  };
  const saveDraft = () => {
    try {
      const parsed = draftSchema.safeParse(JSON.parse(formSnapshot));
      if (!parsed.success) { toast.error('Kiểm tra tọa độ và hình ảnh trước khi lưu nháp'); return; }
      localStorage.setItem(draftKey, formSnapshot);
      setSavedSnapshot(formSnapshot);
      toast.success('Đã lưu bản nháp trên trình duyệt cho tài khoản này');
    } catch { toast.error('Không thể lưu bản nháp trên trình duyệt'); }
  };

  const uploadImagesMutation = useMutation({
    mutationFn: (files: File[]) => landlordService.uploadImages(files),
    onSuccess: (urls) => {
      if (urls.length > 0) {
        setImageUrls((prev) => [...prev, ...urls]);
        toast.success(`Đã tải lên thành công ${urls.length} hình ảnh`);
      }
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải ảnh lên máy chủ. Bạn có thể dán link ảnh trực tiếp bên dưới.';
      toast.error(msg);
    },
  });

  const saveRoomMutation = useMutation({
    mutationFn: (payload: RoomCreatePayload) =>
      isEdit && id
        ? landlordService.updateRoom(id, payload)
        : landlordService.createRoom(payload),
    onSuccess: (room) => {
      savedSuccessfully.current = true;
      try { localStorage.removeItem(draftKey); } catch { /* Saving the room must still finish if storage is unavailable. */ }
      queryClient.setQueryData(['landlord', 'room-detail', room.maPhongTro], room);
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
      toast.success(
        isEdit
          ? 'Cập nhật thông tin phòng trọ thành công!'
          : 'Gửi duyệt bài đăng phòng mới thành công! Phòng sẽ hiển thị công khai sau khi Admin duyệt.',
      );
      navigate('/landlord/rooms');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi lưu bài đăng phòng trọ';
      toast.error(msg);
    },
  });

  const formatCurrencyInput = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  const handleToggleAmenity = (maTienIch: string) => {
    setSelectedAmenityCodes((prev) =>
      prev.includes(maTienIch)
        ? prev.filter((code) => code !== maTienIch)
        : [...prev, maTienIch],
    );
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (uploadImagesMutation.isPending) return;
    const validFiles = Array.from(fileList).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (validFiles.some((file) => file.size > 10 * 1024 * 1024)) { toast.error('Mỗi ảnh tối đa 10MB'); return; }
    if (validFiles.length + imageUrls.length > 10) { toast.error('Mỗi phòng tối đa 10 ảnh'); return; }
    if (validFiles.length === 0) {
      toast.error('Vui lòng chọn định dạng tệp hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    uploadImagesMutation.mutate(validFiles);
  };

  const handleAddManualUrl = () => {
    if (imageUrls.length >= 10) { toast.error('Mỗi phòng tối đa 10 ảnh'); return; }
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        toast.error('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');
        return;
      }
      setImageUrls((prev) => [...prev, trimmed]);
      setManualImageUrl('');
    } catch {
      toast.error('Đường dẫn URL hình ảnh không hợp lệ');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setImageUrls((prev) => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const fieldError = (field: RoomFormField) => errors[field] ? (
    <p id={`room-${field}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
      {errors[field]}
    </p>
  ) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveRoomMutation.isPending || uploadImagesMutation.isPending) return;

    const numPrice = Number(price.replace(/\D/g, ''));
    const rawDeposit = contractDeposit.replace(/\D/g, '');
    const numDeposit = rawDeposit !== '' ? Number(rawDeposit) : numPrice;
    const result = roomFormSchema.safeParse({
      categoryId,
      area: area.trim() ? Number(area) : 0,
      maxPeople: maxPeople.trim() ? Number(maxPeople) : 0,
      price: numPrice,
      contractDeposit: numDeposit,
      address,
      lat,
      lng,
      imageUrls,
    });
    if (!result.success) {
      const nextErrors: Partial<Record<RoomFormField, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as RoomFormField;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid?.focus({ preventScroll: true });
      });
      return;
    }
    setErrors({});

    const payload: RoomCreatePayload = {
      diaChi: address.trim(),
      giaThue: numPrice,
      dienTich: Math.round(Number(area)),
      soNguoi: Math.round(Number(maxPeople)),
      maLpt: categoryId,
      moTa: description.trim() || undefined,
      kinhDo: String(lng),
      viDo: String(lat),
      coc: numDeposit,
      dsTienIch: selectedAmenityCodes,
      hinhAnhUrls: imageUrls,
    };

    saveRoomMutation.mutate(payload);
  };

  const selectedCategory = categories.find((c) => c.maLpt === categoryId);
  const viewingDeposit = selectedCategory?.soTienCoc ?? 200_000;
  const platformFee = selectedCategory?.phiThu ?? 20_000;
  const landlordNetAdvance = Math.max(0, viewingDeposit - platformFee);

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-6 mx-auto pb-6">
      {/* Header */}
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Quay về danh sách phòng"
              onClick={leaveForm}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <Card.Title className="text-lg font-bold text-slate-900">
                {isEdit ? `Chỉnh Sửa Phòng Trọ #${id}` : 'Đăng Tin Phòng Trọ Mới'}
              </Card.Title>
            </div>
          </div>
        </Card.Header>
      </Card>

      {draft && <p className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-800">Đã khôi phục bản nháp của tài khoản này.</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <Card.Header className="p-0">
              <Card.Title className="text-base font-bold text-slate-900">
                Thông tin cơ bản của phòng trọ
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Chọn loại phòng, diện tích và số người ở tối đa.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="room-categoryId" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Loại hình phòng trọ <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="room-categoryId"
                    aria-invalid={Boolean(errors.categoryId)}
                    aria-describedby={errors.categoryId ? 'room-categoryId-error' : undefined}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 bg-white font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.maLpt} value={c.maLpt}>
                        {c.tenLoaiPhongTro}
                      </option>
                    ))}
                  </select>
                  {fieldError('categoryId')}
                </div>

                <div>
                  <label htmlFor="room-area" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Diện tích sử dụng (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    id="room-area"
                    aria-invalid={Boolean(errors.area)}
                    aria-describedby={errors.area ? 'room-area-error' : undefined}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="VD: 25"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                  />
                  {fieldError('area')}
                </div>

                <div>
                  <label htmlFor="room-maxPeople" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số người ở tối đa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    id="room-maxPeople"
                    aria-invalid={Boolean(errors.maxPeople)}
                    aria-describedby={errors.maxPeople ? 'room-maxPeople-error' : undefined}
                    value={maxPeople}
                    onChange={(e) => setMaxPeople(e.target.value)}
                    placeholder="VD: 2"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                  />
                  {fieldError('maxPeople')}
                </div>
              </div>

              {selectedCategory && (
                <div className="p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-900">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>
                      Loại phòng <strong>{selectedCategory.tenLoaiPhongTro}</strong> áp dụng mức cọc giữ chân lịch xem:{' '}
                      <strong>{formatVND(viewingDeposit)}</strong>
                    </span>
                  </div>
                </div>
              )}

            </Card.Content>
          </Card>
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <Card.Header className="p-0">
              <Card.Title className="text-base font-bold text-slate-900">
                Giá thuê & Tiền cọc hợp đồng
              </Card.Title>
            </Card.Header>

            <Card.Content className="p-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="room-price" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Giá thuê hàng tháng (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="room-price"
                      inputMode="numeric"
                      aria-invalid={Boolean(errors.price)}
                      aria-describedby={errors.price ? 'room-price-error' : undefined}
                      value={formatCurrencyInput(price)}
                      onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                      placeholder="VD: 3.500.000"
                      className="w-full text-sm p-3.5 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 font-extrabold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₫
                    </span>
                  </div>
                  {fieldError('price')}
                </div>

                <div>
                  <label htmlFor="room-contractDeposit" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tiền cọc hợp đồng phòng (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="room-contractDeposit"
                      inputMode="numeric"
                      aria-invalid={Boolean(errors.contractDeposit)}
                      aria-describedby={errors.contractDeposit ? 'room-contractDeposit-error' : undefined}
                      value={formatCurrencyInput(contractDeposit)}
                      onChange={(e) => setContractDeposit(e.target.value.replace(/\D/g, ''))}
                      placeholder="Mặc định bằng 1 tháng tiền thuê"
                      className="w-full text-sm p-3.5 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 font-extrabold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₫
                    </span>
                  </div>
                  {fieldError('contractDeposit')}
                </div>
              </div>

              {/* Platform Viewing Deposit & Fee Info Box */}
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-cyan-950 uppercase tracking-wider">
                    Cọc lịch xem & Phí dịch vụ ({selectedCategory?.tenLoaiPhongTro || categoryId})
                  </h4>
                  <Chip size="sm" color="accent" variant="soft">
                    <Chip.Label>Thu phí khi thuê thành công</Chip.Label>
                  </Chip>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-cyan-100">
                    <span className="text-[11px] text-slate-500 block">
                      Cọc giữ chân lịch xem
                    </span>
                    <span className="text-base font-black text-cyan-700 mt-0.5 block">
                      {formatVND(viewingDeposit)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Khách nộp cho Sàn khi đặt lịch hẹn
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-cyan-100">
                    <span className="text-[11px] text-slate-500 block">
                      Phí hoa hồng môi giới
                    </span>
                    <span className="text-base font-black text-amber-700 mt-0.5 block">
                      {formatVND(platformFee)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Chỉ trích thu khi cả 2 bên đồng ý thuê
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-cyan-100">
                    <span className="text-[11px] text-slate-500 block">
                      Hoàn về Ví Chủ trọ khi chốt thuê
                    </span>
                    <span className="text-base font-black text-emerald-700 mt-0.5 block">
                      {formatVND(landlordNetAdvance)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Hoàn 100% ({formatVND(viewingDeposit)}) nếu không thuê
                    </span>
                  </div>
                </div>
              </div>

            </Card.Content>
          </Card>
        </div>
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0">
            <Card.Title className="text-base font-bold text-slate-900">
              Vị trí địa chỉ & Tọa độ bản đồ
            </Card.Title>
          </Card.Header>

          <Card.Content className="p-0 space-y-4">
            <div className="relative z-20" ref={suggestionsRef}>
              <label htmlFor="room-address" className="block text-xs font-bold text-slate-700 mb-1.5">
                Địa chỉ cụ thể <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="room-address"
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={errors.address ? 'room-address-error' : undefined}
                  value={address}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddress(val);
                    setGeocodedNotice(null);
                    if (val.trim().length < 2) {
                      setGeocodeSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (geocodeSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Số nhà, ngõ/hẻm, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-medium"
                />
                {isGeocoding ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                  </div>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
              {fieldError('address')}

              {/* Suggestions dropdown */}
              {showSuggestions && geocodeSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  <div className="px-3.5 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    Gợi ý địa chỉ chi tiết (Bấm để ghim lên bản đồ)
                  </div>
                  {geocodeSuggestions.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleSelectAddressSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-teal-50/70 hover:text-teal-900 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Geocoded status hint */}
              {geocodedNotice && (
                <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium mt-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{geocodedNotice}. Bạn có thể kéo ghim trên bản đồ để tinh chỉnh.</span>
                </div>
              )}
            </div>

            <MapPicker
              lat={Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : 10.8012}
              lng={Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : 106.7145}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
                setGeocodedNotice('Đã ghim vị trí tùy chỉnh trên bản đồ');
              }}
              height="340px"
            />
          </Card.Content>
        </Card>
      </div>

      <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <Card.Header className="p-0 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-base font-bold text-slate-900">
              Tiện ích & Mô tả
            </Card.Title>
          </div>
          <Chip size="sm" color="success" variant="soft">
            <Chip.Label>Đã chọn {selectedAmenityCodes.length} tiện ích</Chip.Label>
          </Chip>
        </Card.Header>

        <Card.Content className="p-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {amenities.map((amenity) => {
              const isChecked = selectedAmenityCodes.includes(amenity.maTienIch);
              return (
                <button
                  type="button"
                  key={amenity.maTienIch}
                  onClick={() => handleToggleAmenity(amenity.maTienIch)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'border-cyan-500 bg-cyan-50/60 text-cyan-900 ring-1 ring-cyan-500/40'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block truncate">{amenity.tenTienIch}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-cyan-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            <label htmlFor="room-description" className="block text-xs font-bold text-slate-700 mb-1.5">
              Mô tả chi tiết & Nội quy phòng trọ
            </label>
            <textarea
              rows={5}
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết tình trạng nội thất, giờ giấc ra vào, giá điện nước, chỗ để xe và nội quy chung..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 leading-relaxed"
            />
          </div>
        </Card.Content>
      </Card>
      <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <Card.Header className="p-0 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-base font-bold text-slate-900">
              Hình ảnh thực tế của phòng trọ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Bắt buộc tối thiểu 1 ảnh đại diện rõ nét. Ảnh đầu tiên sẽ được chọn làm ảnh bìa hiển thị.
            </Card.Description>
          </div>
          <Chip size="sm" color="accent" variant="soft">
            <Chip.Label>{imageUrls.length} hình ảnh</Chip.Label>
          </Chip>
        </Card.Header>

        <Card.Content className="p-0 space-y-4">
          {fieldError('imageUrls')}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            onChange={(e) => processFiles(e.target.files)}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              processFiles(e.dataTransfer.files);
            }}
            tabIndex={0}
            role="button"
            aria-label="Thêm hình ảnh phòng trọ"
            aria-invalid={Boolean(errors.imageUrls)}
            aria-describedby={errors.imageUrls ? 'room-imageUrls-error' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                : 'border-slate-300 hover:border-cyan-500 hover:bg-slate-50/60'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-2">
              {uploadImagesMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-800">
              {uploadImagesMutation.isPending
                ? 'Đang tải ảnh lên...'
                : 'Kéo thả hình ảnh vào đây hoặc bấm để chọn tệp từ máy tính'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ PNG, JPG, JPEG, WEBP (tối đa 10MB/ảnh)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                aria-label="Đường dẫn hình ảnh"
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
                placeholder="Hoặc dán trực tiếp URL hình ảnh (https://...)"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={handleAddManualUrl}
              className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Thêm URL
            </button>
          </div>

          {imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {imageUrls.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  className="relative aspect-4/3 rounded-xl overflow-hidden ring-1 ring-slate-200 group bg-slate-100"
                >
                  <img src={img} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 ? (
                    <span className="absolute top-2 left-2 bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      Ảnh đại diện
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCoverImage(idx)}
                      className="absolute top-2 left-2 bg-slate-900/70 hover:bg-cyan-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Đặt làm bìa
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                    title="Xóa ảnh này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-300" />
              <span>Chưa có hình ảnh nào. Vui lòng tải lên ít nhất 1 ảnh thực tế.</span>
            </div>
          )}
        </Card.Content>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={leaveForm}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          Hủy
        </button>
        <button type="button" onClick={saveDraft} disabled={saveRoomMutation.isPending || uploadImagesMutation.isPending}
          className="px-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl">Lưu bản nháp</button>
        <button
          type="submit"
          disabled={saveRoomMutation.isPending || uploadImagesMutation.isPending}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saveRoomMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>
            {saveRoomMutation.isPending
              ? 'Đang gửi...'
              : isEdit
                ? 'Lưu cập nhật phòng'
                : 'Gửi duyệt bài đăng'}
          </span>
        </button>
      </div>
    </form>
  );
};

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();

  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: landlordService.getCategories,
  });

  const { data: amenities = [], isLoading: amenitiesLoading, error: amenitiesError, refetch: refetchAmenities } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: landlordService.getAmenities,
  });

  const { data: existingRoom, isLoading: fetchingRoom, error: roomError, refetch: refetchRoom } = useQuery({
    queryKey: ['landlord', 'room-detail', id],
    queryFn: () => landlordService.getRoomById(id!),
    enabled: isEdit && Boolean(id),
  });

  const loadError = categoriesError || amenitiesError || roomError;
  if (loadError) return <LandlordQueryError error={loadError} onRetry={() => {
    void refetchCategories(); void refetchAmenities(); if (isEdit) void refetchRoom();
  }} />;
  if (fetchingRoom || categoriesLoading || amenitiesLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-600 mb-2" />
        <span className="text-xs font-medium">Đang tải thông tin phòng trọ...</span>
      </div>
    );
  }

  if (!categories.length || (isEdit && !existingRoom)) return <LandlordQueryError
    error={new Error(!categories.length ? 'Chưa có loại phòng. Vui lòng liên hệ quản trị viên.' : 'Không tìm thấy phòng thuộc tài khoản của bạn.')}
    onRetry={() => { void refetchCategories(); if (isEdit) void refetchRoom(); }} />;

  return (
    <CreateRoomForm
      key={`${existingRoom?.maPhongTro ?? 'create'}-${amenities.length}`}
      isEdit={isEdit}
      id={id}
      categories={categories}
      amenities={amenities}
      existingRoom={existingRoom}
    />
  );
};
