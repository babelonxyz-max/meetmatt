import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
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
  title: "Meet Matt - Deploy Custom AI Agents in 15 Minutes",
  description: "Create and deploy AI-powered assistants with Meet Matt. No coding required. $150 setup, $50/month. Deploy AI assistants, coworkers, or digital employees.",
  keywords: ["AI agent", "AI assistant", "deploy AI", "custom AI", "digital employee", "AI coworker"],
  authors: [{ name: "Meet Matt" }],
  openGraph: {
    title: "Meet Matt - Deploy Custom AI Agents in 15 Minutes",
    description: "Create and deploy AI-powered assistants. No coding required.",
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
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.__PRIVY_APP_ID__=' + JSON.stringify(privyAppId) + ';' }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden selection:bg-blue-500/30 selection:text-white`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen pb-24">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
