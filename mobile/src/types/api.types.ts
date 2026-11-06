// Khớp 100% với com.innfinder.backend.dto.response.ApiResponse<T>
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Kiểu dữ liệu phân trang Spring Data JPA
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; 
  first: boolean;
  last: boolean;
  empty: boolean;
}