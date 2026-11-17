"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayPin } from "./Logo";
import { Ico } from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { isLive } from "@/lib/data";
import { useUser } from "@/lib/hooks";

// Each feature has one home: these five in the bars, Watch / Rewards / Split as tiles on Home,
// account settings and bookings behind "Settings" on your profile.
const LINKS = [
  { href: "/", label: "Home", ic: "home" },
  { href: "/plan", label: "Plan", ic: "route" },
  { href: "/feed", label: "Friends", ic: "group" },
  { href: "/saved", label: "Saved", ic: "bookmark" },
  { href: "/me", label: "Profile", ic: "user", profile: true },
];
// The phone's bottom bar: Business and Admin live in Settings there, so the bar stays at five.
const PHONE = ["/", "/plan", "/feed", "/saved", "/me"];

export default function Nav() {
  const path = usePathname();
  const user = useUser();
  const links = [...LINKS];
  if (user && (user.role === "owner" || user.role === "admin")) links.splice(4, 0, { href: "/dashboard", label: "Business", ic: "store" });
  if (user && user.role === "admin") links.splice(5, 0, { href: "/admin", label: "Admin", ic: "shield" });
  // Profile opens your public profile once you have a username; before that (or logged out) it opens /me.
  const profileHref = user && user.username ? `/u?name=${encodeURIComponent(user.username)}` : "/me";
  const on = (h) => (h === "/" ? path === "/" : h === "/me" ? ["/me", "/profile", "/u"].some((p) => path.startsWith(p)) : path.startsWith(h));
  const hrefOf = (l) => (l.profile ? profileHref : l.href);
  return (
    <>
      {!isLive && (
        <div className="demo-bar">
          Demo mode: sample places, saved only in this browser. <Link href="/login">Try the demo logins</Link>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand" aria-label="Fyndo home"><PlayPin size={22} /> Fyndo</Link>
          <nav className="toplinks" aria-label="Main">
            {links.map((l) => <Link key={l.href} href={hrefOf(l)} className={on(l.href) ? "on" : ""} aria-current={on(l.href) ? "page" : undefined}>{l.label}</Link>)}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <nav className="tabs" aria-label="Main">
        {links.filter((l) => PHONE.includes(l.href)).map((l) => (
          <Link key={l.href} href={hrefOf(l)} className={on(l.href) ? "on" : ""} aria-current={on(l.href) ? "page" : undefined}>
            <span className="ic"><Ico n={l.ic} size={22} strokeWidth={on(l.href) ? 2.2 : 1.7} /></span>{l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
