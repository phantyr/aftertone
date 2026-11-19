import Link from "next/link";
import Form from "next/form";
import localFont from "next/font/local";
import { Headphones, Search } from "lucide-react";
import { Logo, PublicNav } from "../../components/navigation";
import { ListenerProvider } from "../../components/listener";
import "./public.css";

const geist = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  display: "swap",
  weight: "100 900",
});

export default function PublicLayout({ children }) {
  return <div className={`public-shell ${geist.className}`}><ListenerProvider>
    <header className="public-header"><div className="public-header-inner">
      <Logo />
      <PublicNav />
      <Form className="global-search" action="/browse" role="search">
        <Search size={17} aria-hidden="true"/>
        <input name="q" type="search" placeholder="Search music, artists, labels" aria-label="Search music, artists, or labels" maxLength={120}/>
        <button type="submit" aria-label="Submit search"><Search size={16}/></button>
      </Form>
      <Link href="/studio" className="studio-link" aria-label="Studio"><Headphones size={16} aria-hidden="true"/><span>Studio</span></Link>
    </div></header>
    <div className="public-frame">
      <div className="site-content">{children}<footer className="site-footer"><Logo/><Link href="/browse">Browse releases</Link><Link href="/premium">Premium access</Link><Link href="/studio">Studio sign-in</Link></footer></div>
    </div>
  </ListenerProvider></div>;
}
