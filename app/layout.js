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
export const viewport = { themeColor: "#B8202B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap"
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
