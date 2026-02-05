"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-black/30 rounded-lg text-left">
                <p className="text-xs text-zinc-500 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button
              onClick={this.handleReset}
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
