import Link from "next/link";
import { Disc3 } from "lucide-react";

export default function NotFound() {
  return <main id="main" className="bare-page"><div className="empty-panel"><Disc3 size={36}/><h1>Page not found</h1><Link className="button solid" href="/">Back to discover</Link></div></main>;
}
