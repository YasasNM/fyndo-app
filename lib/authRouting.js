// Only account entry/recovery and legal documents are public app screens.
export function isPublicAuthRoute(pathname) {
  return ["/login", "/reset-password", "/terms", "/privacy"].includes((pathname || "").replace(/\/+$/, ""));
}

// Validate decoded forms too: URL parsers and hosts may normalize escapes differently.
// Keep the original safe path so query values and fragments survive unchanged.
export function safeAuthNext(next) {
  if (typeof next !== "string" || !next || /\s/.test(next)) return "/";
  let decoded = next;
  try {
    for (let depth = 0; depth < 8; depth++) {
      if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return "/";
      const url = new URL(decoded, "https://fyndo.invalid");
      if (url.origin !== "https://fyndo.invalid" || url.pathname.startsWith("//") || url.pathname.replace(/\/+$/, "") === "/login") return "/";
      const value = decodeURIComponent(decoded);
      if (value === decoded) return next;
      decoded = value;
    }
  } catch {}
  return "/";
}
