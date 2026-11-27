import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import { WizardStepIndicator } from '../../../components/landlord/WizardStepIndicator';
import { LocationPickerModal } from '../../../components/landlord/LocationPickerModal';
import {
  InlineLocationPicker,
  LocationCoords,
} from '../../../components/landlord/InlineLocationPicker';
import { useCreateRoomStore } from '../../../store/useCreateRoomStore';
import { landlordService } from '../../../services/landlord.service';
import { tour360Service } from '../../../services/tour360.service';
import { formatVND, formatVNDShort } from '../../../utils/formatVND';

const ROOM_TYPES = [
  { id: 'LPT002', name: 'Phòng trọ khép kín' },
  { id: 'LPT003', name: 'Chung cư mini / Studio' },
  { id: 'LPT001', name: 'Ký túc xá / Sleepbox' },
];

interface AmenityOption {
  id: string;
  name: string;
  iconType: 'ionicons' | 'material';
  iconName: string;
}

const AMENITY_OPTIONS: AmenityOption[] = [
  { id: 'TI0002', name: 'Máy lạnh', iconType: 'material', iconName: 'air-conditioner' },
  { id: 'TI0001', name: 'WiFi', iconType: 'ionicons', iconName: 'wifi-outline' },
  { id: 'TI0005', name: 'Giữ xe', iconType: 'material', iconName: 'garage' },
  { id: 'TI0004', name: 'Tủ lạnh', iconType: 'material', iconName: 'fridge-outline' },
  { id: 'TI0003', name: 'Máy giặt', iconType: 'material', iconName: 'washing-machine' },
  { id: 'TI0006', name: 'Khóa vân tay', iconType: 'ionicons', iconName: 'finger-print-outline' },
];

const DESCRIPTION_CHIPS = [
  'Giờ giấc tự do',
  'Không chung chủ',
  'Gần chợ/trường học',
  'Có cửa sổ thoáng',
  'An ninh 24/7',
];

const DEFAULT_COORDS: LocationCoords = {
  latitude: 10.8231,
  longitude: 106.6874,
};

function parseInitialCoords(viDo?: string, kinhDo?: string): LocationCoords {
  const lat = Number(viDo);
  const lng = Number(kinhDo);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { latitude: lat, longitude: lng };
  }
  return DEFAULT_COORDS;
}

