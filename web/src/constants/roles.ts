import type { VaiTro } from '@/types/auth-user.types';

export const ROLES: Record<VaiTro, VaiTro> = {
  QUAN_TRI: 'QUAN_TRI',
  KHACH_HANG: 'KHACH_HANG',
};

export const ROLE_LABELS: Record<VaiTro, string> = {
  QUAN_TRI: 'Quản trị viên',
  KHACH_HANG: 'Khách hàng',
};
