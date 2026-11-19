import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "../../../../../lib/auth";
import { GENRES } from "../../../../../lib/catalog";
import { ReleaseEditor } from "../../../../../components/studio/release-editor";

export const metadata = { title: "New release" };

export default async function NewRelease() {
  const staff = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  return <main id="main" className="studio-main">
    <Link className="text-link back-link" href="/studio/releases"><ChevronLeft size={17}/> All releases</Link>
    <header className="studio-heading"><div><h1>New release</h1><p>Add artwork, tracks, and release details.</p></div></header>
    <ReleaseEditor genres={GENRES} admin={staff.role === "admin"} initial={{ date: today }}/>
  </main>;
}
