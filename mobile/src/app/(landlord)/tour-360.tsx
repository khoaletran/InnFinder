import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { tour360Service } from '../../services/tour360.service';
import { useCreateRoomStore } from '../../store/useCreateRoomStore';
import { Tour360Node } from '../../types/tour360.types';
import { Tour360Modal } from '../../components/room/Tour360Modal';

const PRESET_NAMES = [
  'Phòng chính',
  'Gác lửng',
  'Khu bếp',
  'Nhà vệ sinh',
  'Ban công',
  'Hành lang',
];

function applySequentialLinks(rawNodes: Tour360Node[]): Tour360Node[] {
  return rawNodes.map((node, idx) => {
    const links = [];
    if (idx + 1 < rawNodes.length) {
      const next = rawNodes[idx + 1];
      links.push({
        targetNodeId: next.id,
        yaw: 0,
        pitch: -0.15,
        label: `Đi tới ${next.name}`,
      });
    }
    if (idx - 1 >= 0) {
      const prev = rawNodes[idx - 1];
      links.push({
        targetNodeId: prev.id,
        yaw: Math.PI,
        pitch: -0.15,
        label: `Quay lại ${prev.name}`,
      });
    }
    return { ...node, links };
  });
}

export default function Tour360Screen() {
  const router = useRouter();
  const { roomId, tourId: paramTourId } = useLocalSearchParams<{
    roomId?: string;
    tourId?: string;
  }>();
  const { tour360Id, setTour360Id } = useCreateRoomStore();

  const existingTourId = paramTourId || (!roomId ? tour360Id : null);

  const [nodes, setNodes] = useState<Tour360Node[]>([]);
  const [startNodeId, setStartNodeId] = useState<string>('');
  const [autoLink, setAutoLink] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedTourId, setSavedTourId] = useState<string | null>(existingTourId || null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        setLoading(true);
        let loaded = null;
        if (roomId) {
          loaded = await tour360Service.getRoomTour(roomId);
        } else if (existingTourId) {
          loaded = await tour360Service.getTourById(existingTourId);
        }
        if (loaded) {
          setNodes(loaded.nodes);
          setStartNodeId(loaded.startNodeId || loaded.nodes[0]?.id || '');
          setSavedTourId(loaded.maTour);
        }
      } catch {
        // Fresh tour
      } finally {
        setLoading(false);
      }
    };
    void loadExisting();
  }, [roomId, existingTourId]);

  const handlePickPanoramas = async () => {
    if (nodes.length >= 10) {
      Alert.alert('Giới hạn', 'Mỗi phòng tối đa 10 góc ảnh 360°.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền thư viện', 'Vui lòng cấp quyền truy cập ảnh để chọn ảnh Panorama/360°.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - nodes.length,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;

    setUploading(true);
    try {
      const added: Tour360Node[] = [];
      for (let i = 0; i < res.assets.length; i++) {
        const asset = res.assets[i];
        const uploaded = await tour360Service.uploadPanorama(asset.uri);
        const idx = nodes.length + added.length;
        added.push({
          id: `node-${Date.now()}-${i}`,
          name: PRESET_NAMES[idx] || `Góc phòng ${idx + 1}`,
          imageUrl: uploaded.url,
          width: uploaded.width || asset.width,
          height: uploaded.height || asset.height,
          isPartialPano: uploaded.isPartialPano,
          defaultYaw: 0,
          defaultPitch: 0,
          links: [],
          markers: [],
        });
      }
      setNodes((prev) => {
        const next = [...prev, ...added];
        if (!startNodeId && next[0]) setStartNodeId(next[0].id);
        return next;
      });
    } catch (err: any) {
      Alert.alert('Tải ảnh thất bại', err?.message || 'Không thể tải ảnh 360° lên máy chủ.');
    } finally {
      setUploading(false);
    }
  };

  const handleRename = (nodeId: string, name: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, name } : n)));
  };

  const handleRemove = (nodeId: string) => {
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== nodeId);
      if (startNodeId === nodeId) {
        setStartNodeId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (nodes.length === 0) {
      Alert.alert('Thiếu ảnh 360°', 'Vui lòng chọn ít nhất 1 ảnh Panorama hoặc 360°.');
      return;
    }
    if (nodes.some((n) => !n.name.trim())) {
      Alert.alert('Thiếu tên góc nhìn', 'Vui lòng nhập tên cho tất cả các góc nhìn.');
      return;
    }

    const preparedNodes = autoLink ? applySequentialLinks(nodes) : nodes;

    setSaving(true);
    try {
      const payload = {
        maPhongTro: roomId,
        startNodeId: startNodeId || preparedNodes[0].id,
        nodes: preparedNodes,
      };
      const saved = savedTourId
        ? await tour360Service.updateTour(savedTourId, payload)
        : await tour360Service.createTour(payload);

      setSavedTourId(saved.maTour);
      setNodes(saved.nodes);
      if (!roomId) {
        setTour360Id(saved.maTour);
      }

      Alert.alert('Đã lưu Tour 360°', `Tour #${saved.maTour} với ${saved.nodeCount} góc phòng đã sẵn sàng!`);
    } catch (err: any) {
      Alert.alert('Lưu thất bại', err?.message || 'Không thể lưu Tour 360° lúc này.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top', 'bottom']}>
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Tour 360° đa điểm</Text>
        <View className="w-6" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tip Card */}
          <View className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 mb-4 flex-row gap-2.5">
            <Ionicons name="compass-outline" size={20} color="#0f766e" />
            <Text className="flex-1 text-xs text-teal-900 leading-4">
              Chọn ảnh <Text className="font-bold">Panorama / 360°</Text> có sẵn trong thư viện máy cho từng khu vực (Phòng chính, Nhà vệ sinh, Ban công, Gác lửng...) để tạo tour xoay 360° trực quan.
            </Text>
          </View>

          {/* Pick Panorama from Device Library */}
          <Pressable
            onPress={handlePickPanoramas}
            disabled={uploading || nodes.length >= 10}
            className="mb-4 border-2 border-dashed border-teal-500 bg-white rounded-2xl p-5 items-center justify-center active:bg-teal-50"
          >
            {uploading ? (
              <View className="items-center">
                <ActivityIndicator size="small" color="#0f766e" />
                <Text className="text-xs font-bold text-teal-800 mt-1.5 text-center">
                  Đang tải ảnh Panorama lên...
                </Text>
              </View>
            ) : (
              <View className="items-center">
                <Ionicons name="images-outline" size={26} color="#0f766e" />
                <Text className="text-sm font-bold text-teal-800 mt-1.5 text-center">
                  Chọn ảnh Panorama / 360° từ máy ({nodes.length}/10)
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5 text-center">
                  Hỗ trợ ảnh toàn cảnh từ Camera điện thoại (Panorama) hoặc ảnh 360° 2:1
                </Text>
              </View>
            )}
          </Pressable>

          {/* Auto-link toggle */}
          {nodes.length > 1 && (
            <View className="p-3.5 bg-white rounded-2xl border border-gray-100 mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold text-gray-900">Tự động nối mũi tên giữa các góc</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  Khách bấm mũi tên hoặc chọn thẻ cảnh để chuyển phòng mượt mà
                </Text>
              </View>
              <Switch
                value={autoLink}
                onValueChange={setAutoLink}
                trackColor={{ false: '#cbd5e1', true: '#0f766e' }}
              />
            </View>
          )}

          {/* Scene Nodes List */}
          {nodes.map((node, index) => {
            const isStart = node.id === startNodeId;
            return (
              <View
                key={node.id}
                className="p-3 bg-white rounded-2xl border border-gray-200 mb-3 flex-row items-center gap-3"
              >
                <Image
                  source={{ uri: node.imageUrl }}
                  className="w-16 h-12 rounded-xl bg-slate-100"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <TextInput
                    value={node.name}
                    onChangeText={(txt) => handleRename(node.id, txt)}
                    placeholder={`Góc phòng ${index + 1}`}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900"
                  />
                  <Pressable
                    onPress={() => setStartNodeId(node.id)}
                    className="flex-row items-center gap-1 mt-1.5"
                  >
                    <Ionicons
                      name={isStart ? 'star' : 'star-outline'}
                      size={13}
                      color={isStart ? '#d97706' : '#94a3b8'}
                    />
                    <Text
                      className={`text-[11px] font-semibold ${
                        isStart ? 'text-amber-700' : 'text-gray-400'
                      }`}
                    >
                      {isStart ? 'Góc mở đầu mặc định' : 'Đặt làm góc mở đầu'}
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => handleRemove(node.id)}
                  className="p-2 rounded-xl bg-red-50"
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View className="p-4 bg-white border-t border-gray-100 gap-2.5">
        {savedTourId && (
          <Button
            variant="outline"
            onPress={() => setPreviewOpen(true)}
            className="w-full border-teal-600 py-2.5 rounded-xl"
          >
            <Button.Label className="text-teal-800 font-bold text-sm">
              Xem thử Tour 360°
            </Button.Label>
          </Button>
        )}

        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={saving || uploading || nodes.length === 0}
          className="w-full bg-teal-700 py-3 rounded-xl"
        >
          <Button.Label className="text-white font-bold text-sm">
            {saving ? 'Đang lưu Tour...' : 'Lưu Tour 360°'}
          </Button.Label>
        </Button>
      </View>

      <Tour360Modal
        visible={previewOpen}
        tourId={savedTourId}
        title="Xem thử Tour 360°"
        onClose={() => setPreviewOpen(false)}
      />
    </SafeAreaView>
  );
}
