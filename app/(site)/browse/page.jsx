import { browse, PAGE_SIZE } from "../../../lib/catalog";
import { readCatalogFilters } from "../../../lib/catalog-filters.mjs";
import { CatalogPanel } from "../../../components/catalog-panel";

export const metadata = { title: "Browse releases" };
export const dynamic = "force-dynamic";

export default async function BrowsePage({ searchParams }) {
  const filters = readCatalogFilters(await searchParams);
  const catalog = await browse(filters);
  const labelName = catalog.labels.find((entry) => entry.name.toLowerCase() === filters.label.toLowerCase())?.name || filters.label;

  return <main id="main" className="public-main page">
    <header className="page-heading">{labelName && <p className="directory-kicker">Record label</p>}<h1>{labelName || "Browse releases"}</h1></header>
    <CatalogPanel path="/browse" filters={filters} catalog={catalog} pageSize={PAGE_SIZE} showSearch/>
  </main>;
}
