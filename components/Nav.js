"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayPin } from "./Logo";
import { Ico } from "./Icon";
import { isLive } from "@/lib/data";
import { useUser } from "@/lib/hooks";

const LINKS = [
  { href: "/", label: "Home", ic: "home" },
  { href: "/plan", label: "Plan", ic: "route" },
  { href: "/feed", label: "Friends", ic: "group" },
  { href: "/saved", label: "Saved", ic: "bookmark" },
  { href: "/rewards", label: "Rewards", ic: "ticket" },
  { href: "/me", label: "Me", ic: "user" },
];
// The phone's bottom bar: Business and Admin live in the Me menu there, so the bar stays at six.
const PHONE = ["/", "/plan", "/feed", "/saved", "/rewards", "/me"];

export default function Nav() {
  const path = usePathname();
  const user = useUser();
  const links = [...LINKS];
  if (user && (user.role === "owner" || user.role === "admin")) links.splice(4, 0, { href: "/dashboard", label: "Business", ic: "store" });
  if (user && user.role === "admin") links.splice(5, 0, { href: "/admin", label: "Admin", ic: "shield" });
  const on = (h) => (h === "/" ? path === "/" : path.startsWith(h));
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
        {links.filter((l) => PHONE.includes(l.href)).map((l) => (
          <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""} aria-current={on(l.href) ? "page" : undefined}>
            <span className="ic"><Ico n={l.ic} size={21} strokeWidth={on(l.href) ? 2.1 : 1.8} /></span>{l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
