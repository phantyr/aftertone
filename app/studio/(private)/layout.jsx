import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireStaff } from "../../../lib/auth";
import { Logo, StudioNav } from "../../../components/navigation";
import { SignOut } from "../../../components/studio/auth-form";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }) {
  const staff = await requireStaff();
  return <div className="studio-frame">
    <aside className="studio-sidebar">
      <Logo studio/>
      <StudioNav admin={staff.role === "admin"}/>
      <div className="studio-sidebar-bottom">
        <Link className="text-link" href="/">View public site <ExternalLink size={15}/></Link>
        <Link href="/studio/account" className="studio-user" aria-label="My account"><span className="avatar">{staff.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{staff.name}</strong><small>{staff.role === "admin" ? "Administrator" : "Editor"}</small></div></Link>
        <SignOut/>
      </div>
    </aside>
    <div className="studio-content">{children}</div>
  </div>;
}
