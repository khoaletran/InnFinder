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
import { LandlordTour360Section } from '@/components/tour360/LandlordTour360Section';
import { landlordService } from '@/services/landlord.service';
import { tour360Service } from '@/services/tour360.service';
import type {
  AmenityItem,
  CategoryItem,
  LandlordRoomItem,
  RoomCreatePayload,
} from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';
import { REGEX_PATTERNS } from '@/utils/validators';
import { z } from 'zod';

interface CreateRoomPageProps {
  isEdit?: boolean;
}

interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

interface PhotonFeature {
  type: 'Feature';
  properties: {
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const geocodeCache = new Map<string, AddressSuggestion[]>();

const searchAddressSuggestions = async (rawQuery: string, signal?: AbortSignal): Promise<AddressSuggestion[]> => {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Trích xuất tiền tố số nhà / hẻm / ngõ người dùng nhập (ví dụ: "Số 383", "383/12", "Hẻm 45")
  const houseMatch = query.match(/^(số\s+[\d\w\/-]+|hẻm\s+[\d\w\/-]+|ngõ\s+[\d\w\/-]+|[\d\w\/-]+)\b/i);
  const userPrefix = houseMatch ? houseMatch[0] : '';

  const results: AddressSuggestion[] = [];
  const seen = new Set<string>();

  // 1. Tìm kiếm qua Photon (hỗ trợ tiếng Việt rất tốt cho số nhà, ngõ, hẻm, tên đường)
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`,
      { signal },
    );
    if (photonRes.ok) {
      const data = (await photonRes.json()) as { features?: PhotonFeature[] };
      const features = data.features || [];

      for (const f of features) {
        const props = f.properties;
        const coords = f.geometry.coordinates;
        if (!coords || coords.length < 2) continue;

        let title = props.name || props.street || query;
        if (props.housenumber && !title.includes(props.housenumber)) {
          title = `${props.housenumber} ${title}`;
        } else if (userPrefix && !title.toLowerCase().includes(userPrefix.toLowerCase())) {
          title = `${userPrefix} ${title}`;
        }

        const subParts: string[] = [];
        if (props.locality && props.locality !== title) subParts.push(props.locality);
        if (props.district && props.district !== title) subParts.push(props.district);
        if (props.city) subParts.push(props.city);
        else if (props.state && !subParts.includes(props.state)) subParts.push(props.state);

        const subtitle = subParts.join(', ');
        const fullAddress = subtitle ? `${title}, ${subtitle}` : title;
        const key = `${title.toLowerCase()}|${subtitle.toLowerCase()}`;

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: `photon-${props.osm_id || Math.random()}`,
            title,
            subtitle,
            fullAddress,
            lat: Number(coords[1].toFixed(6)),
            lng: Number(coords[0].toFixed(6)),
          });
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }

  // 2. Fallback Nominatim nếu Photon không có kết quả
  if (results.length === 0 && !signal?.aborted) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&countrycodes=vn&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi' }, signal },
      );
      if (nomRes.ok) {
        const nomData = (await nomRes.json()) as Array<{
          place_id: number;
          lat: string;
          lon: string;
          name?: string;
          display_name: string;
          address?: {
            road?: string;
            suburb?: string;
            district?: string;
            city?: string;
            state?: string;
          };
        }>;

        for (const item of nomData) {
          const road = item.address?.road || item.name || query;
          let title = road;
          if (userPrefix && !title.toLowerCase().includes(userPrefix.toLowerCase())) {
            title = `${userPrefix} ${title}`;
          }

          const subParts: string[] = [];
          if (item.address?.suburb) subParts.push(item.address.suburb);
          if (item.address?.district) subParts.push(item.address.district);
          if (item.address?.city) subParts.push(item.address.city);
          else if (item.address?.state) subParts.push(item.address.state);

          const subtitle = subParts.join(', ') || item.display_name.split(',').slice(1, 4).join(',').trim();
          const fullAddress = subtitle ? `${title}, ${subtitle}` : title;

          results.push({
            id: `nom-${item.place_id}`,
            title,
            subtitle,
            fullAddress,
            lat: Number(Number(item.lat).toFixed(6)),
            lng: Number(Number(item.lon).toFixed(6)),
          });
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
    }
  }

  if (results.length > 0) {
    geocodeCache.set(cacheKey, results);
    if (geocodeCache.size > 100) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) geocodeCache.delete(firstKey);
    }
  }

  return results;
};

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
      setGeocodeSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    // Nếu có trong cache, hiển thị ngay tức thì (0ms)
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey)!;
      setGeocodeSuggestions(cached);
      if (cached.length > 0) {
        setShowSuggestions(true);
      }
      return;
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
  const [activeTourId, setActiveTourId] = useState<string | null>(null);

  // Price & Contract Deposit
  const [price, setPrice] = useState<string>(() => draft?.price ?? String(existingRoom?.giaThue ?? ''));
  const [contractDeposit, setContractDeposit] = useState<string>(() =>
    draft?.contractDeposit ?? String(existingRoom?.cocPhong ?? ''),
  );

  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(Boolean(draft));
  const formSnapshot = JSON.stringify({ categoryId, area, maxPeople, description, address, lat, lng,
    selectedAmenityCodes, imageUrls, price, contractDeposit });
  const dirty = formSnapshot !== JSON.stringify({
    categoryId: existingRoom?.maLpt ?? categories[0]?.maLpt ?? '',
    area: String(existingRoom?.dienTich ?? 25),
    maxPeople: String(existingRoom?.soNguoi ?? 2),
    description: existingRoom?.moTa ?? '',
    address: existingRoom?.diaChi ?? '',
    lat: existingRoom?.viDo ? Number(existingRoom.viDo) : 10.8012,
    lng: existingRoom?.kinhDo ? Number(existingRoom.kinhDo) : 106.7145,
    selectedAmenityCodes: existingRoom?.dsMaTienIch ?? [],
    imageUrls: existingRoom?.danhSachAnh ?? (existingRoom?.hinhAnhUrl ? [existingRoom.hinhAnhUrl] : []),
    price: String(existingRoom?.giaThue ?? ''),
    contractDeposit: String(existingRoom?.cocPhong ?? ''),
  });

  // Tự động lưu bản nháp ngầm khi người dùng đang nhập
  useEffect(() => {
    if (savedSuccessfully.current || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = draftSchema.safeParse(JSON.parse(formSnapshot));
        if (parsed.success) {
          localStorage.setItem(draftKey, formSnapshot);
        }
      } catch {
        // Bỏ qua nếu trình duyệt chặn localStorage
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dirty, draftKey, formSnapshot]);

  const leaveForm = () => {
    navigate('/landlord/rooms');
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setHasRestoredDraft(false);
    setCategoryId(existingRoom?.maLpt ?? categories[0]?.maLpt ?? '');
    setArea(String(existingRoom?.dienTich ?? 25));
    setMaxPeople(String(existingRoom?.soNguoi ?? 2));
    setDescription(existingRoom?.moTa ?? '');
    setAddress(existingRoom?.diaChi ?? '');
    setLat(existingRoom?.viDo ? Number(existingRoom.viDo) : 10.8012);
    setLng(existingRoom?.kinhDo ? Number(existingRoom.kinhDo) : 106.7145);
    setSelectedAmenityCodes(existingRoom?.dsMaTienIch ?? []);
    setImageUrls(
      existingRoom?.danhSachAnh && existingRoom.danhSachAnh.length > 0
        ? existingRoom.danhSachAnh
        : existingRoom?.hinhAnhUrl
          ? [existingRoom.hinhAnhUrl]
          : [],
    );
    setPrice(String(existingRoom?.giaThue ?? ''));
    setContractDeposit(String(existingRoom?.cocPhong ?? ''));
    toast.success('Đã xóa bản nháp');
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
    onSuccess: async (room) => {
      savedSuccessfully.current = true;
      if (activeTourId && room.maPhongTro) {
        try {
          await tour360Service.attachTourToRoom(room.maPhongTro, activeTourId);
        } catch {
          toast.warning('Đã lưu phòng, nhưng chưa gắn được Tour 360°. Bạn có thể gắn lại khi sửa phòng.');
        }
      }
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
  const numericPrice = Number(price.replace(/\D/g, '')) || 0;
  const numericDeposit = contractDeposit.trim() !== '' ? Number(contractDeposit.replace(/\D/g, '')) || 0 : numericPrice;

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5 mx-auto pb-8">
      {/* Compact Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Quay về danh sách phòng"
            onClick={leaveForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách</span>
          </button>
          <span className="text-xs text-slate-500 hidden sm:inline">
            {isEdit ? `Đang chỉnh sửa phòng #${id}` : 'Hoàn thiện thông tin bên dưới để gửi duyệt bài đăng'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full">
            Tự động lưu nháp
          </span>
          {hasRestoredDraft && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full cursor-pointer"
            >
              Xóa nháp
            </button>
          )}
        </div>
      </div>

      {/* 8 / 4 Asymmetric Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (8/12): FORM NHẬP LIỆU */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card 1: Thông tin & Giá thuê */}
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <Card.Header className="p-0">
              <Card.Title className="text-base font-bold text-slate-900">
                Thông tin cơ bản & Giá thuê
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Chọn loại hình, diện tích, sức chứa và chi phí thuê hàng tháng.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="room-categoryId" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Loại hình phòng trọ <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="room-categoryId"
                    aria-invalid={Boolean(errors.categoryId)}
                    aria-describedby={errors.categoryId ? 'room-categoryId-error' : undefined}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800 bg-white font-semibold"
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
                  <label htmlFor="room-area" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diện tích (m²) <span className="text-red-500">*</span>
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
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800 font-semibold"
                  />
                  {fieldError('area')}
                </div>

                <div>
                  <label htmlFor="room-maxPeople" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số người tối đa <span className="text-red-500">*</span>
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
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800 font-semibold"
                  />
                  {fieldError('maxPeople')}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="room-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className="w-full text-sm p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-900 font-bold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₫
                    </span>
                  </div>
                  {fieldError('price')}
                </div>

                <div>
                  <label htmlFor="room-contractDeposit" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className="w-full text-sm p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-900 font-bold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₫
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: 'Bằng 1 tháng', val: numericPrice > 0 ? String(numericPrice) : '' },
                      { label: 'Nửa tháng', val: numericPrice > 0 ? String(Math.round(numericPrice / 2)) : '' },
                      { label: 'Không cọc', val: '0' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setContractDeposit(chip.val)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  {fieldError('contractDeposit')}
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Card 2: Địa chỉ & Bản đồ */}
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <Card.Header className="p-0">
              <Card.Title className="text-base font-bold text-slate-900">
                Địa chỉ & Vị trí bản đồ
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Nhập địa chỉ để gợi ý vị trí tự động, hoặc kéo ghim trực tiếp trên bản đồ.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0 space-y-4">
              <div className="relative z-20" ref={suggestionsRef}>
                <label htmlFor="room-address" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      setAddress(e.target.value);
                      setGeocodedNotice(null);
                    }}
                    onFocus={() => {
                      if (geocodeSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="Số nhà, ngõ/hẻm, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800 font-medium"
                  />
                  {isGeocoding ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-teal-700 animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
                {fieldError('address')}

                {showSuggestions && geocodeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    <div className="px-3.5 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      Gợi ý địa chỉ (Bấm để ghim lên bản đồ)
                    </div>
                    {geocodeSuggestions.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleSelectAddressSuggestion(item)}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
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

                {geocodedNotice && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
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
                height="280px"
              />
            </Card.Content>
          </Card>

          {/* Card 3: Tiện ích & Mô tả */}
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <Card.Header className="p-0 flex flex-row items-center justify-between">
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  Tiện ích & Mô tả
                </Card.Title>
              </div>
              <Chip size="sm" color="default" variant="soft">
                <Chip.Label>Đã chọn {selectedAmenityCodes.length} tiện ích</Chip.Label>
              </Chip>
            </Card.Header>

            <Card.Content className="p-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {amenities.map((amenity) => {
                  const isChecked = selectedAmenityCodes.includes(amenity.maTienIch);
                  return (
                    <button
                      type="button"
                      key={amenity.maTienIch}
                      onClick={() => handleToggleAmenity(amenity.maTienIch)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-teal-700 bg-teal-50/40 text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block truncate">{amenity.tenTienIch}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-teal-700 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <label htmlFor="room-description" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mô tả chi tiết & Nội quy phòng trọ
                </label>
                <textarea
                  rows={4}
                  id="room-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả chi tiết tình trạng nội thất, giờ giấc ra vào, giá điện nước, chỗ để xe và nội quy chung..."
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800 leading-relaxed"
                />
              </div>
            </Card.Content>
          </Card>

          {/* Card 4: Hình ảnh & Tour 360 */}
          <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <Card.Header className="p-0 flex flex-row items-center justify-between">
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  Hình ảnh thực tế của phòng trọ
                </Card.Title>
                <Card.Description className="text-xs text-slate-500">
                  Tối thiểu 1 ảnh rõ nét. Ảnh đầu tiên sẽ làm ảnh bìa hiển thị.
                </Card.Description>
              </div>
              <Chip size="sm" color="default" variant="soft">
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
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-teal-700 bg-slate-50 ring-2 ring-teal-700/15'
                    : 'border-slate-300 hover:border-teal-700 hover:bg-slate-50/60'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-slate-100 text-teal-700 flex items-center justify-center mx-auto mb-2">
                  {uploadImagesMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {uploadImagesMutation.isPending
                    ? 'Đang tải ảnh lên...'
                    : 'Kéo thả hình ảnh vào đây hoặc bấm để chọn tệp'}
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
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-700 text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddManualUrl}
                  className="px-4 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Thêm URL
                </button>
              </div>

              {imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {imageUrls.map((img, idx) => (
                    <div
                      key={`${img}-${idx}`}
                      className="relative aspect-4/3 rounded-xl overflow-hidden ring-1 ring-slate-200 group bg-slate-100"
                    >
                      <img src={img} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 ? (
                        <span className="absolute top-2 left-2 bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-white" />
                          Ảnh đại diện
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(idx)}
                          className="absolute top-2 left-2 bg-slate-900/75 hover:bg-teal-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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

          <LandlordTour360Section
            roomId={isEdit ? id : undefined}
            tourId={activeTourId}
            onTourIdChange={setActiveTourId}
          />
        </div>

        {/* CỘT PHẢI (4/12): TÓM TẮT STICKY & GỬI DUYỆT */}
        <div className="xl:col-span-4 xl:sticky xl:top-6 space-y-5">
          {/* Xem trước tin đăng */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="aspect-16/9 bg-slate-100 relative overflow-hidden">
              {imageUrls[0] ? (
                <img src={imageUrls[0]} alt="Xem trước ảnh bìa" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                  <ImageIcon className="w-7 h-7 text-slate-300" />
                  <span className="text-[11px]">Chưa có ảnh đại diện</span>
                </div>
              )}
              {selectedCategory && (
                <span className="absolute top-3 left-3 bg-white/95 text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-xs">
                  {selectedCategory.tenLoaiPhongTro}
                </span>
              )}
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-extrabold text-slate-900">
                  {numericPrice > 0 ? formatVND(numericPrice) : 'Chưa nhập giá'}
                </span>
                {numericPrice > 0 && <span className="text-xs text-slate-500">/ tháng</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>{area || '—'} m²</span>
                <span className="text-slate-300">•</span>
                <span>Tối đa {maxPeople || '—'} người</span>
                <span className="text-slate-300">•</span>
                <span>Cọc HĐ: {numericDeposit > 0 ? formatVND(numericDeposit) : 'Không cọc'}</span>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-slate-500 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">
                  {address.trim() || 'Chưa nhập địa chỉ cụ thể'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{selectedAmenityCodes.length} tiện ích</span>
                <span>{imageUrls.length}/10 hình ảnh</span>
              </div>
            </div>
          </Card>

          {/* Minh bạch Cọc lịch xem & Phí sàn */}
          <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Phí dịch vụ & Cọc lịch xem
              </h4>
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">Cọc giữ chân lịch xem</span>
                <span className="font-bold text-slate-900">{formatVND(viewingDeposit)}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">Hoa hồng khi chốt thuê</span>
                <span className="font-bold text-slate-900">{formatVND(platformFee)}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">Hoàn về ví chủ trọ</span>
                <span className="font-bold text-teal-700">{formatVND(landlordNetAdvance)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
              Chỉ trích thu phí hoa hồng khi cả hai bên xác nhận thuê thành công. Nếu không thuê, sàn hoàn lại 100% ({formatVND(viewingDeposit)}) về ví chủ trọ.
            </p>
          </Card>

          {/* Nút hành động */}
          <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
            <button
              type="submit"
              disabled={saveRoomMutation.isPending || uploadImagesMutation.isPending}
              className="w-full px-5 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

            <button
              type="button"
              onClick={leaveForm}
              className="w-full px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
          </Card>
        </div>
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
        <Loader2 className="w-7 h-7 animate-spin text-teal-600 mb-2" />
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
