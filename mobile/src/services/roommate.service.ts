import { axiosClient } from '../api/axiosClient';
import { z } from 'zod';

export type RoommateGender = 'NAM' | 'NU' | 'KHONG_YEU_CAU';
export type RoommateAppStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_HUY';

export const roommateSchema = z.object({
  khuVuc: z.string().trim().min(1, 'Vui lòng nhập khu vực').max(100),
  soNguoiCanTim: z.number().int().min(1, 'Cần ít nhất 1 người').max(20),
  chiPhiMoiNguoi: z.number().int().min(0, 'Chi phí không hợp lệ').max(100000000),
  ngayVaoO: z.iso.date('Nhập ngày theo định dạng YYYY-MM-DD'),
  moTa: z.string().trim().min(1, 'Vui lòng nhập mô tả').max(1500),
  gioiTinhUuTien: z.enum(['NAM', 'NU', 'KHONG_YEU_CAU']).default('KHONG_YEU_CAU'),
  tieuChi: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
});

export const roommateApplySchema = z.object({
  sdtLienHe: z.string().trim().regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0'),
  gioiTinh: z.enum(['NAM', 'NU', 'KHAC']),
  ngheNghiep: z.string().trim().min(1, 'Vui lòng nhập nghề nghiệp hoặc trường học').max(80),
  loiNhan: z.string().trim().min(1, 'Vui lòng giới thiệu ngắn về bản thân').max(500),
});

export type RoommateInput = z.infer<typeof roommateSchema>;
export type RoommateApplyInput = z.infer<typeof roommateApplySchema>;

export interface RoommatePost extends RoommateInput {
  id: string;
  loaiPhong: string;
  anhPhong: string | null;
  soSlotDaDuyet: number;
  tenNguoiDang?: string | null;
  trangThai: 'DANG_TIM' | 'DA_DU_NGUOI';
  chuBai: boolean;
}

export interface Comment {
  id: string;
  tenNguoiViet: string;
  noiDung: string;
  guiLuc: string;
  chuBai: boolean;
  parentId?: string | null;
  replies?: Comment[];
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

interface Page<T> { items: T[]; nextCursor: string | null }
interface Booking { loaiPhong: string; anhPhong: string | null; baiDangId: string | null }

const base = '/api/roommates';
const postUrl = (id: string) => base + '/' + encodeURIComponent(id);
const bookingUrl = (id: string) => base + '/booking/' + encodeURIComponent(id);

export const roommateService = {
  list: (params: { area?: string; maxPrice?: number; gender?: RoommateGender; limit?: number; cursor?: string }) =>
    axiosClient.get<unknown, Page<RoommatePost>>(base, { params }),
  mine: (cursor?: string) =>
    axiosClient.get<unknown, Page<RoommatePost>>(base + '/mine', { params: { cursor } }),
  detail: (id: string) => axiosClient.get<unknown, RoommatePost>(postUrl(id)),
  comments: (id: string, cursor?: string) =>
    axiosClient.get<unknown, Page<Comment>>(postUrl(id) + '/comments', { params: { cursor } }),
  booking: (id: string) => axiosClient.get<unknown, Booking>(bookingUrl(id)),
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
