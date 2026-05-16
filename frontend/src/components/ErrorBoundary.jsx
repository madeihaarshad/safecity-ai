import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] p-6">
          <div className="bg-[var(--surface)] border border-[var(--danger)]/30 rounded-xl p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong in this section
            </h2>
            
            <p className="text-[var(--subtle)] text-sm mb-6">
              An unexpected error occurred. Reloading the page may fix the issue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-[var(--subtle)]/70 cursor-pointer hover:text-[var(--subtle)] mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded p-3 text-xs font-mono text-[var(--danger)] overflow-auto max-h-40">
                  <p className="mb-2">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="text-[var(--subtle)] whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
            
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Reload Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
