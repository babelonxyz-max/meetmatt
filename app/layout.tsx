import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://meetmatt.xyz"),
  title: "Meet Matt | Deploy AI Agents in Minutes",
  description: "Meet Matt is the relationship layer behind your AI operators. Deploy agents quickly, keep Matt on the thread, and manage billing, support, and activation from one place.",
  keywords: ["AI agent", "AI assistant", "deploy AI", "custom AI", "digital employee", "AI coworker"],
  authors: [{ name: "Meet Matt" }],
  openGraph: {
    title: "Meet Matt | Deploy AI Agents in Minutes",
    description: "Deploy AI agents quickly and keep Matt on the thread across onboarding, payment, and activation.",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Meet Matt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet Matt | Deploy AI Agents in Minutes",
    description: "Deploy AI agents quickly and keep Matt on the thread across onboarding, payment, and activation.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '1024x1024' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/apple-icon', type: 'image/png', sizes: '180x180' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  return (
    <html lang="en" suppressHydrationWarning className="dark overflow-x-hidden">
      <head />
      <body className="min-h-dvh antialiased bg-[var(--background)] overflow-x-hidden">
        <Providers privyAppId={privyAppId}>
          <Navbar />
          <main className="relative min-h-screen">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
