import "./globals.css";
import Nav from "@/components/Nav";
import PWA from "@/components/PWA";
import { THEME_BOOT } from "@/lib/theme";

export const metadata = {
  title: "Fyndo: find the real spots",
  description: "Find great places and plan dates in Sri Lanka. Real videos, real prices, one plan.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Fyndo", statusBarStyle: "default" },
};
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14181c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Light or dark before the first paint, so the page never flashes the wrong colours. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <Nav />
        <main className="wrap">{children}</main>
        <PWA />
      </body>
    </html>
  );
}
