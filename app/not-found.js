import Link from "next/link";
export default function NotFound() {
  return <div className="empty"><div className="big">📍</div>Page not found.<br /><br /><Link href="/" className="btn">Go home</Link></div>;
}
