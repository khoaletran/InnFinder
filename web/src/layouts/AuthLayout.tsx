import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Card } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2.5">
          <InnFinderLogo variant="horizontal" size="sm" />
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-medium hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs">
            Hỗ trợ: <strong className="text-teal-600 font-semibold">1900 6868</strong>
          </span>
        </div>
      </header>

      {/* Main Content Area: Centered Single Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <Card className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
          <Card.Content className="p-0">
            <Outlet />
          </Card.Content>
        </Card>
      </main>
    </div>
  );
};
