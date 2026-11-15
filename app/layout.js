import "./globals.css";
import Nav from "@/components/Nav";
import PWA from "@/components/PWA";

export const metadata = {
  title: "Fyndo: find the real spots",
  description: "Find great places and plan dates in Sri Lanka. Real videos, real prices, one plan.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Fyndo", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#073d3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Nav />
        <main className="wrap">{children}</main>
        <PWA />
      </body>
    </html>
  );
}
