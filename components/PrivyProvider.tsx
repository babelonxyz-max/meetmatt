"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";

interface WindowWithPrivyAppId extends Window {
  __PRIVY_APP_ID__?: string;
}

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  const appId = (window as WindowWithPrivyAppId).__PRIVY_APP_ID__ ?? null;

  if (!appId) {
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
