export interface Tour360Link {
  targetNodeId: string;
  yaw: number;
  pitch: number;
  label?: string;
}

export interface Tour360Marker {
  id: string;
  label: string;
  yaw: number;
  pitch: number;
}

export interface Tour360Node {
  id: string;
  name: string;
  imageUrl: string;
  width?: number;
  height?: number;
  isPartialPano?: boolean;
  defaultYaw?: number;
  defaultPitch?: number;
  links: Tour360Link[];
  markers: Tour360Marker[];
}

export interface SaveTour360Request {
  maPhongTro?: string;
  startNodeId?: string;
  nodes: Tour360Node[];
}

export interface PanoramaUploadResponse {
  url: string;
  width: number;
  height: number;
  isPartialPano: boolean;
}

export interface Tour360Response {
  maTour: string;
  maPhongTro: string | null;
  maChuTro: string | null;
  startNodeId: string | null;
  nodeCount: number;
  nodes: Tour360Node[];
  createdAt: string;
  updatedAt: string;
}
