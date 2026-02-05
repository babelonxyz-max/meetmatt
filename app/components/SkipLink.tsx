"use client";

interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

export function SkipLink({ targetId, children = "Skip to main content" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium shadow-lg"
    >
      {children}
    </a>
  );
}
