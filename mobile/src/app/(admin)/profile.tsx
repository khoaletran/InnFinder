import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminProfileScreen() {
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState(user?.hoVaTen || 'Nguyễn Minh Anh');
  const [email, setEmail] = useState(user?.email || 'minhanh@email.com');
  const [phone, setPhone] = useState(user?.sdt || '0901 234 567');
  const [address, setAddress] = useState('Quận 1, TP. Hồ Chí Minh');

  const handleSave = () => {
    Alert.alert('Thành công', 'Đã lưu thay đổi thông tin cá nhân.');
    router.back();
  };

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn tenant */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Thông tin cá nhân</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="items-center py-4 mb-4">
          <Avatar size="lg" color="accent" className="size-20 mb-2 border-2 border-teal-600">
            {user?.avatarUrl ? <Avatar.Image source={{ uri: user.avatarUrl }} /> : null}
            <Avatar.Fallback className="bg-teal-50">
              <Text className="text-2xl font-bold text-teal-800">
                {fullName.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <Pressable
            onPress={() => Alert.alert('Chọn ảnh', 'Mở thư viện ảnh')}
            className="mt-1 px-3 py-1 rounded-full bg-teal-50 border border-teal-200"
          >
            <Text className="text-xs font-semibold text-teal-700">Thay đổi ảnh đại diện</Text>
          </Pressable>
        </View>

        {/* Inputs card */}
        <View className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-6 shadow-xs">
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Họ và tên</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Vai trò hệ thống</Text>
            <View className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row justify-between items-center">
              <Text className="text-sm font-medium text-slate-700">Quản trị viên hệ thống</Text>
              <Ionicons name="lock-closed" size={16} color="#94A3B8" />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Email liên hệ</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Địa chỉ</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
            />
          </View>
        </View>

        {/* Footer buttons */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-white border border-slate-200 active:bg-slate-50"
          >
            <Text className="text-sm font-semibold text-slate-700">Huỷ bỏ</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-teal-600 active:bg-teal-700"
          >
            <Text className="text-sm font-bold text-white">Lưu thay đổi</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
