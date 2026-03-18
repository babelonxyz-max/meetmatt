"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";

export default function PrivyProvider({
  children,
  appId,
}: {
  children: React.ReactNode;
  appId?: string | null;
}) {
  const normalizedAppId = appId?.trim() || null;

  if (!normalizedAppId) {
    return (
      <>
        <div className="fixed top-20 right-4 z-50 rounded-lg bg-red-900/90 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          Privy not configured. Check console.
        </div>
        {children}
      </>
    );
  }

  return (
    <BasePrivyProvider
      appId={normalizedAppId}
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
