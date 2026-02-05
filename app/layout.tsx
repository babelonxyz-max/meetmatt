import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OrganizationSchema, WebsiteSchema } from "./components/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Meet Matt | Deploy Your AI Agent in 15 Minutes",
  description: "Get your own AI agent for $5/day. Matt deploys custom AI assistants in 15 minutes using Devin AI. Automate emails, scheduling, research, and more.",
  keywords: ["AI agent", "virtual assistant", "Devin AI", "automation", "AI assistant", "email automation", "scheduling assistant"],
  authors: [{ name: "Matt" }],
  creator: "Meet Matt",
  publisher: "Meet Matt",
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meetmatt.xyz",
    siteName: "Meet Matt",
    title: "Meet Matt | Deploy Your AI Agent in 15 Minutes",
    description: "Get your own AI agent for $5/day. Automate emails, scheduling, research, and more.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Meet Matt - Your AI Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet Matt | Deploy Your AI Agent in 15 Minutes",
    description: "Get your own AI agent for $5/day. Automate emails, scheduling, research, and more.",
    images: ["/og-image.jpg"],
    creator: "@meetmatt",
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://meetmatt.xyz",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.devin.ai" />
        <link rel="dns-prefetch" href="https://api.devin.ai" />
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <OrganizationSchema />
        <WebsiteSchema />
        {children}
      </body>
    </html>
  );
}
