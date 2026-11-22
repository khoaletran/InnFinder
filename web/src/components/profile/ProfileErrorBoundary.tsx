import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/common/AppButton';

interface ProfileErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface ProfileErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ProfileErrorBoundary extends React.Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ProfileErrorBoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : 'Không thể hiển thị nội dung mục này. Vui lòng thử lại.',
    };
  }

  componentDidUpdate(prevProps: ProfileErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Đã xảy ra sự cố hiển thị</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{this.state.message}</p>
          <div className="pt-1">
            <AppButton variant="secondary" size="md" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại</span>
            </AppButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
