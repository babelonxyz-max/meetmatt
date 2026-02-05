"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";

// No authentication providers needed
// We use localStorage for session management

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
