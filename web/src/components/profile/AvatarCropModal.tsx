import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { AppButton } from '@/components/common/AppButton';

const PREVIEW_SIZE = 240;
const EXPORT_SIZE = 512;

interface LoadedSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function loadOrientationAwareImage(file: File): Promise<LoadedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Không thể đọc dữ liệu ảnh'));
    el.src = objectUrl;
  });

  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

interface AvatarCropModalProps {
  file: File | null;
  isUploading: boolean;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

interface AvatarCropDialogProps {
  file: File;
  isUploading: boolean;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({
  file,
  isUploading,
  onClose,
  onConfirm,
}) => {
  const titleId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedRef = useRef<LoadedSource | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(
    null,
  );

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const clampOffset = useCallback((nextX: number, nextY: number, currentZoom: number) => {
    const loaded = loadedRef.current;
    if (!loaded) return { x: 0, y: 0 };
    const baseScale = Math.max(PREVIEW_SIZE / loaded.width, PREVIEW_SIZE / loaded.height);
    const drawW = loaded.width * baseScale * currentZoom;
    const drawH = loaded.height * baseScale * currentZoom;
    const maxX = Math.max(0, (drawW - PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (drawH - PREVIEW_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  }, []);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const loaded = loadedRef.current;
    if (!canvas || !loaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = PREVIEW_SIZE * dpr;
    canvas.height = PREVIEW_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    const baseScale = Math.max(PREVIEW_SIZE / loaded.width, PREVIEW_SIZE / loaded.height);
    const drawW = loaded.width * baseScale * zoom;
    const drawH = loaded.height * baseScale * zoom;
    const drawX = (PREVIEW_SIZE - drawW) / 2 + offset.x;
    const drawY = (PREVIEW_SIZE - drawH) / 2 + offset.y;

    ctx.drawImage(loaded.source, drawX, drawY, drawW, drawH);
  }, [zoom, offset]);

  useEffect(() => {
    let cancelled = false;

    void loadOrientationAwareImage(file)
      .then((loaded) => {
        if (cancelled) {
          loaded.cleanup();
          return;
        }
        loadedRef.current?.cleanup();
        loadedRef.current = loaded;
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Không thể đọc tệp ảnh này. Vui lòng chọn ảnh khác.');
        }
      });

    return () => {
      cancelled = true;
      loadedRef.current?.cleanup();
      loadedRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    if (isReady) {
      drawPreview();
    }
  }, [isReady, drawPreview]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, onClose]);

  const handleZoomChange = (nextZoom: number) => {
    const clamped = Math.min(3, Math.max(1, nextZoom));
    setZoom(clamped);
    setOffset((prev) => clampOffset(prev.x, prev.y, clamped));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const nextX = start.offsetX + (e.clientX - start.x);
    const nextY = start.offsetY + (e.clientY - start.y);
    setOffset(clampOffset(nextX, nextY, zoom));
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleSaveCropped = async () => {
    const loaded = loadedRef.current;
    if (!loaded) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const ratio = EXPORT_SIZE / PREVIEW_SIZE;
    const baseScale = Math.max(PREVIEW_SIZE / loaded.width, PREVIEW_SIZE / loaded.height);
    const drawW = loaded.width * baseScale * zoom * ratio;
    const drawH = loaded.height * baseScale * zoom * ratio;
    const drawX = ((PREVIEW_SIZE - loaded.width * baseScale * zoom) / 2 + offset.x) * ratio;
    const drawY = ((PREVIEW_SIZE - loaded.height * baseScale * zoom) / 2 + offset.y) * ratio;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
    ctx.drawImage(loaded.source, drawX, drawY, drawW, drawH);

    const exportBlob = await new Promise<Blob | null>((resolve) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/webp') {
            resolve(blob);
            return;
          }
          exportCanvas.toBlob((jpgBlob) => resolve(jpgBlob), 'image/jpeg', 0.88);
        },
        'image/webp',
        0.85,
      );
    });

    if (!exportBlob) {
      setLoadError('Không thể nén ảnh đại diện. Vui lòng thử lại.');
      return;
    }

    const ext = exportBlob.type === 'image/webp' ? 'webp' : 'jpg';
    const croppedFile = new File([exportBlob], `avatar.${ext}`, { type: exportBlob.type });
    onConfirm(croppedFile);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div>
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            Căn chỉnh ảnh đại diện
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Kéo ảnh để căn giữa và phóng to nếu cần (JPG, PNG, WebP tối đa 5MB)
          </p>
        </div>

        {loadError ? (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {loadError}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-60 h-60 rounded-full overflow-hidden border-2 border-teal-600 shadow-inner bg-slate-100">
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Khung căn chỉnh ảnh đại diện"
                className="w-60 h-60 cursor-grab active:cursor-grabbing touch-none block"
              />
            </div>

            <div className="w-full flex items-center gap-3">
              <button
                type="button"
                aria-label="Thu nhỏ ảnh"
                onClick={() => handleZoomChange(zoom - 0.15)}
                disabled={zoom <= 1 || isUploading}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                aria-label="Mức phóng to ảnh"
                className="flex-1 accent-teal-600 h-2 cursor-pointer"
              />
              <button
                type="button"
                aria-label="Phóng to ảnh"
                onClick={() => handleZoomChange(zoom + 0.15)}
                disabled={zoom >= 3 || isUploading}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <AppButton
            variant="secondary"
            size="md"
            fullWidth
            disabled={isUploading}
            onClick={onClose}
            className="min-h-[44px]"
          >
            Hủy
          </AppButton>
          <AppButton
            variant="primary"
            size="md"
            fullWidth
            disabled={!isReady || !!loadError}
            isLoading={isUploading}
            onClick={() => void handleSaveCropped()}
            className="min-h-[44px]"
          >
            Lưu ảnh
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  file,
  isUploading,
  onClose,
  onConfirm,
}) => {
  if (!file) return null;
  const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
  return (
    <AvatarCropDialog
      key={fileKey}
      file={file}
      isUploading={isUploading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};
