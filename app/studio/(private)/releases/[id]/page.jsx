import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireStaff } from "../../../../../lib/auth";
import { getStudioRelease } from "../../../../../lib/studio";
import { GENRES } from "../../../../../lib/catalog";
import { ReleaseEditor } from "../../../../../components/studio/release-editor";

export const metadata = { title: "Edit release" };

export default async function EditRelease({ params }) {
  const staff = await requireStaff();
  const release = await getStudioRelease(staff, (await params).id);
  if (!release) notFound();
  return <main id="main" className="studio-main">
    <Link className="text-link back-link" href="/studio/releases"><ChevronLeft size={17}/> All releases</Link>
    <header className="studio-heading"><div><h1>{release.title}</h1><p>Edit tracks, artwork, and publishing settings.</p></div>
      {release.status === "published" && <Link className="button outline" href={`/releases/${release.slug}`}>View public release <ExternalLink size={16}/></Link>}
    </header>
    <ReleaseEditor key={release.revision} genres={GENRES} admin={staff.role === "admin"} initial={release}/>
  </main>;
}
