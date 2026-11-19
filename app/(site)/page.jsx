import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChartNoAxesColumnIncreasing } from "lucide-react";
import { browse, featuredRelease, getDownloadChart } from "../../lib/catalog";
import { catalogHref, readCatalogFilters } from "../../lib/catalog-filters.mjs";
import { formatReleaseDate } from "../../lib/release-format.mjs";
import { CatalogPanel } from "../../components/catalog-panel";
import { PlayButton, SaveButton } from "../../components/listener";

export const dynamic = "force-dynamic";

const HOME_PAGE_SIZE = 12;

export default async function Discover({ searchParams }) {
  const filters = readCatalogFilters(await searchParams);
  const [featured, catalog, chart] = await Promise.all([
    featuredRelease(),
    browse({ ...filters, pageSize: HOME_PAGE_SIZE }),
    getDownloadChart(),
  ]);
  const playlist = featured && [featured, ...catalog.items.filter((item) => item.id !== featured.id)]
    .map((item) => item.firstTrack).filter((track) => track?.preview);

  return <main id="main" className="public-main discover">
    <h1 className="sr-only">Discover music</h1>
    {featured && <div className="discover-lead">
      <section className="spotlight" aria-labelledby="featured-title">
        <div className="spotlight-visual" aria-hidden="true">
          <img className="spotlight-photo" src={featured.head !== featured.cover ? featured.head : "/art/hero.webp"} alt="" fetchPriority="high"/>
          {featured.head === featured.cover && <img className="spotlight-sleeve" src={featured.cover} alt=""/>}
        </div>
        <header className="spotlight-top"><span className="spotlight-kicker"><i aria-hidden="true"/>Featured release</span>
          <time dateTime={featured.date}>{formatReleaseDate(featured.date)}</time>
        </header>
        <div className="spotlight-copy">
          <h2 id="featured-title"><Link href={`/releases/${featured.slug}`}>{featured.title}</Link></h2>
          <p className="spotlight-artist">{featured.artist}</p>
          {featured.summary && <p className="spotlight-summary">{featured.summary}</p>}
          <div className="spotlight-tags"><Link href={catalogHref("/browse", { genre: featured.genre })}>{featured.genre}</Link>
            <span aria-hidden="true">/</span><Link href={catalogHref("/browse", { kind: featured.kind })}>{featured.kind === "VA" ? "Various artists" : featured.kind}</Link>
            {featured.label && <><span aria-hidden="true">/</span><Link href={catalogHref("/browse", { label: featured.label })}>{featured.label}</Link></>}
          </div>
        </div>
        <div className="spotlight-actions actions">
          <PlayButton track={featured.firstTrack} playlist={playlist}/>
          <Link className={featured.firstTrack?.preview ? "button glass" : "button solid"} href={`/releases/${featured.slug}`}>View release<ArrowUpRight size={15} aria-hidden="true"/></Link>
          <SaveButton release={featured}/>
        </div>
      </section>
      {chart.length > 0 && <aside className="download-chart" aria-labelledby="chart-title">
        <header className="chart-head"><span className="chart-icon"><ChartNoAxesColumnIncreasing size={19} aria-hidden="true"/></span><h2 id="chart-title">Download chart</h2></header>
        <ol>{chart.map((release, index) => <li key={release.slug}><Link href={`/releases/${release.slug}`}>
          <span className="chart-rank">{String(index + 1).padStart(2, "0")}</span>
          <img src={release.cover} alt="" width="46" height="46"/>
          <span className="chart-titles"><strong>{release.title}</strong><small>{release.artist}</small></span>
          <ArrowUpRight className="chart-arrow" size={15} aria-hidden="true"/>
        </Link></li>)}</ol>
        <Link className="chart-more" href={catalogHref("/browse", {sort: "popular"})}>See all top downloads<ArrowRight size={15} aria-hidden="true"/></Link>
      </aside>}
    </div>}
    <CatalogPanel path="/" heading="Release catalog" filters={filters} catalog={catalog} pageSize={HOME_PAGE_SIZE}/>
  </main>;
}
