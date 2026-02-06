import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export const metadata: Metadata = {
  title: "Matt AI - Deploy Custom AI Agents in 15 Minutes",
  description: "Create and deploy AI-powered Telegram bots with Matt. No coding required. $150 setup, $50/month. Live build viewing, Devin AI powered, deploy anywhere.",
  keywords: ["AI agent", "Telegram bot", "AI assistant", "deploy AI", "custom bot", "Kimi K2.5", "Devin AI"],
  authors: [{ name: "Matt AI" }],
  openGraph: {
    title: "Matt AI - Deploy Custom AI Agents in 15 Minutes",
    description: "Create and deploy AI-powered Telegram bots. No coding required.",
    type: "website",
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.__PRIVY_APP_ID__=' + JSON.stringify(privyAppId) + ';' }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)]`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
