import React, { useRef, useState } from 'react';
import {
  ArrowRightCircle,
  Compass,
  Loader2,
  MapPin,
  Plus,
  Save,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { VirtualTour360Viewer } from '@/components/tour360/VirtualTour360Viewer';
import { tour360Service } from '@/services/tour360.service';
import type { Tour360Node, Tour360Response } from '@/types/tour360.types';

interface Tour360EditorModalProps {
  isOpen: boolean;
  roomId?: string;
  tour: Tour360Response | null;
  onClose: () => void;
  onSaved: (savedTour: Tour360Response) => void;
}

type PlaceMode =
  | { kind: 'idle' }
  | { kind: 'link'; targetNodeId: string }
  | { kind: 'marker'; label: string };

const PRESET_SCENE_NAMES = [
  'Phòng chính',
  'Gác lửng',
  'Khu bếp',
  'Nhà vệ sinh',
  'Ban công',
  'Hành lang',
];

export const Tour360EditorModal: React.FC<Tour360EditorModalProps> = ({
  isOpen,
  roomId,
  tour,
  onClose,
  onSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useState<Tour360Node[]>(() => tour?.nodes ?? []);
  const [startNodeId, setStartNodeId] = useState<string>(
    () => tour?.startNodeId || tour?.nodes[0]?.id || '',
  );
  const [activeNodeId, setActiveNodeId] = useState<string>(
    () => tour?.startNodeId || tour?.nodes[0]?.id || '',
  );
  const [placeMode, setPlaceMode] = useState<PlaceMode>({ kind: 'idle' });
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [markerLabel, setMarkerLabel] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];
  const otherNodes = nodes.filter((n) => n.id !== activeNode?.id);

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || uploading) return;
    const files = Array.from(fileList);
    if (nodes.length + files.length > 10) {
      toast.error('Mỗi phòng tối đa 10 góc ảnh 360°');
      return;
    }

    setUploading(true);
    try {
      const addedNodes: Tour360Node[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const uploaded = await tour360Service.uploadPanorama(file);
        const nextIdx = nodes.length + addedNodes.length;
        const defaultName = PRESET_SCENE_NAMES[nextIdx] || `Góc phòng ${nextIdx + 1}`;
        addedNodes.push({
          id: `node-${Date.now()}-${i}`,
          name: defaultName,
          imageUrl: uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
          isPartialPano: uploaded.isPartialPano,
          defaultYaw: 0,
          defaultPitch: 0,
          links: [],
          markers: [],
        });
      }
      if (addedNodes.length > 0) {
        setNodes((prev) => [...prev, ...addedNodes]);
        if (!startNodeId) setStartNodeId(addedNodes[0].id);
        setActiveNodeId(addedNodes[0].id);
        toast.success(`Đã tải lên ${addedNodes.length} ảnh 360°`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải ảnh 360° thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRenameNode = (nodeId: string, name: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, name } : n)));
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => {
      const filtered = prev
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          links: n.links.filter((l) => l.targetNodeId !== nodeId),
        }));
      if (startNodeId === nodeId) {
        setStartNodeId(filtered[0]?.id || '');
      }
      if (activeNodeId === nodeId) {
        setActiveNodeId(filtered[0]?.id || '');
      }
      return filtered;
    });
  };

  const handleViewerClick = ({
    nodeId,
    yaw,
    pitch,
  }: {
    nodeId: string;
    yaw: number;
    pitch: number;
  }) => {
    if (placeMode.kind === 'idle') return;
    if (placeMode.kind === 'link') {
      const targetNode = nodes.find((n) => n.id === placeMode.targetNodeId);
      if (!targetNode || targetNode.id === nodeId) {
        toast.error('Chọn góc đích khác với góc hiện tại');
        return;
      }
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                links: [
                  ...n.links.filter((l) => l.targetNodeId !== targetNode.id),
                  {
                    targetNodeId: targetNode.id,
                    yaw,
                    pitch,
                    label: `Đi tới ${targetNode.name}`,
                  },
                ],
              }
            : n,
        ),
      );
      toast.success(`Đã gắn mũi tên tới "${targetNode.name}"`);
      setPlaceMode({ kind: 'idle' });
      return;
    }

    if (placeMode.kind === 'marker') {
      const label = placeMode.label.trim();
      if (!label) return;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                markers: [
                  ...n.markers,
                  {
                    id: `mk-${Date.now()}`,
                    label,
                    yaw,
                    pitch,
                  },
                ],
              }
            : n,
        ),
      );
      toast.success(`Đã gắn chú thích "${label}"`);
      setMarkerLabel('');
      setPlaceMode({ kind: 'idle' });
    }
  };

  const handleRemoveLink = (nodeId: string, targetNodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, links: n.links.filter((l) => l.targetNodeId !== targetNodeId) }
          : n,
      ),
    );
  };

  const handleRemoveMarker = (nodeId: string, markerId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, markers: n.markers.filter((m) => m.id !== markerId) }
          : n,
      ),
    );
  };

  const handleSave = async () => {
    if (nodes.length === 0) {
      toast.error('Vui lòng tải lên ít nhất 1 ảnh 360° hoặc Panorama');
      return;
    }
    if (nodes.some((n) => !n.name.trim())) {
      toast.error('Tên các góc phòng không được để trống');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        maPhongTro: roomId,
        startNodeId: startNodeId || nodes[0].id,
        nodes,
      };
      const saved = tour?.maTour
        ? await tour360Service.updateTour(tour.maTour, payload)
        : await tour360Service.createTour(payload);
      toast.success('Đã lưu Tour tham quan 360°!');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu Tour 360°');
    } finally {
      setSaving(false);
    }
  };

  const clickPromptText =
    placeMode.kind === 'link'
      ? `Click vào cửa/lối đi trên ảnh để đặt mũi tên tới "${nodes.find((n) => n.id === placeMode.targetNodeId)?.name || ''}"`
      : placeMode.kind === 'marker'
        ? `Click vào vị trí trên ảnh để gắn nhãn "${placeMode.label}"`
        : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
        {/* Left: Interactive 360° Viewer */}
        <div className="flex-1 min-h-[300px] bg-slate-950 relative">
          <VirtualTour360Viewer
            nodes={nodes}
            startNodeId={startNodeId}
            activeNodeId={activeNode?.id}
            clickPromptText={clickPromptText}
            onActiveNodeChange={setActiveNodeId}
            onViewerClick={handleViewerClick}
          />
        </div>

        {/* Right: Multi-node Editor Sidebar */}
        <div className="w-full lg:w-[370px] border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col bg-white">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trình tạo Tour 360° đa điểm</h3>
                <p className="text-[11px] text-slate-500">Hỗ trợ cả ảnh 360° và Panorama điện thoại</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleUploadFiles(e.target.files)}
            />

            {/* 1. Nodes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  Các điểm góc nhìn ({nodes.length}/10)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={uploading || nodes.length >= 10}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{uploading ? 'Đang tải...' : 'Thêm ảnh 360°'}</span>
                  </button>
                </div>
              </div>

              {nodes.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  Bấm <strong>Thêm ảnh 360°</strong> để tải lên ảnh phòng chính, gác lửng, bếp hoặc nhà vệ sinh.
                </div>
              ) : (
                <div className="space-y-2">
                  {nodes.map((node) => {
                    const isSelected = node.id === activeNode?.id;
                    const isStart = node.id === startNodeId;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setActiveNodeId(node.id)}
                        className={`p-2.5 rounded-2xl border transition-colors cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/60'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={node.imageUrl}
                            alt={node.name}
                            className="w-12 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <input
                            type="text"
                            value={node.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleRenameNode(node.id, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                          />
                          <button
                            type="button"
                            title="Đặt làm góc mở đầu"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStartNodeId(node.id);
                            }}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              isStart
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isStart ? 'fill-amber-500' : ''}`} />
                          </button>
                          <button
                            type="button"
                            title="Xóa điểm này"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Link Arrows for Active Node */}
            {activeNode && otherNodes.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <span className="font-bold text-slate-800 block">
                  Mũi tên chuyển góc từ "{activeNode.name}"
                </span>
                <div className="flex gap-1.5">
                  <select
                    value={
                      otherNodes.some((o) => o.id === linkTargetId)
                        ? linkTargetId
                        : otherNodes[0].id
                    }
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                  >
                    {otherNodes.map((o) => (
                      <option key={o.id} value={o.id}>
                        Đi tới: {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = otherNodes.some((o) => o.id === linkTargetId)
                        ? linkTargetId
                        : otherNodes[0].id;
                      setPlaceMode({ kind: 'link', targetNodeId: targetId });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    <span>Đặt trên ảnh</span>
                  </button>
                </div>

                {activeNode.links.length > 0 && (
                  <div className="space-y-1.5">
                    {activeNode.links.map((lnk) => (
                      <div
                        key={lnk.targetNodeId}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <span className="font-medium text-slate-700 truncate">
                          ➔ {lnk.label || lnk.targetNodeId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(activeNode.id, lnk.targetNodeId)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Markers for Active Node */}
            {activeNode && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <span className="font-bold text-slate-800 block">
                  Nhãn chú thích nội thất trên "{activeNode.name}"
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={markerLabel}
                    onChange={(e) => setMarkerLabel(e.target.value)}
                    placeholder="VD: Máy lạnh Inverter"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!markerLabel.trim()) {
                        toast.error('Nhập tên chú thích trước');
                        return;
                      }
                      setPlaceMode({ kind: 'marker', label: markerLabel.trim() });
                    }}
                    className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gắn</span>
                  </button>
                </div>

                {activeNode.markers.length > 0 && (
                  <div className="space-y-1.5">
                    {activeNode.markers.map((mk) => (
                      <div
                        key={mk.id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="font-medium text-slate-700 truncate">{mk.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMarker(activeNode.id, mk.id)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {placeMode.kind !== 'idle' && (
              <button
                type="button"
                onClick={() => setPlaceMode({ kind: 'idle' })}
                className="w-full py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-semibold cursor-pointer"
              >
                Hủy chế độ đặt điểm
              </button>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={saving || uploading || nodes.length === 0}
              onClick={() => void handleSave()}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu Tour 360°</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
