"use client";

import { ReactNode } from "react";
import PrivyProvider from "@/components/PrivyProvider";

export function Providers({
  children,
  privyAppId,
}: {
  children: ReactNode;
  privyAppId?: string | null;
}) {
  return (
    <PrivyProvider appId={privyAppId}>
      {children}
    </PrivyProvider>
  );
}
