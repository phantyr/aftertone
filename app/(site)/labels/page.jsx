import Form from "next/form";
import Link from "next/link";
import { Disc3, Search } from "lucide-react";
import { Pagination } from "../../../components/pagination";
import { EmptyPanel } from "../../../components/releases";
import { getLabels } from "../../../lib/catalog";
import { catalogHref, readCatalogFilters } from "../../../lib/catalog-filters.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record labels" };
const PAGE_SIZE = 36;

export default async function LabelsPage({ searchParams }) {
  const { q, page } = readCatalogFilters(await searchParams);
  const labels = await getLabels();
  const matches = labels.filter(({ name }) => name.toLowerCase().includes(q.toLowerCase()));
  const pages = Math.ceil(matches.length / PAGE_SIZE);
  const current = Math.min(page, Math.max(1, pages));
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  return <main id="main" className="public-main page label-directory">
    <header className="page-heading"><h1>Record labels</h1></header>
    <Form key={q} action="/labels" className="directory-search" role="search" aria-label="Label directory">
      <label className="field-inline"><Search size={18} aria-hidden="true"/><span className="sr-only">Label name</span>
        <input type="search" name="q" maxLength={120} defaultValue={q} placeholder="Search labels by name"/>
      </label>
      <button type="submit" className="button solid">Search</button>
    </Form>
    <div className="catalog-results"><p className="results-count">{matches.length.toLocaleString()} {matches.length === 1 ? "label" : "labels"}</p>
      {q && <Link className="text-link" href="/labels">Clear search</Link>}
    </div>
    {visible.length ? <ul className="directory-list">
      {visible.map(({ name, count }) => <li key={name}><Link href={catalogHref("/browse", { label: name })}>
        <Disc3 size={27} aria-hidden="true"/><span>{name}</span>
        <small>{count.toLocaleString()} {count === 1 ? "release" : "releases"}</small>
      </Link></li>)}
    </ul> : <EmptyPanel title={q ? "No matching labels" : "No labels yet"} description={q ? "Try part of the label name." : "Labels appear here when their first release is published."}/>}
    <Pagination page={current} pages={pages} href={(next) => catalogHref("/labels", { q, page: next })}/>
  </main>;
}
