import { Ico } from "@/components/Icon";
import Link from "next/link";
export default function NotFound() {
  return <div className="empty"><div className="big"><Ico n="pin" size={30} /></div>Page not found.<br /><br /><Link href="/" className="btn">Go home</Link></div>;
}
