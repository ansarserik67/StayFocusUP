import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "StayFocus",
  title: {
    default: "StayFocus — scroll less, live more",
    template: "%s · StayFocus",
  },
  description:
    "An anti-doomscrolling PWA: one hour of social feeds a day, extra minutes earned with camera-verified push-ups, squats and jumping jacks.",
  keywords: [
    "doomscrolling",
    "screen time",
    "digital wellbeing",
    "focus",
    "push-ups",
    "pose detection",
    "Anti-doomscroll",
  ],
  authors: [{ name: "StayFocus" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "StayFocus",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "StayFocus",
    title: "StayFocus — earn your scroll",
    description:
      "One hour of feeds. Every extra minute is earned with a camera-verified workout.",
    url: siteUrl,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "StayFocus — earn your scroll",
    description:
      "A PWA that limits doomscrolling and makes you earn extra time with real exercise.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

/** Applies the stored theme before first paint so night mode never flashes. */
const themeScript = `(function(){try{var t=localStorage.getItem("stay-focused.theme");var dark=t?t==="dark":true;var r=document.documentElement;r.classList.toggle("dark",dark);r.dataset.theme=dark?"dark":"light";r.style.colorScheme=dark?"dark":"light";}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="page-canvas flex min-h-full flex-col">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>
                <PwaProvider>
                  <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
                  >
                    Skip to content
                  </a>
                  {children}
                </PwaProvider>
              </ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
