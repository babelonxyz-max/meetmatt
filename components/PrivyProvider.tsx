"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    // Read from window.__PRIVY_APP_ID__ injected by layout.tsx
    const id = (window as any).__PRIVY_APP_ID__;
    console.log("[Privy] App ID from window:", id);
    setAppId(id || null);
    setMounted(true);
  }, []);

  // Don't render Privy during SSR/build
  if (!mounted) {
    return <>{children}</>;
  }

  if (!appId) {
    console.error("[Privy] App ID not found in window.__PRIVY_APP_ID__");
    return (
      <div className="fixed top-20 right-4 z-50 p-4 bg-red-900/90 text-white rounded-lg">
        Privy not configured. Check console.
        {children}
      </div>
    );
  }

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3B82F6",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