export default function CreateRoomScreen() {
  const router = useRouter();
  const {
    currentStep,
    setStep,
    step1,
    updateStep1,
    step2,
    updateStep2,
    step3,
    updateStep3,
    step4,
    updateStep4,
    images,
    addImage,
    removeImage,
    setCoverImage,
    tour360Id,
    activeDraftId,
    loadDrafts,
    saveDraft,
    deleteDraft,
    resetWizard,
  } = useCreateRoomStore();

  // Local state Step 1
  const [tenPhong, setTenPhong] = useState(step1.tenPhong || '');
  const [selectedRoomType, setSelectedRoomType] = useState(
    ROOM_TYPES.find((t) => t.id === step1.maLPT) || ROOM_TYPES[0]
  );
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [giaThue, setGiaThue] = useState(step1.giaThue ? step1.giaThue.toString() : '3500000');
  const [cocPhong, setCocPhong] = useState(step1.cocPhong ? step1.cocPhong.toString() : '3500000');
  const [giaDien, setGiaDien] = useState(step1.giaDien ? step1.giaDien.toString() : '0');
  const [giaNuocGia, setGiaNuocGia] = useState(step1.giaNuoc?.gia ? step1.giaNuoc.gia.toString() : '0');
  const [giaNuocTheoNguoi, setGiaNuocTheoNguoi] = useState<boolean>(Boolean(step1.giaNuoc?.theoNguoi ?? false));
  const [dienTich, setDienTich] = useState(step1.dienTich ? step1.dienTich.toString() : '24');
  const [soNguoi, setSoNguoi] = useState(step1.soNguoi || 2);
  const [diaChi, setDiaChi] = useState(step1.diaChi || step2.diaChi || '');
  const [coordinates, setCoordinates] = useState<LocationCoords>(() =>
    parseInitialCoords(step2.viDo, step2.kinhDo)
  );
  const [showLocationModal, setShowLocationModal] = useState(false);

  const handleSelectLocationFromModal = (
    coords: LocationCoords,
    suggestedAddress?: string
  ) => {
    setCoordinates(coords);
    if (suggestedAddress && suggestedAddress.trim()) {
      setDiaChi(suggestedAddress);
    }
  };

  // Local state Step 2
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    step3.tienIchIds && step3.tienIchIds.length > 0 ? step3.tienIchIds : ['TI0001', 'TI0002']
  );
  const [moTa, setMoTa] = useState(step4.moTa || '');

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  // Đồng bộ form khi mở một bản nháp đã lưu
  useEffect(() => {
    setTenPhong(step1.tenPhong || '');
    setSelectedRoomType(ROOM_TYPES.find((t) => t.id === step1.maLPT) || ROOM_TYPES[0]);
    setGiaThue(step1.giaThue ? step1.giaThue.toString() : '3500000');
    setCocPhong(step1.cocPhong !== undefined ? step1.cocPhong.toString() : '3500000');
    setGiaDien(step1.giaDien !== undefined ? step1.giaDien.toString() : '0');
    setGiaNuocGia(step1.giaNuoc?.gia !== undefined ? step1.giaNuoc.gia.toString() : '0');
    setGiaNuocTheoNguoi(Boolean(step1.giaNuoc?.theoNguoi ?? false));
    setDienTich(step1.dienTich ? step1.dienTich.toString() : '24');
    setSoNguoi(step1.soNguoi || 2);
    setDiaChi(step1.diaChi || step2.diaChi || '');
    setCoordinates(parseInitialCoords(step2.viDo, step2.kinhDo));
    setSelectedAmenities(
      step3.tienIchIds && step3.tienIchIds.length > 0 ? step3.tienIchIds : ['TI0001', 'TI0002']
    );
    setMoTa(step4.moTa || '');
  }, [activeDraftId]);

  const numericGiaThue = Number(giaThue) || 0;
  const numericCocPhong = Number(cocPhong) || 0;
  const publishedRef = useRef(false);

  const hasDraftContent =
    Boolean(tenPhong.trim()) ||
    Boolean(diaChi.trim()) ||
    Boolean(moTa.trim()) ||
    images.length > 0 ||
    Boolean(tour360Id);

  const buildCurrentDraftSnapshot = () => ({
    currentStep,
    step1: {
      tenPhong: tenPhong.trim(),
      maLPT: selectedRoomType.id,
      giaThue: Number(giaThue) || 3500000,
      cocPhong: Number(cocPhong) || 0,
      giaDien: Number(giaDien) || 0,
      giaNuoc: { gia: Number(giaNuocGia) || 0, theoNguoi: giaNuocTheoNguoi },
      dienTich: Number(dienTich) || 24,
      soNguoi,
      diaChi: diaChi.trim(),
    },
    step2: {
      diaChi: diaChi.trim(),
      kinhDo: coordinates.longitude.toString(),
      viDo: coordinates.latitude.toString(),
    },
    step3: { tienIchIds: selectedAmenities },
    step4: { moTa },
    images,
    tour360Id,
  });

  // Tự động lưu bản nháp khi người dùng đang nhập mà dừng lại (debounce 800ms)
  useEffect(() => {
    if (publishedRef.current || !hasDraftContent) return;
    const timer = setTimeout(() => {
      saveDraft(buildCurrentDraftSnapshot());
    }, 800);
    return () => clearTimeout(timer);
  }, [
    currentStep,
    tenPhong,
    selectedRoomType.id,
    giaThue,
    cocPhong,
    dienTich,
    soNguoi,
    diaChi,
    coordinates.latitude,
    coordinates.longitude,
    selectedAmenities,
    moTa,
    images,
    tour360Id,
  ]);

  // Xử lý nút Quay lại: tự động lưu thành bản nháp nếu đã nhập dữ liệu
  const handleBack = async () => {
    if (currentStep === 3) {
      setStep(2);
    } else if (currentStep === 2) {
      setStep(1);
    } else {
      if (hasDraftContent && !publishedRef.current) {
        await saveDraft(buildCurrentDraftSnapshot());
      }
      resetWizard();
      router.back();
    }
  };

  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  // Chặn nút Back vật lý / cử chỉ vuốt lùi trên Android để lùi từng bước 3 -> 2 -> 1
  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  const handleSelectStep = (targetStep: number) => {
    if (targetStep === currentStep) return;

    if (targetStep < currentStep) {
      setStep(targetStep);
      return;
    }

    if (currentStep === 1) {
      if (!validateStep1()) return;
      saveStep1();
      setStep(targetStep);
    } else if (currentStep === 2) {
      saveStep2();
      setStep(targetStep);
    }
  };

  const validateStep1 = (): boolean => {
    if (!tenPhong.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên phòng trọ.');
      return false;
    }
    if (!giaThue || Number(giaThue) <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập giá thuê hợp lệ.');
      return false;
    }
    if (cocPhong === '' || Number(cocPhong) < 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền đặt cọc hợp lệ.');
      return false;
    }
    if (!dienTich || Number(dienTich) <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập diện tích phòng.');
      return false;
    }
    if (!diaChi.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc chọn địa chỉ phòng trọ.');
      return false;
    }
    return true;
  };

  const saveStep1 = () => {
    updateStep1({
      tenPhong: tenPhong.trim(),
      maLPT: selectedRoomType.id,
      giaThue: Number(giaThue) || 3500000,
      cocPhong: Number(cocPhong) || 0,
      giaDien: Number(giaDien) || 0,
      giaNuoc: { gia: Number(giaNuocGia) || 0, theoNguoi: giaNuocTheoNguoi },
      dienTich: Number(dienTich) || 24,
      soNguoi,
      diaChi: diaChi.trim(),
    });
    updateStep2({
      diaChi: diaChi.trim(),
      kinhDo: coordinates.longitude.toString(),
      viDo: coordinates.latitude.toString(),
    });
  };

  const saveStep2 = () => {
    updateStep3({ tienIchIds: selectedAmenities });
    updateStep4({ moTa });
  };

  const handleNextFromStep1 = () => {
    if (!validateStep1()) return;
    saveStep1();
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    saveStep2();
    setStep(3);
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const appendDescriptionChip = (chip: string) => {
    if (moTa.toLowerCase().includes(chip.toLowerCase())) return;
    const prefix = moTa.trim().length > 0 ? `${moTa.trim()} • ` : '';
    setMoTa(`${prefix}${chip}`);
  };

  // Chọn ảnh từ thư viện
  const handlePickImages = async () => {
    if (images.length >= 10) {
      Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 10 hình ảnh.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để tải ảnh phòng trọ lên.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      result.assets.forEach((asset) => {
        addImage(asset.uri);
      });
    }
  };

  // Chụp ảnh trực tiếp bằng camera
  const handleTakePhoto = async () => {
    if (images.length >= 10) {
      Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 10 hình ảnh.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Cần quyền camera', 'Ứng dụng cần quyền máy ảnh để chụp ảnh phòng trực tiếp.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      addImage(result.assets[0].uri);
    }
  };

  // Đăng bài hoàn tất
  const handlePublish = async () => {
    if (images.length === 0) {
      Alert.alert('Thiếu hình ảnh', 'Vui lòng chọn tối thiểu 1 hình ảnh chụp phòng thực tế.');
      return;
    }

    setSubmitting(true);
    try {
      const sortedImages = [...images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));
      const imageUris = sortedImages.map((img) => img.uri);

      let uploadedUrls = imageUris;
      try {
        uploadedUrls = await landlordService.uploadImages(imageUris);
      } catch (uploadErr) {
        console.warn('Upload Cloudinary thất bại, tiếp tục tạo phòng với ảnh hiện tại:', uploadErr);
      }

      const payload = {
        tenPhong: tenPhong.trim(),
        maLpt: selectedRoomType.id,
        giaThue: Number(giaThue) || 3500000,
        coc: Number(cocPhong) || 0,
        giaDien: Number(giaDien) || 0,
        giaNuoc: {
          gia: Number(giaNuocGia) || 0,
          theoNguoi: giaNuocTheoNguoi,
        },
        dienTich: Number(dienTich) || 24,
        soNguoi,
        diaChi: diaChi.trim(),
        kinhDo: coordinates.longitude.toString(),
        viDo: coordinates.latitude.toString(),
        dsTienIch: selectedAmenities,
        moTa: moTa.trim(),
        hinhAnhUrls: uploadedUrls,
      };

      const createdRoom = await landlordService.createRoom(payload);
      publishedRef.current = true;
      if (tour360Id && createdRoom?.maPhongTro) {
        try {
          await tour360Service.attachTourToRoom(createdRoom.maPhongTro, tour360Id);
        } catch (attachErr) {
          console.warn('Chưa gắn được Tour 360°:', attachErr);
        }
      }
      if (activeDraftId) {
        await deleteDraft(activeDraftId);
      }
      Alert.alert('Thành công', 'Đăng tin phòng trọ thành công! Tin của bạn đang chờ Admin kiểm duyệt.', [
        {
          text: 'Xem bài đăng',
          onPress: () => {
            resetWizard();
            router.replace('/(landlord)/my-posts');
          },
        },
      ]);
    } catch (err: any) {
      console.error('Lỗi khi đăng phòng:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể đăng tin phòng trọ lúc này. Vui lòng thử lại sau.';
      Alert.alert('Đăng bài thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top', 'bottom']}>
      {/* 1. Header */}
      <View className="px-4 py-3 bg-white flex-row items-center justify-between border-b border-gray-100">
        <Pressable onPress={handleBack} className="p-1 -ml-1 active:opacity-70">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Đăng phòng mới</Text>
        <Text className="text-xs font-semibold text-teal-700">Bước {currentStep}/3</Text>
      </View>

      {/* 2. Stepper Indicator 3 bước */}
      <View className="bg-white">
        <WizardStepIndicator currentStep={currentStep} onSelectStep={handleSelectStep} />
      </View>

      {/* 3. Nội dung form theo Step */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= STEP 1: THÔNG TIN PHÒNG, GIÁ & VỊ TRÍ ================= */}
          {currentStep === 1 && (
            <View>
              {/* Card 1: Thông tin cơ bản */}
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-xs">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-7 h-7 rounded-lg bg-teal-50 items-center justify-center">
                    <Ionicons name="home-outline" size={16} color="#0f766e" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">Thông tin cơ bản</Text>
                </View>

                <View className="mb-3.5">
                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tên phòng *</Text>
                  <TextInput
                    placeholder="Ví dụ: Phòng gác lửng studio tiện nghi"
                    placeholderTextColor="#9ca3af"
                    value={tenPhong}
                    onChangeText={setTenPhong}
                    className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/70"
                  />
                </View>

                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">Loại phòng *</Text>
                  <Pressable
                    onPress={() => setShowTypeModal(true)}
                    className="border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between bg-gray-50/70 active:bg-gray-100"
                  >
                    <Text className="text-sm text-gray-900">{selectedRoomType.name}</Text>
                    <Ionicons name="chevron-down" size={16} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

              {/* Card 2: Chi phí & Sức chứa */}
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-xs">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-7 h-7 rounded-lg bg-teal-50 items-center justify-center">
                    <Ionicons name="cash-outline" size={16} color="#0f766e" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">Chi phí & Sức chứa</Text>
                </View>

                <View className="mb-3.5">
                  <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá thuê *</Text>
                  <View className="flex-row items-center border border-gray-200 rounded-xl px-3.5 bg-gray-50/70">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="3500000"
                      placeholderTextColor="#9ca3af"
                      value={giaThue}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, '');
                        setGiaThue(clean);
                        if (!cocPhong || cocPhong === giaThue) {
                          setCocPhong(clean);
                        }
                      }}
                      className="flex-1 py-2.5 text-sm font-semibold text-gray-900"
                    />
                    <Text className="text-xs text-gray-500 font-medium">VNĐ/tháng</Text>
                  </View>
                  {numericGiaThue > 0 && (
                    <Text className="text-[11px] text-teal-700 font-medium mt-1">
                      Hiển thị: {formatVND(numericGiaThue)} ({formatVNDShort(numericGiaThue)})
                    </Text>
                  )}
                </View>

                <View className="mb-3.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-semibold text-gray-700">Tiền đặt cọc *</Text>
                    {numericCocPhong >= 0 && cocPhong !== '' && (
                      <Text className="text-[11px] text-gray-500">{formatVND(numericCocPhong)}</Text>
                    )}
                  </View>
                  <View className="flex-row items-center border border-gray-200 rounded-xl px-3.5 bg-gray-50/70">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="3500000"
                      placeholderTextColor="#9ca3af"
                      value={cocPhong}
                      onChangeText={(val) => setCocPhong(val.replace(/\D/g, ''))}
                      className="flex-1 py-2.5 text-sm font-semibold text-gray-900"
                    />
                    <Text className="text-xs text-gray-500 font-medium">VNĐ</Text>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    {[
                      { label: 'Bằng 1 tháng', value: String(numericGiaThue) },
                      { label: 'Nửa tháng', value: String(Math.round(numericGiaThue / 2)) },
                      { label: 'Không cọc', value: '0' },
                    ].map((chip) => {
                      const active = cocPhong === chip.value;
                      return (
                        <Pressable
                          key={chip.label}
                          onPress={() => setCocPhong(chip.value)}
                          className={`px-2.5 py-1 rounded-full border ${
                            active
                              ? 'bg-teal-50 border-teal-600'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-medium ${
                              active ? 'text-teal-800 font-bold' : 'text-gray-600'
                            }`}
                          >
                            {chip.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Giá điện & Giá nước */}
                <View className="flex-row gap-3 mb-3.5">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá điện</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50/70">
                      <TextInput
                        keyboardType="numeric"
                        placeholder="3500"
                        placeholderTextColor="#9ca3af"
                        value={giaDien}
                        onChangeText={(val) => setGiaDien(val.replace(/\D/g, ''))}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-900"
                      />
                      <Text className="text-[11px] text-gray-500 font-medium">đ/kWh</Text>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá nước</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50/70">
                      <TextInput
                        keyboardType="numeric"
                        placeholder={giaNuocTheoNguoi ? '100000' : '15000'}
                        placeholderTextColor="#9ca3af"
                        value={giaNuocGia}
                        onChangeText={(val) => setGiaNuocGia(val.replace(/\D/g, ''))}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-900"
                      />
                      <Text className="text-[11px] text-gray-500 font-medium">
                        {giaNuocTheoNguoi ? 'đ/người' : 'đ/m³'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 mb-3.5">
                  <Text className="text-xs text-gray-600 font-medium">Tính nước:</Text>
                  <Pressable
                    onPress={() => setGiaNuocTheoNguoi(false)}
                    className={`px-3 py-1 rounded-full border ${
                      !giaNuocTheoNguoi
                        ? 'bg-teal-50 border-teal-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        !giaNuocTheoNguoi ? 'text-teal-800 font-bold' : 'text-gray-600'
                      }`}
                    >
                      Theo số khối (m³)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setGiaNuocTheoNguoi(true)}
                    className={`px-3 py-1 rounded-full border ${
                      giaNuocTheoNguoi
                        ? 'bg-teal-50 border-teal-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        giaNuocTheoNguoi ? 'text-teal-800 font-bold' : 'text-gray-600'
                      }`}
                    >
                      Theo người
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1.5">Diện tích *</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3.5 bg-gray-50/70">
                      <TextInput
                        keyboardType="numeric"
                        value={dienTich}
                        onChangeText={(val) => setDienTich(val.replace(/\D/g, ''))}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-900"
                      />
                      <Text className="text-xs text-gray-500">m²</Text>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1.5">Số người tối đa *</Text>
                    <View className="border border-gray-200 rounded-xl px-2 py-1.5 flex-row items-center justify-between bg-gray-50/70">
                      <Pressable
                        onPress={() => setSoNguoi(Math.max(1, soNguoi - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
                      >
                        <Ionicons name="remove" size={14} color="#374151" />
                      </Pressable>
                      <Text className="text-sm font-bold text-gray-900">{soNguoi}</Text>
                      <Pressable
                        onPress={() => setSoNguoi(soNguoi + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
                      >
                        <Ionicons name="add" size={14} color="#374151" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* Card 3: Địa chỉ & Bản đồ hiển thị trực tiếp */}
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-2 shadow-xs">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-7 h-7 rounded-lg bg-teal-50 items-center justify-center">
                    <Ionicons name="location-outline" size={16} color="#0f766e" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">Địa chỉ & Bản đồ</Text>
                </View>

                <InlineLocationPicker
                  address={diaChi}
                  onChangeAddress={setDiaChi}
                  coordinates={coordinates}
                  onChangeCoordinates={setCoordinates}
                  onOpenFullMap={() => setShowLocationModal(true)}
                />
              </View>
            </View>
          )}

          {/* ================= STEP 2: TIỆN ÍCH & MÔ TẢ CHI TIẾT ================= */}
          {currentStep === 2 && (
            <View>
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-xs">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-bold text-gray-900">Tiện ích phòng</Text>
                  <Text className="text-xs text-teal-700 font-semibold">
                    Đã chọn {selectedAmenities.length}
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-2.5">
                  {AMENITY_OPTIONS.map((item) => {
                    const isSelected = selectedAmenities.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleAmenity(item.id)}
                        className={`w-[31%] py-3.5 px-2 rounded-2xl border items-center justify-center active:opacity-80 ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        {item.iconType === 'ionicons' ? (
                          <Ionicons
                            name={item.iconName as any}
                            size={24}
                            color={isSelected ? '#0f766e' : '#6b7280'}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name={item.iconName as any}
                            size={24}
                            color={isSelected ? '#0f766e' : '#6b7280'}
                          />
                        )}
                        <Text
                          numberOfLines={1}
                          className={`text-xs font-medium mt-1.5 text-center ${
                            isSelected ? 'text-teal-800 font-bold' : 'text-gray-700'
                          }`}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-gray-900">Mô tả chi tiết</Text>
                  <Text className="text-[11px] text-gray-400">{moTa.length} ký tự</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3"
                  contentContainerStyle={{ gap: 6 }}
                >
                  {DESCRIPTION_CHIPS.map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => appendDescriptionChip(chip)}
                      className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 active:bg-teal-100"
                    >
                      <Text className="text-[11px] font-medium text-teal-800">+ {chip}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <TextInput
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Mô tả giờ giấc, tiền điện nước, nội thất sẵn có, khu vực xung quanh..."
                  placeholderTextColor="#9ca3af"
                  value={moTa}
                  onChangeText={setMoTa}
                  className="border border-gray-200 rounded-2xl p-3.5 text-sm text-gray-900 bg-gray-50/70 min-h-[140px] leading-5"
                />
              </View>
            </View>
          )}

          {/* ================= STEP 3: HÌNH ẢNH, QUÉT 3D & TÓM TẮT ================= */}
          {currentStep === 3 && (
            <View>
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-xs">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-gray-900">Hình ảnh phòng *</Text>
                  <Text className="text-xs font-semibold text-teal-700">{images.length}/10 ảnh</Text>
                </View>
                <Text className="text-xs text-gray-400 mb-3.5">
                  Tối đa 10 ảnh, mỗi ảnh &lt; 10MB. Chạm vào ảnh để đặt làm ảnh chính.
                </Text>

                <View className="flex-row gap-2.5 mb-4">
                  <Pressable
                    onPress={handlePickImages}
                    className="flex-1 border-2 border-dashed border-teal-500 bg-teal-50/40 rounded-2xl py-4 px-3 items-center justify-center active:bg-teal-100/50"
                  >
                    <Ionicons name="images-outline" size={24} color="#0f766e" />
                    <Text className="text-xs font-bold text-teal-800 mt-1.5">Chọn từ thư viện</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleTakePhoto}
                    className="flex-1 border border-gray-200 bg-gray-50 rounded-2xl py-4 px-3 items-center justify-center active:bg-gray-100"
                  >
                    <Ionicons name="camera-outline" size={24} color="#374151" />
                    <Text className="text-xs font-bold text-gray-800 mt-1.5">Chụp ảnh ngay</Text>
                  </Pressable>
                </View>

                {images.length > 0 && (
                  <View className="flex-row flex-wrap gap-2.5">
                    {images.map((img, idx) => (
                      <Pressable
                        key={`${img.uri}-${idx}`}
                        onPress={() => setCoverImage(idx)}
                        className="relative w-[31%] aspect-square rounded-2xl overflow-hidden border border-gray-200 active:opacity-90"
                      >
                        <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />

                        {img.isCover && (
                          <View className="absolute top-1.5 left-1.5 bg-teal-700 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-bold text-white">Ảnh chính</Text>
                          </View>
                        )}

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 items-center justify-center active:bg-black/80"
                        >
                          <Ionicons name="close" size={12} color="#ffffff" />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Tour 360° đa điểm (Tùy chọn) */}
              <View className="p-4 rounded-2xl border border-teal-200 bg-teal-50/70 mb-3.5">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="compass-outline" size={20} color="#0f766e" />
                    <Text className="text-sm font-bold text-teal-950">Tour 360° đa điểm (Tùy chọn)</Text>
                  </View>
                  {tour360Id && (
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-emerald-800">Đã gắn #{tour360Id}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-teal-800/80 mb-3 leading-4">
                  Tải ảnh Panorama / 360° từng khu vực trong phòng để khách tham quan đa góc nhìn trực tuyến.
                </Text>
                <Pressable
                  onPress={() => router.push('/(landlord)/tour-360')}
                  className="bg-teal-700 py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2 active:bg-teal-800"
                >
                  <Ionicons name="images-outline" size={16} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">
                    {tour360Id ? 'Chỉnh sửa Tour 360°' : 'Tạo Tour 360° cho phòng'}
                  </Text>
                </Pressable>
              </View>

              {/* Tóm tắt nhanh trước khi đăng */}
              <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Tóm tắt tin đăng
                </Text>
                <Text className="text-sm font-bold text-gray-900 mb-1" numberOfLines={1}>
                  {tenPhong || 'Chưa đặt tên phòng'}
                </Text>
                <Text className="text-xs text-teal-700 font-semibold mb-1.5">
                  {selectedRoomType.name} • {formatVNDShort(numericGiaThue)} • {dienTich}m² • Tối đa {soNguoi} người
                </Text>
                <View className="flex-row items-start gap-1.5 mb-2">
                  <Ionicons name="location-outline" size={14} color="#6b7280" style={{ marginTop: 1 }} />
                  <Text className="text-xs text-gray-600 flex-1" numberOfLines={2}>
                    {diaChi || 'Chưa nhập địa chỉ'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3 pt-2 border-t border-gray-100">
                  <Text className="text-[11px] text-gray-500">Ảnh: {images.length} hình</Text>
                  <Text className="text-[11px] text-gray-500">
                    Tour 360°: {tour360Id ? 'Đã đính kèm' : 'Chưa có'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 4. Footer 2 Nút */}
      <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
        <View className="flex-1">
          <Button
            variant="outline"
            onPress={handleBack}
            className="w-full border-gray-200 py-2.5 rounded-xl"
          >
            <Button.Label className="text-gray-700 font-semibold text-sm">Quay lại</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          {currentStep === 1 && (
            <Button
              variant="primary"
              onPress={handleNextFromStep1}
              className="w-full bg-teal-700 py-2.5 rounded-xl"
            >
              <Button.Label className="text-white font-bold text-sm">Tiếp tục</Button.Label>
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              variant="primary"
              onPress={handleNextFromStep2}
              className="w-full bg-teal-700 py-2.5 rounded-xl"
            >
              <Button.Label className="text-white font-bold text-sm">Tiếp tục</Button.Label>
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              variant="primary"
              onPress={handlePublish}
              isDisabled={submitting}
              className="w-full bg-teal-700 py-2.5 rounded-xl"
            >
              <Button.Label className="text-white font-bold text-sm">
                {submitting ? 'Đang tải ảnh & đăng...' : 'Đăng bài'}
              </Button.Label>
            </Button>
          )}
        </View>
      </View>

      {/* Modal Chọn loại phòng (giữ nguyên Dropdown theo yêu cầu) */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <Pressable
          onPress={() => setShowTypeModal(false)}
          className="flex-1 bg-black/40 items-center justify-center p-4"
        >
          <View className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl">
            <Text className="text-base font-bold text-gray-900 mb-3">Chọn loại phòng</Text>
            {ROOM_TYPES.map((type) => {
              const isSelected = type.id === selectedRoomType.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setSelectedRoomType(type);
                    setShowTypeModal(false);
                  }}
                  className={`p-3 rounded-xl mb-1 flex-row items-center justify-between ${
                    isSelected ? 'bg-teal-50' : 'active:bg-gray-50'
                  }`}
                >
                  <Text className={`text-sm ${isSelected ? 'font-bold text-teal-800' : 'text-gray-800'}`}>
                    {type.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#0f766e" />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Modal Bản đồ toàn màn hình (khi bấm mở rộng từ bản đồ inline) */}
      <LocationPickerModal
        visible={showLocationModal}
        initialCoords={coordinates}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleSelectLocationFromModal}
      />
    </SafeAreaView>
  );
}
