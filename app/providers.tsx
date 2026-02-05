"use client";

import { ReactNode } from "react";

// No authentication providers needed
// We use localStorage for session management

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
