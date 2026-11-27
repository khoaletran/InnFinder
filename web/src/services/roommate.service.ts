import { axiosClient } from '@/api/axiosClient';
import type { RoommateApplyInput, RoommateInput } from '@/utils/validators';

export type RoommateGender = 'NAM' | 'NU' | 'KHONG_YEU_CAU';
export type RoommateAppStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_HUY';

export interface RoommatePost extends RoommateInput {
  id: string;
  maPhongTro: string;
  loaiPhong: string;
  anhPhong: string | null;
  soSlotDaDuyet: number;
  tenNguoiDang?: string | null;
  viDo?: number | null;
  kinhDo?: number | null;
  giaDien?: number | null;
  giaNuoc?: number | null;
  giaNuocTheoNguoi?: boolean | null;
  trangThai: 'DANG_TIM' | 'DA_DU_NGUOI';
  chuBai: boolean;
}

export interface RoommateComment {
  id: string;
  tenNguoiViet: string;
  noiDung: string;
  guiLuc: string;
  chuBai: boolean;
  parentId?: string | null;
  replies?: RoommateComment[];
}

export interface RoommateApplication {
  id: string;
  postId: string;
  maNguoiDangKy: string;
  tenNguoiDangKy: string;
  sdtLienHe: string;
  gioiTinh: 'NAM' | 'NU' | 'KHAC';
  ngheNghiep: string;
  loiNhan: string;
  trangThai: RoommateAppStatus;
  lyDoTuChoi?: string | null;
  guiLuc: string;
  xuLyLuc?: string | null;
}

export interface MyRoommateApplication {
  id: string;
  postId: string;
  khuVuc: string;
  loaiPhong: string;
  anhPhong: string | null;
  chiPhiMoiNguoi: number;
  trangThai: RoommateAppStatus;
  lyDoTuChoi?: string | null;
  guiLuc: string;
}

interface RoommatePage<T> { items: T[]; nextCursor: string | null }
interface RoommateBooking {
  loaiPhong: string;
  anhPhong: string | null;
  baiDangId: string | null;
  giaDien?: number | null;
  giaNuoc?: number | null;
  giaNuocTheoNguoi?: boolean | null;
}

const base = '/api/roommates';
const postUrl = (id: string) => base + '/' + encodeURIComponent(id);
const bookingUrl = (id: string) => base + '/booking/' + encodeURIComponent(id);

export const roommateService = {
  list: (params: { area?: string; maxPrice?: number; gender?: RoommateGender; limit?: number; cursor?: string }) =>
    axiosClient.get<unknown, RoommatePage<RoommatePost>>(base, { params }),
  mine: (cursor?: string) =>
    axiosClient.get<unknown, RoommatePage<RoommatePost>>(base + '/mine', { params: { cursor } }),
  detail: (id: string) => axiosClient.get<unknown, RoommatePost>(postUrl(id)),
  comments: (id: string, cursor?: string) =>
    axiosClient.get<unknown, RoommatePage<RoommateComment>>(postUrl(id) + '/comments', { params: { cursor } }),
  booking: (id: string) => axiosClient.get<unknown, RoommateBooking>(bookingUrl(id)),
  create: (id: string, input: RoommateInput) => axiosClient.post<unknown, string>(bookingUrl(id), input),
  edit: (id: string, input: RoommateInput) => axiosClient.put(postUrl(id), input),
  close: (id: string) => axiosClient.patch(postUrl(id) + '/close'),
  comment: (id: string, noiDung: string, parentId?: string | null) =>
    axiosClient.post(postUrl(id) + '/comments', parentId ? { noiDung, parentId } : { noiDung }),

  apply: (id: string, input: RoommateApplyInput) =>
    axiosClient.post<unknown, RoommateApplication>(postUrl(id) + '/apply', input),
  myApplications: () =>
    axiosClient.get<unknown, MyRoommateApplication[]>(base + '/my-applications'),
  myApplicationForPost: (id: string) =>
    axiosClient.get<unknown, RoommateApplication | null>(postUrl(id) + '/my-application'),
  applications: (id: string) =>
    axiosClient.get<unknown, RoommateApplication[]>(postUrl(id) + '/applications'),
  approveApplication: (id: string, appId: string) =>
    axiosClient.patch<unknown, RoommateApplication>(postUrl(id) + '/applications/' + encodeURIComponent(appId) + '/approve'),
  rejectApplication: (id: string, appId: string, lyDoTuChoi?: string) =>
    axiosClient.patch<unknown, RoommateApplication>(postUrl(id) + '/applications/' + encodeURIComponent(appId) + '/reject', { lyDoTuChoi }),
  cancelApplication: (id: string, appId: string) =>
    axiosClient.patch(postUrl(id) + '/applications/' + encodeURIComponent(appId) + '/cancel'),
};
