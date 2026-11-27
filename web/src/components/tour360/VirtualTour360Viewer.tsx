import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Viewer, type PanoData } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/markers-plugin/index.css';
import {
  VirtualTourPlugin,
  type VirtualTourNode,
} from '@photo-sphere-viewer/virtual-tour-plugin';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import { Compass, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { Tour360Node } from '@/types/tour360.types';

interface VirtualTour360ViewerProps {
  nodes: Tour360Node[];
  startNodeId?: string | null;
  activeNodeId?: string;
  className?: string;
  clickPromptText?: string | null;
  onViewerClick?: (coords: { nodeId: string; yaw: number; pitch: number }) => void;
  onActiveNodeChange?: (nodeId: string) => void;
  onCameraGetterReady?: (getter: () => { yaw: number; pitch: number }) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePanoramaUrl(url: string): string {
  if (!url) return url;
  // Ensure Cloudinary serves browser-compatible JPEG within WebGL texture limits (4096px)
  const marker = '/image/upload/';
  if (url.includes('res.cloudinary.com') && url.includes(marker)) {
    const [prefix, rest] = url.split(marker);
    if (rest && !rest.startsWith('f_')) {
      return `${prefix}${marker}f_jpg,q_auto:good,w_4096,c_limit/${rest}`;
    }
  }
  return url;
}

function buildPanoDataForNode(node: Tour360Node) {
  return (image: HTMLImageElement, xmpData?: PanoData): PanoData => {
    if (xmpData && xmpData.fullWidth) {
      return xmpData;
    }
    const w = image.naturalWidth || image.width || node.width || 4096;
    const h = image.naturalHeight || image.height || node.height || 2048;
    if (w > 0 && h > 0 && (node.isPartialPano || w / h > 2.15)) {
      const fullHeight = Math.round(w / 2);
      return {
        isEquirectangular: true,
        fullWidth: w,
        fullHeight,
        croppedWidth: w,
        croppedHeight: h,
        croppedX: 0,
        croppedY: Math.max(0, Math.round((fullHeight - h) / 2)),
      };
    }
    return {
      isEquirectangular: true,
      fullWidth: w,
      fullHeight: h,
      croppedWidth: w,
      croppedHeight: h,
      croppedX: 0,
      croppedY: 0,
    };
  };
}

function toPsvNodes(nodes: Tour360Node[]): VirtualTourNode[] {
  const validIds = new Set(nodes.map((n) => n.id));
  return nodes.map((node) => {
    const safeUrl = normalizePanoramaUrl(node.imageUrl);
    return {
      id: node.id,
      name: node.name,
      panorama: safeUrl,
      thumbnail: safeUrl,
      panoData: buildPanoDataForNode(node),
    sphereCorrection:
      node.defaultYaw || node.defaultPitch
        ? { pan: node.defaultYaw ?? 0, tilt: node.defaultPitch ?? 0 }
        : undefined,
    links: (node.links || [])
      .filter((lnk) => validIds.has(lnk.targetNodeId) && lnk.targetNodeId !== node.id)
      .map((lnk) => ({
        nodeId: lnk.targetNodeId,
        position: { yaw: lnk.yaw, pitch: lnk.pitch },
        name: lnk.label || nodes.find((n) => n.id === lnk.targetNodeId)?.name || 'Di chuyển',
      })),
    markers: (node.markers || []).map((m) => ({
      id: m.id,
      position: { yaw: m.yaw, pitch: m.pitch },
      html: `<div style="background:rgba(15,118,110,0.92);color:#fff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;border:1.5px solid rgba(255,255,255,0.8);box-shadow:0 4px 12px rgba(0,0,0,0.35);cursor:pointer;">${escapeHtml(m.label)}</div>`,
      anchor: 'bottom center',
      tooltip: escapeHtml(m.label),
    })),
    };
  });
}

export const VirtualTour360Viewer: React.FC<VirtualTour360ViewerProps> = ({
  nodes,
  startNodeId,
  activeNodeId,
  className = '',
  clickPromptText,
  onViewerClick,
  onActiveNodeChange,
  onCameraGetterReady,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const tourPluginRef = useRef<VirtualTourPlugin | null>(null);
  const currentNodeRef = useRef<string>(activeNodeId || startNodeId || nodes[0]?.id || '');

  const onViewerClickRef = useRef(onViewerClick);
  const onActiveNodeChangeRef = useRef(onActiveNodeChange);
  const onCameraGetterReadyRef = useRef(onCameraGetterReady);

  useEffect(() => {
    onViewerClickRef.current = onViewerClick;
    onActiveNodeChangeRef.current = onActiveNodeChange;
    onCameraGetterReadyRef.current = onCameraGetterReady;
  }, [onViewerClick, onActiveNodeChange, onCameraGetterReady]);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>(
    activeNodeId || startNodeId || nodes[0]?.id || '',
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const psvNodes = useMemo(() => toPsvNodes(nodes), [nodes]);
  const firstNodeId = nodes[0]?.id || '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || psvNodes.length === 0) return;

    const initialId =
      activeNodeId && nodes.some((n) => n.id === activeNodeId)
        ? activeNodeId
        : startNodeId && nodes.some((n) => n.id === startNodeId)
          ? startNodeId
          : firstNodeId;

    currentNodeRef.current = initialId;
    setCurrentNodeId(initialId);
    setReady(false);
    setLoadError(null);

    const viewer = new Viewer({
      container,
      navbar: false,
      defaultZoomLvl: 45,
      mousewheelCtrlKey: false,
      touchmoveTwoFingers: false,
      plugins: [
        MarkersPlugin,
        [
          VirtualTourPlugin,
          {
            dataMode: 'client',
            positionMode: 'manual',
            renderMode: '3d',
            startNodeId: initialId,
            nodes: psvNodes,
            preload: true,
            transitionOptions: {
              showLoader: true,
              effect: 'fade',
              speed: '25rpm',
              rotation: true,
            },
          },
        ],
      ],
    });

    const tourPlugin = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
    viewerRef.current = viewer;
    tourPluginRef.current = tourPlugin;

    viewer.addEventListener('ready', () => {
      setReady(true);
      setLoadError(null);
      onCameraGetterReadyRef.current?.(() => {
        const pos = viewer.getPosition();
        return { yaw: Number(pos.yaw.toFixed(4)), pitch: Number(pos.pitch.toFixed(4)) };
      });
    });

    viewer.addEventListener('panorama-loaded', () => {
      setReady(true);
      setLoadError(null);
    });

    viewer.addEventListener('panorama-error', () => {
      setReady(true);
      setLoadError('Không thể tải ảnh 360°/Panorama. Vui lòng kiểm tra kết nối mạng hoặc thử ảnh khác.');
    });

    viewer.addEventListener('click', (evt) => {
      if (evt.data.rightclick) return;
      onViewerClickRef.current?.({
        nodeId: currentNodeRef.current,
        yaw: Number(evt.data.yaw.toFixed(4)),
        pitch: Number(evt.data.pitch.toFixed(4)),
      });
    });

    tourPlugin.addEventListener('node-changed', (evt) => {
      currentNodeRef.current = evt.node.id;
      setCurrentNodeId(evt.node.id);
      onActiveNodeChangeRef.current?.(evt.node.id);
    });

    return () => {
      tourPluginRef.current = null;
      viewerRef.current = null;
      viewer.destroy();
    };
    // Only rebuild Viewer if mounted/unmounted or switching from 0 -> >0 nodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstNodeId === '' ? 0 : 1]);

  // Dynamically update tour nodes/links/markers without tearing down the Viewer
  useEffect(() => {
    const tourPlugin = tourPluginRef.current;
    if (!tourPlugin || !ready || psvNodes.length === 0) return;

    const targetId =
      activeNodeId && psvNodes.some((n) => n.id === activeNodeId)
        ? activeNodeId
        : psvNodes.some((n) => n.id === currentNodeRef.current)
          ? currentNodeRef.current
          : psvNodes[0].id;

    tourPlugin.setNodes(psvNodes, targetId);
    currentNodeRef.current = targetId;
    setCurrentNodeId(targetId);
  }, [psvNodes, activeNodeId, ready]);

  const handleSelectScene = useCallback((nodeId: string) => {
    const tourPlugin = tourPluginRef.current;
    if (!tourPlugin || nodeId === currentNodeRef.current) return;
    void tourPlugin.setCurrentNode(nodeId);
  }, []);

  const handleResetView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    void viewer.animate({ yaw: 0, pitch: 0, zoom: 45, speed: '120ms' });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen unavailable in embedded WebView
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-slate-400 text-xs ${className}`}>
        Chưa có ảnh 360° hoặc Panorama nào để hiển thị.
      </div>
    );
  }

  const currentNodeName = nodes.find((n) => n.id === currentNodeId)?.name || nodes[0].name;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full min-h-[340px] bg-slate-950 overflow-hidden select-none ${className}`}
    >
      <div
        ref={containerRef}
        className={`w-full h-full ${clickPromptText ? 'cursor-crosshair' : ''}`}
      />

      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400 mb-2" />
          <p className="text-xs font-semibold">Đang tải không gian 360°...</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white px-6 text-center">
          <Compass className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-xs font-semibold max-w-sm">{loadError}</p>
        </div>
      )}

      {/* Top Left Current Scene Pill */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-slate-900/75 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs border border-white/15">
          <Compass className="w-3.5 h-3.5 text-teal-300" />
          <span>{currentNodeName}</span>
          {nodes.length > 1 && (
            <span className="text-slate-300 font-medium">
              ({nodes.findIndex((n) => n.id === currentNodeId) + 1}/{nodes.length})
            </span>
          )}
        </div>
      </div>

      {/* Click Instruction Banner in Editor Mode */}
      {clickPromptText && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-teal-600/95 text-white text-xs font-bold shadow-lg border border-white/30 pointer-events-none whitespace-nowrap">
          {clickPromptText}
        </div>
      )}

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetView}
          title="Đưa về góc chính diện"
          className="px-3 py-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xs border border-white/15 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Góc mặc định</span>
        </button>
        <button
          type="button"
          onClick={() => void handleToggleFullscreen()}
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          className="w-8 h-8 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs border border-white/15 cursor-pointer transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Multi-Node Scene Switcher Strip */}
      {nodes.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[92%] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/75 backdrop-blur-sm border border-white/15">
            {nodes.map((node) => {
              const active = node.id === currentNodeId;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSelectScene(node.id)}
                  className={`flex items-center gap-2 pr-3 pl-1.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-200 hover:bg-white/15'
                  }`}
                >
                  <img
                    src={node.imageUrl}
                    alt={node.name}
                    className="w-7 h-7 rounded-lg object-cover border border-white/20"
                  />
                  <span>{node.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
