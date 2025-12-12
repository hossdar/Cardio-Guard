import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <p className="text-slate-400 mb-8 max-w-md">{this.state.error?.message}</p>
          <button
            className="px-6 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;