"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/Toast";
import PrivyProvider from "@/components/PrivyProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PrivyProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </PrivyProvider>
    </ErrorBoundary>
  );
}
