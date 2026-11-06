import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, G, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, FieldError, Input, Label, TextField } from 'heroui-native';
import { authUserService } from '../../services/authUser.service';
import { useAuthStore } from '../../store/useAuthStore';
import { tokenStorage } from '../../api/axiosClient';

export type AuthMode = 'login' | 'register';

interface AuthMapPortalProps {
  initialMode?: AuthMode;
}

// Chiều cao mặc định khi thu gọn về kích thước Box Login / Bản đồ
const DEFAULT_LOGIN_HEIGHT = 330;
const DEFAULT_REGISTER_HEIGHT = 720;

// Tọa độ chuẩn trên khung bản đồ (300 x 290)
const MAP_WIDTH = 300;
const MAP_HEIGHT = 290;
const LOGIN_POS = { x: 64, y: 205 };
const REGISTER_POS = { x: 236, y: 86 };

/**
 * Logo Pin Vector chuẩn 100% theo ảnh mẫu InnFinder (Hoàn toàn trong suốt, không có nền vuông):
 * Giọt nước định vị màu xanh cổ vịt (#118A7E) + Ngôi nhà trắng có ống khói và cửa vòm ở giữa.
 */
const InnFinderPinIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Thân giọt nước định vị (Map Pin) */}
    <Path
      d="M50 6C29.5 6 13 22.5 13 43C13 66.8 44.2 91.2 48.1 94.2C49.2 95.1 50.8 95.1 51.9 94.2C55.8 91.2 87 66.8 87 43C87 22.5 70.5 6 50 6Z"
      fill="#118A7E"
    />
    {/* Mái nhà chữ V + Ống khói bên phải */}
    <Path
      d="M50 22L23 44.5L28.2 49.8L50 31.6L71.8 49.8L77 44.5L68 37V25.5H60.5V30.8L50 22Z"
      fill="#FFFFFF"
    />
    {/* Thân ngôi nhà + Cửa vòm ở giữa */}
    <Path
      d="M32.5 48.5V67.5H44V55.5C44 52.2 46.7 49.5 50 49.5C53.3 49.5 56 52.2 56 55.5V67.5H67.5V48.5L50 34L32.5 48.5Z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const AuthMapPortal: React.FC<AuthMapPortalProps> = ({
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetLabel, setTargetLabel] = useState<AuthMode>(initialMode);
  const isAnimatingRef = useRef(false);

  // Lưu chiều cao thực tế của Form Login & Form Register để bình thường luôn hiển thị đủ 100%, chỉ khi bấm chuyển mới thu Box lại
  const loginHeightRef = useRef(DEFAULT_LOGIN_HEIGHT);
  const registerHeightRef = useRef(DEFAULT_REGISTER_HEIGHT);

  // ================= STATE ĐĂNG NHẬP =================
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ================= STATE ĐĂNG KÝ =================
  const [regUser, setRegUser] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  // ================= SHARED VALUES CHO REANIMATED =================
  // 1: Hiển thị chữ "InnFinder" | 0: Thu gọn chữ vào trong dấu định vị (Pin)
  const wordmarkExpand = useSharedValue(1);
  // Độ nảy của icon Pin trên Header khi hút chữ vào
  const headerPinScale = useSharedValue(1);
  // Chiều cao động của Box chỉ kích hoạt trong lúc chuyển cảnh
  const boxHeight = useSharedValue(
    initialMode === 'login' ? DEFAULT_LOGIN_HEIGHT : DEFAULT_REGISTER_HEIGHT
  );
  // 0: Hiển thị Form | 1: Hiển thị Bản đồ
  const mapVisibility = useSharedValue(0);
  // Vị trí của Pin trên bản đồ: 0 = Trạm LOGIN, 1 = Trạm REGISTER
  const pinMapProgress = useSharedValue(initialMode === 'login' ? 0 : 1);
  // Độ cao cú nhảy Parabol: 0 = chạm đất, 1 = đỉnh cú nhảy
  const pinJumpArc = useSharedValue(0);
  // Góc nghiêng của Pin khi nhảy (-1 -> 1)
  const pinTilt = useSharedValue(0);
  // Sóng lan tỏa (Ripple) khi Pin đáp xuống trạm đích
  const landingRipple = useSharedValue(0);

  // Đo chiều cao tự nhiên của mỗi form khi đang hiển thị bình thường
  const handleFormLayout = (e: LayoutChangeEvent) => {
    if (isAnimatingRef.current || isTransitioning) return;
    const measured = e.nativeEvent.layout.height;
    if (measured <= 0) return;

    if (mode === 'login') {
      loginHeightRef.current = Math.max(measured, DEFAULT_LOGIN_HEIGHT);
      boxHeight.value = loginHeightRef.current;
    } else {
      registerHeightRef.current = Math.max(measured, DEFAULT_REGISTER_HEIGHT);
      boxHeight.value = registerHeightRef.current;
    }
  };

  // ================= HÀM KÍCH HOẠT CHUYỂN CẢNH BẢN ĐỒ =================
  const triggerSwitchMode = (nextMode: AuthMode) => {
    if (isAnimatingRef.current || nextMode === mode) return;
    isAnimatingRef.current = true;

    // Khóa chiều cao xuất phát đúng bằng chiều cao thực tế hiện tại trước khi thu gọn
    const startHeight =
      mode === 'login' ? loginHeightRef.current : registerHeightRef.current;
    const compactMapHeight = loginHeightRef.current;
    boxHeight.value = startHeight;

    setTargetLabel(nextMode);
    setIsTransitioning(true);
    setLoginError('');
    setRegError('');

    const toValue = nextMode === 'register' ? 1 : 0;
    const tiltDirection = nextMode === 'register' ? 1 : -1;

    // Nếu đang từ Register -> Login: Phải thu nhỏ Box Register về bằng kích thước Login trước rồi Pin mới nhảy
    const shrinkDelay = mode === 'register' ? 160 : 0;

    // BƯỚC 1: Chữ "InnFinder" thu gọn vào trong dấu định vị (Pin)
    wordmarkExpand.value = withTiming(0, {
      duration: 240,
      easing: Easing.inOut(Easing.cubic),
    });

    headerPinScale.value = withSequence(
      withDelay(100, withTiming(1.22, { duration: 130, easing: Easing.out(Easing.quad) })),
      withTiming(0.85, { duration: 150, easing: Easing.inOut(Easing.quad) })
    );

    // Nếu đang ở Register, thu nhỏ Box về kích thước Login (compactMapHeight) trước khi Pin nhảy
    if (mode === 'register') {
      boxHeight.value = withTiming(compactMapHeight, {
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
      });
    }

    // BƯỚC 2: Box chuyển sang Bản đồ 2 vị trí (Login & Register)
    mapVisibility.value = withDelay(
      140 + shrinkDelay,
      withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      })
    );

    // BƯỚC 3: Sau khi Box đã gọn bằng Login, Logo Pin mới bắt đầu nhảy vòng cung giữa Login <-> Register
    const jumpStartDelay = 380 + shrinkDelay;

    pinMapProgress.value = withDelay(
      jumpStartDelay,
      withTiming(toValue, {
        duration: 540,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Độ cao nhảy lên rồi đáp xuống
    pinJumpArc.value = withDelay(
      jumpStartDelay,
      withSequence(
        withTiming(1, { duration: 270, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 270, easing: Easing.in(Easing.bounce) })
      )
    );

    // Nghiêng mình theo hướng nhảy
    pinTilt.value = withDelay(
      jumpStartDelay,
      withSequence(
        withTiming(tiltDirection * 15, { duration: 180 }),
        withTiming(-tiltDirection * 6, { duration: 200 }),
        withTiming(0, { duration: 160 })
      )
    );

    // Hiệu ứng sóng lan tỏa (Ripple) ngay khi Pin đáp xuống đích
    landingRipple.value = 0;
    landingRipple.value = withDelay(
      jumpStartDelay + 460,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) })
    );

    // Đổi state form ở hậu cảnh ngay khi Pin đáp xuống đích
    setTimeout(() => {
      setMode(nextMode);
    }, jumpStartDelay + 500);

    // BƯỚC 4: Khi Pin đã nhảy xong tới đích -> Nếu đích là Register thì mở rộng Box ra đủ chiều cao, ẩn bản đồ & bung chữ "InnFinder"
    const unfoldDelay = jumpStartDelay + 680;

    if (nextMode === 'register') {
      boxHeight.value = withDelay(
        unfoldDelay,
        withTiming(registerHeightRef.current, {
          duration: 360,
          easing: Easing.out(Easing.cubic),
        })
      );
    }

    mapVisibility.value = withDelay(
      unfoldDelay,
      withTiming(0, {
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    headerPinScale.value = withDelay(
      unfoldDelay + 40,
      withSequence(
        withTiming(1.15, { duration: 120 }),
        withTiming(1, { duration: 120 })
      )
    );

    wordmarkExpand.value = withDelay(
      unfoldDelay + 80,
      withTiming(
        1,
        {
          duration: 280,
          easing: Easing.out(Easing.back(1.2)),
        },
        (finished) => {
          if (finished) {
            runOnJS(finishTransition)();
          }
        }
      )
    );
  };

  const finishTransition = () => {
    setIsTransitioning(false);
    isAnimatingRef.current = false;
  };

  // ================= ANIMATED STYLES =================
  // Style thu gọn chữ "InnFinder" vào trong dấu định vị
  const wordmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(wordmarkExpand.value, [0, 0.25, 1], [0, 0, 1]),
      width: interpolate(wordmarkExpand.value, [0, 1], [0, 150]),
      transform: [
        { translateX: interpolate(wordmarkExpand.value, [0, 1], [-32, 0]) },
        { scale: interpolate(wordmarkExpand.value, [0, 1], [0.25, 1]) },
      ],
    };
  });

  // Style cho dấu định vị (Pin) ở Header
  const headerPinAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(mapVisibility.value, [0, 0.5, 1], [1, 0.2, 0]),
      transform: [
        { scale: headerPinScale.value },
        { translateY: interpolate(mapVisibility.value, [0, 1], [0, 24]) },
      ],
    };
  });

  // Chỉ áp chiều cao động khi đang trong quá trình chuyển cảnh; bình thường để auto 100% không bao giờ đè/cắt chữ
  const cardContainerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: boxHeight.value,
    };
  });

  // Style ẩn/hiện Form
  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(mapVisibility.value, [0, 0.6], [1, 0]),
      transform: [
        { scale: interpolate(mapVisibility.value, [0, 1], [1, 0.95]) },
      ],
    };
  });

  // Style ẩn/hiện lớp Bản đồ
  const mapLayerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: mapVisibility.value,
      transform: [
        { scale: interpolate(mapVisibility.value, [0, 1], [0.94, 1]) },
      ],
    };
  });

  // Style cho Logo Pin nhảy giữa vị trí Login <-> Register trên bản đồ
  const jumpingPinAnimatedStyle = useAnimatedStyle(() => {
    const currentX = interpolate(
      pinMapProgress.value,
      [0, 1],
      [LOGIN_POS.x, REGISTER_POS.x]
    );
    const currentY = interpolate(
      pinMapProgress.value,
      [0, 1],
      [LOGIN_POS.y, REGISTER_POS.y]
    );
    const arcLift = interpolate(pinJumpArc.value, [0, 1], [0, -72]);
    const scaleBounce = interpolate(pinJumpArc.value, [0, 0.5, 1], [1, 1.16, 1.24]);

    return {
      transform: [
        { translateX: currentX - 24 },
        { translateY: currentY - 46 + arcLift },
        { scale: scaleBounce },
        { rotateZ: `${pinTilt.value}deg` },
      ],
    };
  });

  // Style cho bóng đổ dưới mặt đất bản đồ khi Pin nhảy
  const pinShadowAnimatedStyle = useAnimatedStyle(() => {
    const currentX = interpolate(
      pinMapProgress.value,
      [0, 1],
      [LOGIN_POS.x, REGISTER_POS.x]
    );
    const currentY = interpolate(
      pinMapProgress.value,
      [0, 1],
      [LOGIN_POS.y, REGISTER_POS.y]
    );
    const shadowScale = interpolate(pinJumpArc.value, [0, 1], [1, 0.38]);
    const shadowOpacity = interpolate(pinJumpArc.value, [0, 1], [0.32, 0.1]);

    return {
      opacity: shadowOpacity,
      transform: [
        { translateX: currentX - 13 },
        { translateY: currentY - 5 },
        { scaleX: shadowScale },
        { scaleY: shadowScale * 0.55 },
      ],
    };
  });

  // Style sóng tỏa (Ripple) tại trạm đích khi Pin chạm đất
  const landingRippleAnimatedStyle = useAnimatedStyle(() => {
    const dest = targetLabel === 'register' ? REGISTER_POS : LOGIN_POS;
    return {
      opacity: interpolate(landingRipple.value, [0, 0.2, 1], [0, 0.8, 0]),
      transform: [
        { translateX: dest.x - 24 },
        { translateY: dest.y - 24 },
        { scale: interpolate(landingRipple.value, [0, 1], [0.4, 2.3]) },
      ],
    };
  });

  // ================= XỬ LÝ NGHIỆP VỤ ĐĂNG NHẬP =================
  const handleLogin = async () => {
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const authRes = await authUserService.login({
        tenDangNhap: loginUser.trim(),
        matKhau: loginPass,
      });
      await tokenStorage.saveToken(authRes.token);
      const profile = await authUserService.getMyProfile();
      await setAuth(authRes.token, profile);

      if (profile.vaiTro === 'QUAN_TRI' || authRes.vaiTro === 'QUAN_TRI') {
        router.replace('/(admin)');
      } else if (profile.chuTro) {
        router.replace('/(landlord)');
      } else {
        router.replace('/(tenant)');
      }
    } catch (err: any) {
      await tokenStorage.removeToken();
      Alert.alert('Đăng nhập thất bại', err.message || 'Sai thông tin đăng nhập');
    } finally {
      setLoginLoading(false);
    }
  };

  // ================= XỬ LÝ NGHIỆP VỤ ĐĂNG KÝ =================
  const validateRegister = () => {
    if (!regUser.trim() || regUser.trim().length < 3) {
      return 'Tên đăng nhập phải từ 3 ký tự trở lên';
    }
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(regEmail.trim())) {
      return 'Email không đúng định dạng';
    }
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(regPhone.trim())) {
      return 'Số điện thoại không hợp lệ (10 số, đầu 03, 05, 07, 08, 09)';
    }
    if (regPass.length < 8) {
      return 'Mật khẩu phải có tối thiểu 8 ký tự';
    }
    if (regPass !== regConfirmPass) {
      return 'Xác nhận mật khẩu không trùng khớp';
    }
    return null;
  };

  const handleRegister = async () => {
    const error = validateRegister();
    if (error) {
      setRegError(error);
      return;
    }

    try {
      setRegLoading(true);
      setRegError('');

      await authUserService.register({
        tenDangNhap: regUser.trim(),
        hoVaTen: regFullName.trim() || undefined,
        email: regEmail.trim(),
        sdt: regPhone.trim(),
        matKhau: regPass,
        xacNhanMatKhau: regConfirmPass,
        chuTro: false,
      });

      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã sẵn sàng! Hệ thống sẽ đưa bạn về trạm Đăng nhập.',
        [
          {
            text: 'Về Đăng nhập',
            onPress: () => {
              setLoginUser(regUser.trim());
              triggerSwitchMode('login');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.message || 'Không thể tạo tài khoản');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe pb-safe bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= HEADER LOGO ĐỘNG (PIN VECTOR + CHỮ INNFINDER) ================= */}
          <View className="items-center mb-5">
            <View className="flex-row items-center justify-center h-14">
              {/* Dấu định vị (Logo Pin Vector chuẩn không nền vuông) */}
              <Animated.View style={headerPinAnimatedStyle} className="z-10">
                <InnFinderPinIcon size={46} />
              </Animated.View>

              {/* Chữ "InnFinder" đồng màu xanh thương hiệu, thu gọn vào trong Pin */}
              <Animated.View
                style={wordmarkAnimatedStyle}
                className="overflow-hidden justify-center pl-1"
              >
                <Text
                  numberOfLines={1}
                  style={{ color: '#118A7E' }}
                  className="text-3xl font-extrabold tracking-tight"
                >
                  InnFinder
                </Text>
              </Animated.View>
            </View>

            <Text className="text-xs font-medium text-slate-500 mt-1 text-center">
              {isTransitioning
                ? targetLabel === 'register'
                  ? 'Đang di chuyển tới Trạm Đăng Ký...'
                  : 'Đang thu gọn & quay về Trạm Đăng Nhập...'
                : mode === 'login'
                ? 'Tìm phòng trọ minh bạch & an toàn'
                : 'Khởi tạo hành trình tìm phòng mới'}
            </Text>
          </View>

          {/* ================= KHUNG BOX CHÍNH ================= */}
          {/* Bình thường hiển thị đầy đủ 100% chiều cao tự nhiên, chỉ khi bấm chuyển mới áp chiều cao thu gọn */}
          <Card className="p-0 overflow-hidden relative">
            <Animated.View
              style={isTransitioning ? cardContainerAnimatedStyle : undefined}
              className="w-full overflow-hidden"
            >
              {/* LỚP 1: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
              <Animated.View
                style={formAnimatedStyle}
                pointerEvents={isTransitioning ? 'none' : 'auto'}
                onLayout={handleFormLayout}
                className="p-5"
              >
                {mode === 'login' ? (
                  /* ---------- FORM ĐĂNG NHẬP ---------- */
                  <Card.Body className="gap-4">
                    <TextField isRequired isInvalid={!!loginError && !loginUser}>
                      <Label>Tên đăng nhập</Label>
                      <Input
                        placeholder="Nhập tên đăng nhập"
                        autoCapitalize="none"
                        value={loginUser}
                        onChangeText={setLoginUser}
                      />
                    </TextField>

                    <TextField isRequired isInvalid={!!loginError && !loginPass}>
                      <View className="flex-row items-center justify-between">
                        <Label>Mật khẩu</Label>
                        <Pressable
                          onPress={() => router.push('/(auth)/forgot-password')}
                          className="active:opacity-70"
                        >
                          <Text className="text-xs font-semibold text-teal-600">
                            Quên mật khẩu?
                          </Text>
                        </Pressable>
                      </View>
                      <Input
                        placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                        secureTextEntry
                        value={loginPass}
                        onChangeText={setLoginPass}
                      />
                      {loginError ? <FieldError>{loginError}</FieldError> : null}
                    </TextField>

                    <Button
                      variant="primary"
                      size="lg"
                      isDisabled={loginLoading}
                      onPress={handleLogin}
                      className="mt-2 bg-teal-600 active:bg-teal-700"
                    >
                      <Button.Label className="text-white font-bold">
                        {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                      </Button.Label>
                    </Button>

                    <Pressable
                      onPress={() => triggerSwitchMode('register')}
                      className="flex-row items-center justify-center gap-1.5 py-2.5 mt-1 rounded-xl bg-slate-50 border border-slate-200 active:bg-teal-50"
                    >
                      <Ionicons name="location-outline" size={17} color="#118A7E" />
                      <Text className="text-sm font-bold text-teal-700">
                        Chưa có tài khoản? Đăng ký ngay
                      </Text>
                    </Pressable>
                  </Card.Body>
                ) : (
                  /* ---------- FORM ĐĂNG KÝ (HIỂN THỊ ĐỦ 100%, KHÔNG ĐÈ CHỮ) ---------- */
                  <Card.Body className="gap-3.5">
                    <TextField isRequired>
                      <Label>Tên đăng nhập</Label>
                      <Input
                        placeholder="Ví dụ: nguyenvanan"
                        autoCapitalize="none"
                        value={regUser}
                        onChangeText={setRegUser}
                      />
                    </TextField>

                    <TextField isRequired>
                      <Label>Họ và tên</Label>
                      <Input
                        placeholder="Ví dụ: Nguyễn Văn An"
                        value={regFullName}
                        onChangeText={setRegFullName}
                      />
                    </TextField>

                    <TextField isRequired>
                      <Label>Email</Label>
                      <Input
                        placeholder="name@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={regEmail}
                        onChangeText={setRegEmail}
                      />
                    </TextField>

                    <TextField isRequired>
                      <Label>Số điện thoại</Label>
                      <Input
                        placeholder="0901234567"
                        keyboardType="phone-pad"
                        value={regPhone}
                        onChangeText={setRegPhone}
                      />
                    </TextField>

                    <TextField isRequired>
                      <Label>Mật khẩu</Label>
                      <Input
                        placeholder="Tối thiểu 8 ký tự"
                        secureTextEntry
                        value={regPass}
                        onChangeText={setRegPass}
                      />
                    </TextField>

                    <TextField isRequired>
                      <Label>Xác nhận mật khẩu</Label>
                      <Input
                        placeholder="Nhập lại mật khẩu vừa nhập"
                        secureTextEntry
                        value={regConfirmPass}
                        onChangeText={setRegConfirmPass}
                      />
                    </TextField>

                    {regError ? (
                      <View className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                        <Text className="text-xs font-medium text-rose-600">
                          {regError}
                        </Text>
                      </View>
                    ) : null}

                    <Button
                      variant="primary"
                      size="lg"
                      isDisabled={regLoading}
                      onPress={handleRegister}
                      className="mt-2 bg-teal-600 active:bg-teal-700"
                    >
                      <Button.Label className="text-white font-bold">
                        {regLoading ? 'Đang khởi tạo...' : 'Tạo tài khoản'}
                      </Button.Label>
                    </Button>

                    <Pressable
                      onPress={() => triggerSwitchMode('login')}
                      className="flex-row items-center justify-center gap-1.5 py-2.5 mt-1 rounded-xl bg-slate-50 border border-slate-200 active:bg-teal-50"
                    >
                      <Ionicons name="location-outline" size={17} color="#118A7E" />
                      <Text className="text-sm font-bold text-teal-700">
                        Đã có tài khoản? Đăng nhập ngay
                      </Text>
                    </Pressable>
                  </Card.Body>
                )}
              </Animated.View>

              {/* LỚP 2: BẢN ĐỒ HÀNH TRÌNH 2 VỊ TRÍ (LOGIN <-> REGISTER) */}
              {isTransitioning && (
                <Animated.View
                  style={[
                    mapLayerAnimatedStyle,
                    {
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      right: 10,
                      bottom: 10,
                    },
                  ]}
                  className="rounded-2xl bg-teal-50/90 border border-teal-200 items-center justify-center overflow-hidden"
                >
                  <View style={{ width: MAP_WIDTH, height: MAP_HEIGHT }} className="relative">
                    <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                      <Defs>
                        <LinearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor="#F0FDFA" />
                          <Stop offset="1" stopColor="#E0F2FE" />
                        </LinearGradient>
                      </Defs>

                      {/* Nền bản đồ */}
                      <Rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="16" fill="url(#mapBg)" />

                      {/* Các ô phố & công viên trên bản đồ */}
                      <Rect x="14" y="18" width="84" height="54" rx="8" fill="#DCFCE7" opacity="0.7" />
                      <Rect x="115" y="16" width="70" height="48" rx="6" fill="#E2E8F0" opacity="0.6" />
                      <Rect x="200" y="145" width="84" height="75" rx="8" fill="#DCFCE7" opacity="0.65" />
                      <Rect x="20" y="96" width="68" height="52" rx="6" fill="#E2E8F0" opacity="0.55" />
                      <Rect x="108" y="170" width="76" height="72" rx="8" fill="#E2E8F0" opacity="0.55" />

                      {/* Dòng sông cách điệu */}
                      <Path
                        d="M -10 140 Q 85 110, 155 152 T 315 118"
                        stroke="#BAE6FD"
                        strokeWidth="16"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Lưới đường phố chính */}
                      <Line x1="0" y1="86" x2={MAP_WIDTH} y2="86" stroke="#FFFFFF" strokeWidth="6" />
                      <Line x1="0" y1="205" x2={MAP_WIDTH} y2="205" stroke="#FFFFFF" strokeWidth="6" />
                      <Line x1="64" y1="0" x2="64" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="6" />
                      <Line x1="236" y1="0" x2="236" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="6" />

                      {/* Tuyến đường nối giữa Trạm LOGIN và Trạm REGISTER */}
                      <Path
                        d={`M ${LOGIN_POS.x} ${LOGIN_POS.y} Q 138 205, 150 145 T ${REGISTER_POS.x} ${REGISTER_POS.y}`}
                        stroke="#118A7E"
                        strokeWidth="3.5"
                        strokeDasharray="7, 6"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Tâm điểm Trạm LOGIN (Trái - Dưới) */}
                      <G>
                        <Circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="15" fill="#CCFBF1" opacity="0.9" />
                        <Circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="7.5" fill="#118A7E" />
                        <Circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="3" fill="#FFFFFF" />
                      </G>

                      {/* Tâm điểm Trạm REGISTER (Phải - Trên) */}
                      <G>
                        <Circle cx={REGISTER_POS.x} cy={REGISTER_POS.y} r="15" fill="#CCFBF1" opacity="0.9" />
                        <Circle cx={REGISTER_POS.x} cy={REGISTER_POS.y} r="7.5" fill="#118A7E" />
                        <Circle cx={REGISTER_POS.x} cy={REGISTER_POS.y} r="3" fill="#FFFFFF" />
                      </G>
                    </Svg>

                    {/* Nhãn vị trí LOGIN trên bản đồ */}
                    <View
                      style={{ left: LOGIN_POS.x - 32, top: LOGIN_POS.y + 16 }}
                      className="absolute px-2.5 py-0.5 rounded-full bg-slate-800 shadow-sm"
                    >
                      <Text className="text-[10px] font-extrabold text-white tracking-wider">
                        LOGIN
                      </Text>
                    </View>

                    {/* Nhãn vị trí REGISTER trên bản đồ */}
                    <View
                      style={{ left: REGISTER_POS.x - 40, top: REGISTER_POS.y + 16 }}
                      className="absolute px-2.5 py-0.5 rounded-full bg-teal-700 shadow-sm"
                    >
                      <Text className="text-[10px] font-extrabold text-white tracking-wider">
                        REGISTER
                      </Text>
                    </View>

                    {/* Hiệu ứng Sóng tỏa (Ripple) khi Pin đáp xuống */}
                    <Animated.View
                      style={[
                        landingRippleAnimatedStyle,
                        {
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          borderWidth: 2.5,
                          borderColor: '#118A7E',
                          backgroundColor: 'rgba(17, 138, 126, 0.16)',
                        },
                      ]}
                    />

                    {/* Bóng đổ của Pin dưới mặt bản đồ */}
                    <Animated.View
                      style={[
                        pinShadowAnimatedStyle,
                        {
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 26,
                          height: 10,
                          borderRadius: 13,
                          backgroundColor: '#0F172A',
                        },
                      ]}
                    />

                    {/* DẤU ĐỊNH VỊ (LOGO PIN VECTOR KHÔNG Ô VUÔNG) NHẢY TỪ LOGIN <-> REGISTER */}
                    <Animated.View
                      style={[
                        jumpingPinAnimatedStyle,
                        {
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 48,
                          height: 48,
                        },
                      ]}
                    >
                      <InnFinderPinIcon size={48} />
                    </Animated.View>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
