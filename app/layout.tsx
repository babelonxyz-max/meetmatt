import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  title: "Meet Matt | Deploy AI Assistants in Minutes",
  description: "Matt helps you deploy AI assistants in minutes. No signup, no KYC. Just describe what you need and get your own AI agent.",
  keywords: ["AI assistant", "AI agent", "deploy AI", "no-code AI", "chatbot", "automation"],
  authors: [{ name: "Meet Matt" }],
  creator: "Meet Matt",
  metadataBase: new URL("https://meetmatt.xyz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meetmatt.xyz",
    siteName: "Meet Matt",
    title: "Meet Matt | Deploy AI Assistants in Minutes",
    description: "Matt helps you deploy AI assistants in minutes. No signup, no KYC. Just describe what you need and get your own AI agent.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Meet Matt - Deploy AI Assistants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet Matt | Deploy AI Assistants in Minutes",
    description: "Matt helps you deploy AI assistants in minutes. No signup, no KYC.",
    images: ["/og-image.png"],
    creator: "@meetmatt",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
