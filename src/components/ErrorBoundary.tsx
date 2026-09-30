import React from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

type Props = { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showErrorDetails?: boolean;
};

type State = { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log detailed diagnostics to console
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({ errorInfo: info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Please try again or go back to the home page.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors font-medium"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
              </div>

              {this.props.showErrorDetails && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    Technical Details
                  </summary>
                  <div className="bg-gray-50 rounded p-4 mt-2">
                    <p className="text-sm font-mono text-red-600 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-48">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


