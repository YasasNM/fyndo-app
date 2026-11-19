"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useUser } from "@/lib/hooks";
import { isPublicAuthRoute } from "@/lib/authRouting";

// A render boundary, not a CSS overlay: protected hooks cannot run while locked.
export default function AuthGate({ children }) {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const publicRoute = isPublicAuthRoute(pathname);
  useEffect(() => {
    if (!publicRoute && user === null) router.replace("/login?next=" + encodeURIComponent(pathname + window.location.search + window.location.hash));
  }, [user, pathname, publicRoute, router]);
  if (publicRoute) return <main className="wrap">{children}</main>;
  if (!user) return <main className="wrap"><div className="loading" role="status">{user === undefined ? "Checking your session..." : "Opening login..."}</div></main>;
  return <><Nav /><main className="wrap">{children}</main></>;
}
