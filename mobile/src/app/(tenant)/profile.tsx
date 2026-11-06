import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, Chip } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';

function ProfileMenuRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color={Colors.text} />
        <Text className="text-base font-medium text-slate-800">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function TenantProfileScreen() {
  const { user, switchMode, logout } = useAuthStore();

  const displayName = user?.tenDangNhap || 'Nguyễn Văn Anh';
  const displaySub = user ? `${user.email} • ${user.sdt}` : 'vananh@email.com • 0901 234 567';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="items-center py-5">
          <Avatar size="lg" variant="soft" color="accent" className="mb-3">
            <Avatar.Fallback>NA</Avatar.Fallback>
          </Avatar>
          <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
          <Text className="text-xs text-slate-500 mt-1 mb-2">{displaySub}</Text>
          <Chip size="sm" variant="soft" color="success">
            <Chip.Label>Khách thuê</Chip.Label>
          </Chip>
        </View>

        <Card className="mb-4 p-0 overflow-hidden">
          <Card.Body className="p-0 divide-y divide-slate-100">
            <ProfileMenuRow icon="person-outline" label="Thông tin cá nhân" onPress={() => {}} />
            <ProfileMenuRow icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => {}} />
          </Card.Body>
        </Card>

        <Button variant="danger-soft" className="mb-8" onPress={() => logout()}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Button.Label>Đăng xuất</Button.Label>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}