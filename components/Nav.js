"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayPin } from "./Logo";
import { Ico } from "./Icon";
import { isLive } from "@/lib/data";

const LINKS = [
  { href: "/", label: "Home", ic: "home" },
  { href: "/explore", label: "Explore", ic: "search" },
  { href: "/plan", label: "Plan", ic: "route" },
  { href: "/saved", label: "Saved", ic: "bookmark" },
  { href: "/me", label: "Me", ic: "user" },
];

export default function Nav() {
  const path = usePathname();
  const links = LINKS;
  const MORE = ["/rewards", "/dashboard", "/admin", "/login"];
  const on = (h) => (h === "/" ? path === "/" : h === "/me" ? path.startsWith("/me") || MORE.some((m) => path.startsWith(m)) : path.startsWith(h));
  return (
    <>
      {!isLive && (
        <div className="demo-bar">
          Demo mode: sample places, saved only in this browser. <Link href="/login">Try the demo logins</Link>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand" aria-label="Fyndo home"><PlayPin /> Fyndo</Link>
          <nav className="toplinks" aria-label="Main">
            {links.map((l) => <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""} aria-current={on(l.href) ? "page" : undefined}>{l.label}</Link>)}
          </nav>
        </div>
      </header>
      <nav className="tabs" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""} aria-current={on(l.href) ? "page" : undefined}>
            <span className="ic"><Ico n={l.ic} size={21} strokeWidth={on(l.href) ? 2.1 : 1.8} /></span>{l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
