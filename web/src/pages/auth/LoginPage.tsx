import React from 'react';
import { AuthMapPortal } from '@/components/auth/AuthMapPortal';

export const LoginPage: React.FC = () => {
  return <AuthMapPortal initialMode="login" />;
};
