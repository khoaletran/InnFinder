import type { ReviewRequestDTO, ReviewResponseDTO } from './review.types';
import type { TransactionResponse, TrangThaiGD } from './transaction.types';

export type { ReviewRequestDTO, ReviewResponseDTO, TransactionResponse, TrangThaiGD };

export type TrangThaiDatLich = 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY';

export interface AppointmentResponse {
  maDatLich: string;
  ngayHen: string;
  thoiGianDat?: string;
  trangThai: TrangThaiDatLich;
  coc: number;
  phiThu: number;
  daNhanLaiCoc?: boolean;
  khachHangDongY?: boolean | null;
  chuTroDongY?: boolean | null;
  liDoHuy?: string;
  daNopCoc?: boolean;

  maPhongTro: string;
  diaChiPhong?: string;
  giaThue: number;
  tieuDePhong?: string;
  hinhAnh?: string;

  maKhachHang?: string;
  tenKhachHang?: string;
  sdtKhachHang?: string;

  maChuTro?: string;
  tenChuTro?: string;
  sdtChuTro?: string;
}

export interface AppointmentCreateRequest {
  maPhongTro: string;
  ngayHen: string;
  ghiChu?: string;
}

export interface AppointmentCancelRequest {
  liDoHuy: string;
}

export interface AppointmentDecisionRequest {
  dongY: boolean;
  liDoTuChoi?: string;
}

export interface DepositStatusResponse {
  maDatLich: string;
  daNopCoc: boolean;
  soTienCoc: number;
  trangThaiLich: string;
}
