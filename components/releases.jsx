import Link from "next/link";
import { ArrowRight, Disc3 } from "lucide-react";
import { catalogHref } from "../lib/catalog-filters.mjs";
import { formatReleaseDate } from "../lib/release-format.mjs";
import { PlayButton, SaveButton } from "./listener";

export function ReleaseCard({ release, playlist, eager = false }) {
  const href = `/releases/${release.slug}`;
  return <article className="release-card">
    <div className="card-body">
      <div className="card-art">
        <Link className="card-cover" href={href} aria-label={`View ${release.title} by ${release.artist}`}>
          <img src={release.cover} width="460" height="460" loading={eager ? "eager" : "lazy"} alt=""/>
        </Link>
        <PlayButton track={release.firstTrack} playlist={playlist} className="card-play" iconOnly/>
      </div>
      <div className="card-details">
        <h3 className="card-title"><Link href={href}>{release.title}</Link></h3>
        <p className="card-artist">{release.artist}</p>
        {release.label && <Link className="card-label" href={catalogHref("/browse", { label: release.label })}><Disc3 size={12} aria-hidden="true"/><span>{release.label}</span></Link>}
        <time className="card-date" dateTime={release.date}>{formatReleaseDate(release.date)}</time>
      </div>
    </div>
    <div className="card-tags">
      <Link className="card-chip card-genre" href={catalogHref("/browse", { genre: release.genre })}>{release.genre}</Link>
      {release.subgenre && <Link className="card-chip card-subgenre" href={catalogHref("/browse", { genre: release.genre, subgenre: release.subgenre })}>{release.subgenre}</Link>}
      <Link className="card-chip card-type" href={catalogHref("/browse", { kind: release.kind })}>{release.kind === "VA" ? "Various artists" : release.kind}</Link>
      <SaveButton release={release}/>
    </div>
  </article>;
}

export function ReleaseGrid({ releases }) {
  const playlist = releases.map((release) => release.firstTrack).filter(Boolean);
  return <div className="release-grid">{releases.map((release, i) => <ReleaseCard key={release.id} release={release} playlist={playlist} eager={i < 4}/>)}</div>;
}

export function SectionHeading({ title, description, href, link = "View all" }) {
  return <header className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{href && <Link href={href} className="text-link">{link}<ArrowRight size={16} aria-hidden="true"/></Link>}</header>;
}

export function EmptyPanel({ title, description, href, action }) {
  return <div className="empty-panel"><Disc3 size={34} aria-hidden="true"/><h2>{title}</h2>{description && <p>{description}</p>}{href && <Link className="button outline" href={href}>{action}</Link>}</div>;
}

