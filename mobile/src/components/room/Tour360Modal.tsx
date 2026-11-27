import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { tour360Service } from '../../services/tour360.service';
import { Tour360Response } from '../../types/tour360.types';

interface Tour360ModalProps {
  visible: boolean;
  tourId: string | null;
  title?: string;
  onClose: () => void;
}

function buildTour360Html(tour: Tour360Response): string {
  const safePayload = JSON.stringify({
    startNodeId: tour.startNodeId || tour.nodes[0]?.id || '',
    nodes: tour.nodes || [],
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core@5.11.4/index.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/markers-plugin@5.11.4/index.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/virtual-tour-plugin@5.11.4/index.min.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #viewer { width: 100%; height: 100%; overflow: hidden; background: #020617; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #node-bar {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 14px;
      z-index: 30;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 6px 8px;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      -webkit-overflow-scrolling: touch;
    }
    #node-bar::-webkit-scrollbar { display: none; }
    .node-btn {
      flex: 0 0 auto;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(15, 23, 42, 0.85);
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }
    .node-btn.active {
      background: #0d9488;
      border-color: #5eead4;
      color: #ffffff;
    }
    #err-box {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 50;
      background: #020617;
      color: #f8fafc;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 24px;
      text-align: center;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <div id="node-bar"></div>
  <div id="err-box"></div>

  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
        "@photo-sphere-viewer/core": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core@5.11.4/index.module.js",
        "@photo-sphere-viewer/markers-plugin": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/markers-plugin@5.11.4/index.module.js",
        "@photo-sphere-viewer/virtual-tour-plugin": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/virtual-tour-plugin@5.11.4/index.module.js"
      }
    }
  </script>

  <script type="module">
    import { Viewer } from '@photo-sphere-viewer/core';
    import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
    import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';

    const tourData = ${safePayload};
    const errBox = document.getElementById('err-box');
    const nodeBar = document.getElementById('node-bar');

    function postMsg(payload) {
      try {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } catch {}
    }

    function showErr(msg) {
      errBox.style.display = 'flex';
      errBox.textContent = msg;
      postMsg({ type: 'error', message: msg });
    }

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function normalizeUrl(url) {
      if (!url) return url;
      const marker = '/image/upload/';
      if (url.includes('res.cloudinary.com') && url.includes(marker)) {
        const parts = url.split(marker);
        if (parts[1] && !parts[1].startsWith('f_')) {
          return parts[0] + marker + 'f_jpg,q_auto:good,w_4096,c_limit/' + parts[1];
        }
      }
      return url;
    }

    function buildPanoData(node) {
      return (image, xmpData) => {
        if (xmpData && xmpData.fullWidth) return xmpData;
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

    try {
      const nodes = tourData.nodes || [];
      if (!nodes.length) {
        showErr('Tour 360° chưa có ảnh nào.');
      } else {
        const validIds = new Set(nodes.map((n) => n.id));
        const psvNodes = nodes.map((node) => {
          const safeUrl = normalizeUrl(node.imageUrl);
          return {
            id: node.id,
            name: node.name,
            panorama: safeUrl,
            thumbnail: safeUrl,
            panoData: buildPanoData(node),
            sphereCorrection:
              node.defaultYaw || node.defaultPitch
                ? { pan: node.defaultYaw || 0, tilt: node.defaultPitch || 0 }
                : undefined,
            links: (node.links || [])
              .filter((lnk) => validIds.has(lnk.targetNodeId) && lnk.targetNodeId !== node.id)
              .map((lnk) => ({
                nodeId: lnk.targetNodeId,
                position: { yaw: lnk.yaw, pitch: lnk.pitch },
                name: lnk.label || (nodes.find((n) => n.id === lnk.targetNodeId) || {}).name || 'Di chuyển',
              })),
            markers: (node.markers || []).map((m) => ({
              id: m.id,
              position: { yaw: m.yaw, pitch: m.pitch },
              html: '<div style="background:rgba(15,118,110,0.92);color:#fff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;border:1.5px solid rgba(255,255,255,0.8);">' + escapeHtml(m.label) + '</div>',
              anchor: 'bottom center',
              tooltip: escapeHtml(m.label),
            })),
          };
        });

        const startId = validIds.has(tourData.startNodeId) ? tourData.startNodeId : psvNodes[0].id;
        let currentId = startId;

        function renderNodeBar() {
          if (psvNodes.length <= 1) {
            nodeBar.style.display = 'none';
            return;
          }
          nodeBar.innerHTML = '';
          psvNodes.forEach((n) => {
            const btn = document.createElement('button');
            btn.className = 'node-btn' + (n.id === currentId ? ' active' : '');
            btn.textContent = n.name;
            btn.onclick = () => {
              if (n.id !== currentId) {
                tourPlugin.setCurrentNode(n.id);
              }
            };
            nodeBar.appendChild(btn);
          });
        }

        const viewer = new Viewer({
          container: document.getElementById('viewer'),
          navbar: ['zoom', 'fullscreen'],
          defaultZoomLvl: 45,
          touchmoveTwoFingers: false,
          plugins: [
            MarkersPlugin,
            [
              VirtualTourPlugin,
              {
                positionMode: 'manual',
                renderMode: '3d',
                nodes: psvNodes,
                startNodeId: startId,
              },
            ],
          ],
        });

        const tourPlugin = viewer.getPlugin(VirtualTourPlugin);
        tourPlugin.addEventListener('node-changed', (e) => {
          currentId = e.node.id;
          renderNodeBar();
        });

        viewer.addEventListener('ready', () => {
          postMsg({ type: 'ready' });
        }, { once: true });

        renderNodeBar();
      }
    } catch (err) {
      showErr('Không thể khởi tạo trình xem 360°: ' + (err && err.message ? err.message : 'Lỗi không xác định'));
    }
  </script>
</body>
</html>`;
}

export const Tour360Modal: React.FC<Tour360ModalProps> = ({
  visible,
  tourId,
  title = 'Tham quan phòng 360°',
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [tour, setTour] = useState<Tour360Response | null>(null);
  const [fetching, setFetching] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!visible || !tourId) return;
    let cancelled = false;

    const fetchTour = async () => {
      setFetching(true);
      setWebLoading(true);
      setErrorMsg(null);
      try {
        const data = await tour360Service.getTourById(tourId);
        if (!cancelled) {
          if (!data || !data.nodes?.length) {
            setErrorMsg('Tour 360° này chưa có ảnh góc nhìn nào.');
          } else {
            setTour(data);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Không thể tải dữ liệu Tour 360°.');
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    void fetchTour();
    return () => {
      cancelled = true;
    };
  }, [visible, tourId, reloadKey]);

  const htmlContent = useMemo(() => (tour ? buildTour360Html(tour) : ''), [tour]);

  if (!visible || !tourId) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#020617',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-800 bg-slate-950">
          <View className="flex-row items-center gap-2.5 flex-1 pr-3">
            <View className="w-8 h-8 rounded-xl bg-teal-600/20 border border-teal-500/40 items-center justify-center">
              <Ionicons name="compass-outline" size={18} color="#5eead4" />
            </View>
            <Text numberOfLines={1} className="text-white text-sm font-bold flex-1">
              {title}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setWebLoading(true);
              setErrorMsg(null);
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1 relative bg-slate-950">
          {errorMsg ? (
            <View className="flex-1 items-center justify-center p-6">
              <Ionicons name="warning-outline" size={40} color="#fbbf24" />
              <Text className="text-white text-sm font-bold mt-3 text-center">
                Không thể tải trình xem 360°
              </Text>
              <Text className="text-slate-400 text-xs mt-1.5 text-center leading-5">
                {errorMsg}
              </Text>
              <Pressable
                onPress={() => setReloadKey((k) => k + 1)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-teal-600"
              >
                <Text className="text-white text-xs font-bold">Thử lại</Text>
              </Pressable>
            </View>
          ) : tour && htmlContent ? (
            <WebView
              key={`${tour.maTour}-${reloadKey}`}
              source={{ html: htmlContent, baseUrl: 'https://cdn.jsdelivr.net' }}
              style={{ flex: 1, backgroundColor: '#020617' }}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              originWhitelist={['*']}
              onLoadEnd={() => setWebLoading(false)}
              onMessage={(event) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg?.type === 'ready') {
                    setWebLoading(false);
                  } else if (msg?.type === 'error') {
                    setWebLoading(false);
                    setErrorMsg(msg.message || 'Không thể khởi tạo trình xem 360°.');
                  }
                } catch {
                  // ignore
                }
              }}
              onError={() => {
                setWebLoading(false);
                setErrorMsg('Lỗi hiển thị WebView khi mở Tour 360°.');
              }}
            />
          ) : null}

          {(fetching || (webLoading && !errorMsg)) && (
            <View className="absolute inset-0 items-center justify-center bg-slate-950/75 pointer-events-none">
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text className="text-white text-xs font-semibold mt-3">
                Đang mở không gian 360°...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
