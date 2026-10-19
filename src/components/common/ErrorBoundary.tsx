import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-borderLight shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-red-50 text-danger rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-textPrimary mb-2">Something went wrong</h2>
            <p className="text-sm text-textSecondary mb-6">
              An unexpected error occurred while rendering this section. Your shopping data and wallet preferences remain safe.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
                <Home className="w-4 h-4 mr-1.5" /> Back Home
              </Button>
              <Button size="sm" onClick={this.handleReset}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
