import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  componentName?: string;
  variant?: 'full' | 'inline' | 'card';
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured UI render error in ErrorBoundary:', {
      component: this.props.componentName || 'Unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('Error during ErrorBoundary onReset callback:', e);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  private handleCopyError = async () => {
    const errorText = [
      `Component: ${this.props.componentName || 'Root UI'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}`,
      `Stack: ${this.state.error?.stack || 'N/A'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}`,
    ].join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(errorText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  public render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Unable to load content',
        fallbackMessage = 'This section encountered an unexpected render issue. You can retry loading this component or refresh the app.',
        componentName,
        variant = 'card',
      } = this.props;

      // Inline compact variant (for small widgets or subcomponents)
      if (variant === 'inline') {
        return (
          <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-2xs my-2">
            <div className="flex items-center space-x-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold truncate block">{fallbackTitle}</span>
                {componentName && (
                  <span className="text-[10px] text-rose-700 font-mono block truncate">
                    {componentName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-bold text-[11px] transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      // Card variant (default for modular cards like PunchCard, MonthlyRegister, etc.)
      if (variant === 'card') {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs text-slate-900 my-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{fallbackTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {componentName ? `Module: ${componentName}` : 'Milestone Workforce Service'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer min-h-[36px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Component</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer min-h-[36px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Reload Page</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3.5 leading-relaxed">
              {fallbackMessage}
            </p>

            {/* Error Diagnostics Toggle */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                >
                  <span>{this.state.showDetails ? 'Hide Diagnostics' : 'View Diagnostics'}</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy Diagnostic Report</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 space-y-1">
                  <div className="text-rose-400 font-bold">
                    {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}
                  </div>
                  {this.state.error?.stack && (
                    <div className="text-slate-400 text-[10px] whitespace-pre-wrap mt-1">
                      {this.state.error.stack}
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="text-amber-400/80 text-[10px] whitespace-pre-wrap mt-2 border-t border-slate-800 pt-1">
                      Component Stack:{this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Full page fallback variant (for root level boundary)
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-slate-50 text-slate-900 font-sans">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
            <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
            {fallbackTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-5 leading-relaxed">
            {fallbackMessage}
          </p>

          <div className="flex items-center space-x-3 mb-6">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center space-x-2 shadow-xs cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>

          {/* Granular technical diagnostic details */}
          <div className="max-w-lg w-full text-left">
            <button
              type="button"
              onClick={this.toggleDetails}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between w-full p-2 rounded-xl bg-white border border-slate-200 transition cursor-pointer"
            >
              <span>{this.state.showDetails ? 'Hide Technical Diagnostics' : 'Show Technical Diagnostics'}</span>
              {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {this.state.showDetails && (
              <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono overflow-x-auto shadow-inner space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-rose-400 font-bold">
                    {this.state.error?.name || 'Error'}: {this.state.error?.message}
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                  >
                    {this.state.copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {this.state.error?.stack && (
                  <p className="text-slate-400 text-[10px] whitespace-pre-wrap">
                    {this.state.error.stack}
                  </p>
                )}
                {this.state.errorInfo?.componentStack && (
                  <p className="text-amber-400/80 text-[10px] whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
