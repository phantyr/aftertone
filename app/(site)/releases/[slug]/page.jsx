import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, ListMusic } from "lucide-react";
import { formatTime, getPublicRelease } from "../../../../lib/catalog";
import { formatReleaseDate } from "../../../../lib/release-format.mjs";
import { catalogHref } from "../../../../lib/catalog-filters.mjs";
import { getPremium } from "../../../../lib/premium";
import { PlayButton, SaveButton } from "../../../../components/listener";
import { ReleaseGrid, SectionHeading } from "../../../../components/releases";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const release = await getPublicRelease((await params).slug);
  return release ? { title: `${release.title} by ${release.artist}`, description: release.summary || release.description.slice(0, 170) } : {};
}

export default async function ReleasePage({ params }) {
  const { slug } = await params;
  const [release, member] = await Promise.all([getPublicRelease(slug), getPremium()]);
  if (!release) notFound();
  const { tracks, related } = release;
  return <main id="main" className="public-main page">
    <Link className="text-link back-link" href="/browse"><ChevronLeft size={18}/> Browse releases</Link>
    <section className="release-hero">
      <img className="release-art" src={release.cover} width="520" height="520" alt={`Art for ${release.title}`}/>
      <div className="release-copy">
        <p className="eyebrow">{release.kind}<span>·</span>{release.genre}</p>
        <h1>{release.title}</h1><p className="release-artist">{release.artist}</p>
        {release.summary && <p className="release-summary">{release.summary}</p>}
        <div className="actions"><PlayButton track={tracks.find((track) => track.preview)} playlist={tracks}/><SaveButton release={release} iconOnly={false}/></div>
        <dl className="release-meta">
          <div><dt>Released</dt><dd><time dateTime={release.date}>{formatReleaseDate(release.date)}</time></dd></div>
          {release.label && <div><dt>Label</dt><dd><Link className="record-label-link" href={catalogHref("/browse", { label: release.label })}>{release.label}</Link></dd></div>}
          {release.subgenre && <div><dt>Subgenre</dt><dd>{release.subgenre}</dd></div>}
          <div><dt>Downloads</dt><dd>{release.downloads.toLocaleString()}</dd></div>
        </dl>
      </div>
    </section>
    <section className="tracks-section" aria-labelledby="tracks-heading">
      <header className="section-heading"><div><h2 id="tracks-heading">Tracklist</h2><p>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</p></div><ListMusic size={24} aria-hidden="true"/></header>
      <ol className="tracklist">{tracks.map((track) => <li key={track.id}>
        <span className="track-index">{String(track.position).padStart(2, "0")}</span>
        {track.preview ? <PlayButton track={track} playlist={tracks} className="icon-button track-play" iconOnly/> : <span className="sr-placeholder" aria-label="No preview available"/>}
        <div className="track-name"><strong>{track.title}</strong><small>{track.artist}</small></div>
        <span className="track-length">{track.durationSeconds ? formatTime(track.durationSeconds) : "—"}</span>
        {member ? <a className="button outline download-button" href={track.download} download aria-label={`Direct download: ${track.title}`}><Download size={17} aria-hidden="true"/><span>Direct download</span><small>{track.format}</small></a> :
          <Link className="button outline download-button" prefetch={false} href={`/downloads/${track.id}`} aria-label={`Download options for ${track.title}`}><Download size={17} aria-hidden="true"/><span>Download options</span><small>{track.format}</small></Link>}
      </li>)}</ol>
    </section>
    {release.description && <section className="release-notes"><h2>Release notes</h2><p>{release.description}</p></section>}
    {related.length > 0 && <section className="related"><SectionHeading title="More to explore" href={`/browse?genre=${encodeURIComponent(release.genre)}`} link={release.genre}/><ReleaseGrid releases={related}/></section>}
  </main>;
}
