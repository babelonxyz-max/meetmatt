"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";

interface ProvidersProps {
  children: ReactNode;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 font-mono animate-pulse">Loading...</div>
    </div>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    </Suspense>
  );
}
