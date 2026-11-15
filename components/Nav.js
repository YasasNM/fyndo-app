"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayPin } from "./Logo";
import { isLive } from "@/lib/data";
import { useUser } from "@/lib/hooks";

const LINKS = [
  { href: "/", label: "Home", ic: "🏠" },
  { href: "/plan", label: "Plan", ic: "💞" },
  { href: "/saved", label: "Saved", ic: "🔖" },
  { href: "/rewards", label: "Rewards", ic: "🎟️" },
  { href: "/me", label: "Me", ic: "👤" },
];

export default function Nav() {
  const path = usePathname();
  const user = useUser();
  const links = [...LINKS];
  if (user && (user.role === "owner" || user.role === "admin")) links.splice(4, 0, { href: "/dashboard", label: "Business", ic: "📊" });
  if (user && user.role === "admin") links.splice(5, 0, { href: "/admin", label: "Admin", ic: "🛠️" });
  const on = (h) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      {!isLive && (
        <div className="demo-bar">
          Demo mode: sample places, data saved only in this browser. <Link href="/login">Try demo logins</Link>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand"><PlayPin /> Fyndo</Link>
          <nav className="toplinks">
            {links.map((l) => <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""}>{l.label}</Link>)}
          </nav>
        </div>
      </header>
      <nav className="tabs">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""}><span className="ic">{l.ic}</span>{l.label}</Link>
        ))}
      </nav>
    </>
  );
}
