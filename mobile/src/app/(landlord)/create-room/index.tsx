import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import { WizardStepIndicator } from '../../../components/landlord/WizardStepIndicator';
import { useCreateRoomStore } from '../../../store/useCreateRoomStore';
import { landlordService } from '../../../services/landlord.service';

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
  const [dienTich, setDienTich] = useState(step1.dienTich ? step1.dienTich.toString() : '24');
  const [soNguoi, setSoNguoi] = useState(step1.soNguoi || 3);
  const [diaChi, setDiaChi] = useState(step1.diaChi || step2.diaChi || '');

  // Local state Step 2
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(step3.tienIchIds || ['TI0001', 'TI0002']);
  const [moTa, setMoTa] = useState(step4.moTa || '');

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Xử lý nút Quay lại thông minh
  const handleBack = () => {
    if (currentStep === 3) {
      setStep(2);
    } else if (currentStep === 2) {
      setStep(1);
    } else {
      // Step 1: Hỏi xác nhận thoát
      Alert.alert(
        'Thoát tạo phòng?',
        'Bạn có chắc chắn muốn thoát tạo phòng trọ? Thông tin đã nhập sẽ không được lưu.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Thoát',
            style: 'destructive',
            onPress: () => {
              resetWizard();
              router.back();
            },
          },
        ]
      );
    }
  };

  // Chuyển step khi bấm trực tiếp vào Stepper
  const handleSelectStep = (targetStep: number) => {
    if (targetStep === currentStep) return;

    if (targetStep < currentStep) {
      // Cho phép quay lại step trước tự do
      setStep(targetStep);
      return;
    }

    // Nếu muốn nhảy tới step cao hơn, cần validate step hiện tại
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
    if (!cocPhong || Number(cocPhong) < 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền đặt cọc.');
      return false;
    }
    if (!dienTich || Number(dienTich) <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập diện tích phòng.');
      return false;
    }
    if (!diaChi.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ phòng trọ.');
      return false;
    }
    return true;
  };

  const saveStep1 = () => {
    updateStep1({
      tenPhong,
      maLPT: selectedRoomType.id,
      giaThue: Number(giaThue) || 3500000,
      cocPhong: Number(cocPhong) || 3500000,
      dienTich: Number(dienTich) || 24,
      soNguoi,
      diaChi,
    });
    updateStep2({
      diaChi,
      kinhDo: '10.8231',
      viDo: '106.6297',
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

  // Toggle tiện ích ở Step 2
  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  // Chọn ảnh ở Step 3
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

  // Đăng bài hoàn tất
  const handlePublish = async () => {
    if (images.length === 0) {
      Alert.alert('Thiếu hình ảnh', 'Vui lòng chọn tối thiểu 1 hình ảnh chụp phòng thực tế.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tenPhong,
        maLpt: selectedRoomType.id,
        giaThue: Number(giaThue) || 3500000,
        coc: Number(cocPhong) || 3500000,
        dienTich: Number(dienTich) || 24,
        soNguoi,
        diaChi,
        kinhDo: '10.8231',
        viDo: '106.6297',
        dsTienIch: selectedAmenities,
        moTa: moTa.trim() || 'Phòng trọ đầy đủ tiện nghi, an ninh tốt, giờ giấc tự do.',
        hinhAnhUrls: images.map((img) => img.uri),
      };

      await landlordService.createRoom(payload);
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
    <SafeAreaView style={{ flex: 1 }} className="bg-white" edges={['top', 'bottom']}>
      {/* 1. Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <Pressable onPress={handleBack} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Đăng phòng mới</Text>
        <View className="w-6" />
      </View>

      {/* 2. Stepper Indicator 3 bước có thể bấm chuyển */}
      <WizardStepIndicator currentStep={currentStep} onSelectStep={handleSelectStep} />

      {/* 3. Nội dung form theo Step */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= STEP 1: CƠ BẢN (BAO GỒM ĐỊA CHỈ) ================= */}
        {currentStep === 1 && (
          <View>
            {/* Tên phòng */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tên phòng *</Text>
              <TextInput
                placeholder="Ví dụ: Phòng gác lửng studio tiện nghi"
                placeholderTextColor="#9ca3af"
                value={tenPhong}
                onChangeText={setTenPhong}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50"
              />
            </View>

            {/* Loại phòng Dropdown */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Loại phòng *</Text>
              <Pressable
                onPress={() => setShowTypeModal(true)}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between bg-gray-50/50 active:bg-gray-100"
              >
                <Text className="text-sm text-gray-900">{selectedRoomType.name}</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </Pressable>
            </View>

            {/* Giá thuê */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá thuê (VNĐ/tháng) *</Text>
              <View className="relative">
                <TextInput
                  keyboardType="numeric"
                  value={giaThue}
                  onChangeText={(val) => {
                    setGiaThue(val);
                    // Tự động gợi ý cọc = 1 tháng thuê nếu chưa sửa cọc
                    if (!cocPhong || cocPhong === giaThue) {
                      setCocPhong(val);
                    }
                  }}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 pr-24"
                />
                <Text className="absolute right-3.5 top-3 text-xs text-gray-400 font-medium">
                  triệu/tháng
                </Text>
              </View>
            </View>

            {/* Tiền đặt cọc */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tiền đặt cọc *</Text>
              <TextInput
                keyboardType="numeric"
                value={cocPhong}
                onChangeText={setCocPhong}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50"
              />
            </View>

            {/* Grid 2 cột: Diện tích & Số người tối đa */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">Diện tích *</Text>
                <View className="relative">
                  <TextInput
                    keyboardType="numeric"
                    value={dienTich}
                    onChangeText={setDienTich}
                    className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 pr-8"
                  />
                  <Text className="absolute right-3 top-3 text-xs text-gray-400">m²</Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">Số người tối đa *</Text>
                <View className="border border-gray-200 rounded-xl px-2 py-1.5 flex-row items-center justify-between bg-gray-50/50">
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

            {/* Địa chỉ phòng trọ (Tích hợp vào Step 1) */}
            <View className="mb-6">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Địa chỉ cụ thể *</Text>
              <TextInput
                placeholder="Ví dụ: 123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM"
                placeholderTextColor="#9ca3af"
                value={diaChi}
                onChangeText={setDiaChi}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50"
              />
            </View>
          </View>
        )}

        {/* ================= STEP 2: TIỆN ÍCH & MÔ TẢ CHI TIẾT ================= */}
        {currentStep === 2 && (
          <View>
            {/* Header Tiện ích */}
            <Text className="text-base font-bold text-gray-900 mb-3">Tiện ích</Text>

            {/* Grid Tiện ích 3 cột (Theo Ảnh 2) */}
            <View className="flex-row flex-wrap gap-2.5 mb-6">
              {AMENITY_OPTIONS.map((item) => {
                const isSelected = selectedAmenities.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleAmenity(item.id)}
                    className={`w-[31%] py-3.5 px-2 rounded-2xl border items-center justify-center active:opacity-80 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60'
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

            {/* Header Mô tả chi tiết (Theo Ảnh 2) */}
            <Text className="text-base font-bold text-gray-900 mb-2">Mô tả chi tiết</Text>
            <View className="mb-6">
              <TextInput
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholder="Căn hộ studio đầy đủ ánh sáng tự nhiên, nằm tại vị trí đắc địa trung tâm Quận 3. Nội thất đầy đủ: giường, nệm, tủ quần áo, máy lạnh..."
                placeholderTextColor="#9ca3af"
                value={moTa}
                onChangeText={setMoTa}
                className="border border-gray-200 rounded-2xl p-3.5 text-sm text-gray-900 bg-gray-50/50 min-h-[140px] leading-5"
              />
            </View>
          </View>
        )}

        {/* ================= STEP 3: HÌNH ẢNH PHÒNG ================= */}
        {currentStep === 3 && (
          <View>
            <Text className="text-base font-bold text-gray-900 mb-1">Hình ảnh phòng</Text>
            <Text className="text-xs text-gray-400 mb-4">
              (Tối đa 10 ảnh, mỗi ảnh &lt; 5MB)
            </Text>

            {/* Khung viền nét đứt chọn ảnh (Theo Ảnh 1 phải) */}
            <Pressable
              onPress={handlePickImages}
              className="border-2 border-dashed border-teal-500 bg-teal-50/40 rounded-2xl p-7 items-center justify-center active:bg-teal-100/50 mb-6"
            >
              <Ionicons name="camera-outline" size={28} color="#0f766e" />
              <Text className="text-sm font-bold text-teal-800 mt-2">Chọn ảnh tải lên</Text>
            </Pressable>

            {/* Danh sách ảnh đã tải lên */}
            {images.length > 0 && (
              <View className="mb-6">
                <Text className="text-xs font-semibold text-gray-700 mb-3">
                  Ảnh đã tải lên ({images.length})
                </Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {images.map((img, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setCoverImage(idx)}
                      className="relative w-[31%] aspect-square rounded-2xl overflow-hidden border border-gray-200 active:opacity-90"
                    >
                      <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />

                      {/* Badge Ảnh chính */}
                      {img.isCover && (
                        <View className="absolute top-1.5 left-1.5 bg-teal-700 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-white">Ảnh chính</Text>
                        </View>
                      )}

                      {/* Nút Xóa ảnh (X) */}
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
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 4. Footer 2 Nút (Quay lại / Tiếp tục hoặc Hoàn tất) */}
      <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
        {/* Nút Quay lại luôn ở bên trái */}
        <View className="flex-1">
          <Button
            variant="outline"
            onPress={handleBack}
            className="w-full border-gray-200 py-2.5 rounded-xl"
          >
            <Button.Label className="text-gray-700 font-semibold text-sm">Quay lại</Button.Label>
          </Button>
        </View>

        {/* Nút Tiếp tục / Hoàn tất ở bên phải */}
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
                {submitting ? 'Đang gửi...' : 'Đăng bài'}
              </Button.Label>
            </Button>
          )}
        </View>
      </View>

      {/* Modal Chọn loại phòng */}
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
    </SafeAreaView>
  );
}
