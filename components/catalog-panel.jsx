import Form from "next/form";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Disc3, Search, SlidersHorizontal } from "lucide-react";
import { RELEASE_TYPES } from "../lib/input.mjs";
import { catalogHref, RELEASE_ORDERS, RELEASE_WINDOWS } from "../lib/catalog-filters.mjs";
import { Pagination } from "./pagination";
import { EmptyPanel, ReleaseGrid } from "./releases";

const views = [
  { order: "latest", label: "New releases" },
  { order: "popular", label: "Top downloads" },
];

export function CatalogPanel({ path, heading, filters, catalog, pageSize, showSearch = false }) {
  const { q, genre, subgenre, label, kind, released, sort, page } = filters;
  const { items, total, genres, subgenres, labels } = catalog;
  const href = (changes) => catalogHref(path, { ...filters, page: 1, ...changes });
  const filtered = q || genre || subgenre || label || kind || released || sort !== "latest";
  const selectedLabel = labels.find((entry) => entry.name.toLowerCase() === label.toLowerCase())?.name;
  const currentGenreMissing = genre && !genres.some((item) => item.genre === genre);
  const currentSubgenreMissing = subgenre && !subgenres.includes(subgenre);
  const applied = [label, subgenre, kind, released, !["latest", "popular"].includes(sort)].filter(Boolean).length;

  return <section className="catalog-panel" id="catalog" aria-label={heading || "Release catalog"}>
    {heading && <header className="catalog-mast"><h2 className="catalog-heading">{heading}</h2>
      <Link href="/labels" className="label-directory-link"><Disc3 size={16} aria-hidden="true"/>Browse labels<ArrowUpRight size={14} aria-hidden="true"/></Link>
    </header>}
    <div className="catalog-toolbar">
      <nav className="catalog-views" aria-label="Catalog order">
        {views.map(({ order, label }) =>
          <Link key={order} href={href({ sort: order })} aria-current={sort === order ? "true" : undefined}>{label}</Link>
        )}
      </nav>
      <nav className="genre-strip catalog-genres" aria-label="Filter by genre">
        <Link className={`genre-chip${genre ? "" : " all"}`} aria-current={!genre ? "true" : undefined} href={href({ genre: "", subgenre: "" })}>All genres</Link>
        {genres.map((item) => <Link className={`genre-chip${genre === item.genre ? " all" : ""}`} aria-current={genre === item.genre ? "true" : undefined}
          key={item.genre} href={href({ genre: item.genre, subgenre: "" })}>{item.genre}<small>{item.count}</small></Link>)}
        {currentGenreMissing && <Link className="genre-chip all" aria-current="true" href={href({})}>{genre}</Link>}
      </nav>
      <details key={href({})} className="filter-drawer" open={showSearch || applied > 0 || undefined}>
        <summary><SlidersHorizontal size={15} aria-hidden="true"/>Filters{applied > 0 && <b>{applied}</b>}<ChevronDown className="drawer-chevron" size={14} aria-hidden="true"/></summary>
      <Form action={path === "/" ? "/#catalog" : path} className="catalog-form">
        {showSearch ? <label className="field-inline"><Search size={17}/><span className="sr-only">Search releases</span>
          <input name="q" type="search" defaultValue={q} placeholder="Track, artist, label, or genre" maxLength={120}/>
        </label> : q && <input type="hidden" name="q" value={q}/>}
        {genre && <input type="hidden" name="genre" value={genre}/>}
        <label className="catalog-field"><span>Record label</span><select name="label" defaultValue={selectedLabel || label}>
          <option value="">All labels</option>
          {labels.map((item) => <option key={item.name}>{item.name}</option>)}
          {label && !selectedLabel && <option>{label}</option>}
        </select></label>
        <label className="catalog-field"><span>Subgenre</span><select name="subgenre" defaultValue={subgenre}>
          <option value="">All subgenres</option>
          {subgenres.map((item) => <option key={item}>{item}</option>)}
          {currentSubgenreMissing && <option>{subgenre}</option>}
        </select></label>
        <label className="catalog-field"><span>Release type</span><select name="kind" defaultValue={kind}>
          <option value="">All release types</option>
          {RELEASE_TYPES.map((item) => <option key={item} value={item}>{item === "VA" ? "Various artists" : item}</option>)}
        </select></label>
        <label className="catalog-field"><span>Release date</span><select name="released" defaultValue={released}>
          <option value="">Any date</option>
          {Object.entries(RELEASE_WINDOWS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="catalog-field"><span>Sort by</span><select name="sort" defaultValue={sort}>
          {Object.entries(RELEASE_ORDERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <button className="button solid catalog-apply" type="submit">Apply</button>
      </Form>
      </details>
    </div>
    <div className="catalog-results">
      <p className="results-count">{total.toLocaleString()} {total === 1 ? "release" : "releases"}{label && <> on <strong>{selectedLabel || label}</strong></>}{q ? ` for "${q}"` : ""}</p>
      {filtered && <Link className="text-link" href={catalogHref(path)}>Reset filters</Link>}
    </div>
    {items.length ? <ReleaseGrid releases={items}/> :
      <EmptyPanel title={filtered ? "No releases found" : "No releases published yet"}
        description={filtered ? "Try a different search or filter." : "Published releases will appear here."}/>}
    <Pagination page={page} pages={Math.ceil(total / pageSize)} href={(next) => href({ page: next })}/>
  </section>;
}
