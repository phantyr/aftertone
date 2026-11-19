import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireStaff } from "../../../../lib/auth";
import { studioList } from "../../../../lib/studio";
import { ReleaseTable } from "../../../../components/studio/tables";
import { Pagination } from "../../../../components/pagination";

export const metadata = { title: "Manage releases" };

export default async function ManageReleases({ searchParams }) {
  const staff = await requireStaff();
  const params = await searchParams;
  const status = ["draft", "published", "archived"].includes(params.status) ? params.status : "";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const parsed = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(parsed) ? Math.min(100000, Math.max(1, parsed)) : 1;
  const { rows, total } = await studioList(staff, { status, search, page });
  return <main id="main" className="studio-main">
    <header className="studio-heading"><div><h1>Releases</h1><p>Manage draft, published, and archived releases.</p></div><Link className="button solid" href="/studio/releases/new"><Plus size={18}/> New release</Link></header>
    <section className="studio-panel studio-list"><form className="browse-controls" action="/studio/releases">
      <label className="field-inline"><Search size={17}/><span className="sr-only">Find a release</span><input type="search" name="q" defaultValue={search} maxLength={120} placeholder="Find a release"/></label>
      <label htmlFor="release-status" className="sr-only">Status</label><select id="release-status" name="status" defaultValue={status}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      <button className="button outline" type="submit">Filter</button></form>
      <p className="results-count">{total} {total === 1 ? "release" : "releases"}</p><ReleaseTable rows={rows}/>
    </section>
    <Pagination page={page} pages={Math.ceil(total / 20)} href={(index) => `/studio/releases?${new URLSearchParams({ page: String(index), status, q: search })}`}/>
  </main>;
}
