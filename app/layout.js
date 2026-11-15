import "./globals.css";
import Nav from "@/components/Nav";
import PWA from "@/components/PWA";

export const metadata = {
  title: "Fyndo · Find the real spots",
  description: "Find great places and plan dates in Sri Lanka. Real videos, real prices, one plan.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Fyndo", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#0E3B3B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <Nav />
        <main className="wrap">{children}</main>
        <PWA />
      </body>
    </html>
  );
}
