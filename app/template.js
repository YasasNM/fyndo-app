// Re-mounts on every page change, so each new page fades in softly (see .page-enter in globals.css).
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
