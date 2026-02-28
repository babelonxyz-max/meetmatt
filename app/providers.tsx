"use client";

import { ReactNode } from "react";
import PrivyProvider from "@/components/PrivyProvider";
import { ThemeProvider } from "./components/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrivyProvider>
        {children}
      </PrivyProvider>
    </ThemeProvider>
  );
}
