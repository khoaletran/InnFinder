import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AuthMapPortal } from '../../components/auth/AuthMapPortal';

export default function LoginScreen() {
  const { roommatePostId } = useLocalSearchParams<{ roommatePostId?: string }>();
  const safePostId = typeof roommatePostId === 'string' && /^[A-Za-z0-9]{20}$/.test(roommatePostId)
    ? roommatePostId : undefined;
  return <AuthMapPortal initialMode="login" roommatePostId={safePostId} />;
}
