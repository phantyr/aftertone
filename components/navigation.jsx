"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AudioLines, Compass, Disc3, Heart, LayoutGrid, Library, ListMusic, Sparkles, UserRound, Users } from "lucide-react";

export function Logo({ studio = false }) {
  return <Link href={studio ? "/studio" : "/"} className="logo" aria-label={studio ? "Aftertone Studio home" : "Aftertone home"}>
    <span className="logo-icon"><AudioLines size={21} strokeWidth={2.7} aria-hidden="true"/></span>
    <span>aftertone<span className="logo-dot">.</span>{studio && <small>STUDIO</small>}</span>
  </Link>;
}

const publicLinks = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/browse", label: "Browse", icon: LayoutGrid },
  { href: "/labels", label: "Labels", icon: Disc3 },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/premium", label: "Premium", icon: Sparkles },
];

export function PublicNav() {
  const path = usePathname();
  return <nav className="public-nav" aria-label="Main navigation">
      {publicLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={href === "/premium" ? "premium-nav" : undefined} aria-current={path === href ? "page" : undefined}>
        <Icon size={18} aria-hidden="true"/>{label}
      </Link>)}
  </nav>;
}

export function StudioNav({ admin }) {
  const path = usePathname();
  const links = [
    { href: "/studio", label: "Overview", icon: LayoutGrid },
    { href: "/studio/releases", label: "Releases", icon: Library },
    { href: "/studio/activity", label: "Activity", icon: ListMusic },
    ...(admin ? [{ href: "/studio/premium", label: "Premium passes", icon: Disc3 }, { href: "/studio/team", label: "Team", icon: Users }] : []),
    { href: "/studio/account", label: "Account", icon: UserRound },
  ];
  return <nav aria-label="Studio navigation" className="studio-nav">
    {links.map(({ href, label, icon: Icon }) => {
      const active = path === href || (href !== "/studio" && path.startsWith(href + "/"));
      return <Link href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={18} aria-hidden="true"/>{label}</Link>;
    })}
  </nav>;
}
