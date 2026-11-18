/**
 * ==============================================================================
 * [TẠM THỜI, XÓA KHI TÍCH HỢP LOGIN CỦA THÀNH VIÊN 1]
 * DEV AUTO-LOGIN HELPER CHO INNFINDER WEB
 * ==============================================================================
 * Mục đích:
 * - Tự động đăng nhập vào Backend với tài khoản Khách thuê (KHACH_HANG) trong môi trường DEV.
 * - Lấy JWT Token thật do Backend ký để thực hiện các nghiệp vụ đặt lịch, cọc, giao dịch, review.
 * - Không hardcode token, ưu tiên tự đăng nhập hoặc đọc từ .env.local (đã gitignore).
 * ==============================================================================
 */

import axios from "axios";

let cachedToken: string | null = null;
let loginPromise: Promise<string | null> | null = null;

const STORAGE_KEY = "innfinder_jwt_token";

/**
 * Lấy token xác thực cho môi trường DEV:
 * 1. Nếu có VITE_DEV_TOKEN trong .env.local -> Dùng trực tiếp.
 * 2. Nếu đã có token trong cache RAM / localStorage -> Tái sử dụng.
 * 3. Nếu chưa có -> Tự động gọi POST /api/auth/login bằng tài khoản test.
 */
export async function getDevAuthToken(baseUrl: string): Promise<string | null> {
  // Chỉ kích hoạt khi đang chạy môi trường Vite Development
  if (!import.meta.env.DEV) {
    return localStorage.getItem(STORAGE_KEY);
  }

  // 1. Ưu tiên token chỉ định trực tiếp từ .env.local (nếu có)
  const explicitToken = import.meta.env.VITE_DEV_TOKEN;
  if (explicitToken && typeof explicitToken === "string" && explicitToken.trim() !== "") {
    return explicitToken.trim();
  }

  // 2. Kiểm tra token đã lưu trong memory
  if (cachedToken) {
    return cachedToken;
  }

  // 3. Kiểm tra token trong localStorage
  const localToken = localStorage.getItem(STORAGE_KEY);
  if (localToken) {
    cachedToken = localToken;
    return localToken;
  }

  // 4. Cơ chế Dev Auto-Login: Tự động gọi API đăng nhập thật
  if (loginPromise) {
    return loginPromise;
  }

  loginPromise = (async () => {
    const username = import.meta.env.VITE_DEV_USERNAME || "khachhang_an";
    const password = import.meta.env.VITE_DEV_PASSWORD || "12345678";

    try {
      console.log(`[DevAuth] 🔑 Đang tự động đăng nhập tài khoản test '${username}'...`);
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        tenDangNhap: username,
        matKhau: password,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      });

      const resData = response.data;
      const token = resData?.data?.token || resData?.token;

      if (token) {
        cachedToken = token;
        localStorage.setItem(STORAGE_KEY, token);
        console.log(`[DevAuth] ✅ Đăng nhập thành công! Token đã sẵn sàng cho các request.`);
        return token;
      } else {
        console.warn("[DevAuth] ⚠️ Đăng nhập trả về kết quả nhưng không tìm thấy trường token:", resData);
        return null;
      }
    } catch (err: any) {
      console.warn(
        `[DevAuth] ❌ Không thể tự động đăng nhập tài khoản test (${username}):`,
        err.response?.data?.message || err.message
      );
      return null;
    } finally {
      loginPromise = null;
    }
  })();

  return loginPromise;
}

/**
 * Xóa cache token (khi cần đăng xuất hoặc làm mới phiên dev)
 */
export function clearDevAuthToken(): void {
  cachedToken = null;
  localStorage.removeItem(STORAGE_KEY);
}
