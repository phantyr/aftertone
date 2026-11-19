import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { getDownloadInfo } from "../../../../lib/catalog";
import { externalHttpsUrl } from "../../../../lib/download-policy.mjs";
import { getPremium } from "../../../../lib/premium";

export const dynamic = "force-dynamic";
export const metadata = { title: "Download track", robots: { index: false } };

export default async function DownloadPage({ params }) {
  const { id } = await params;
  const [track, member] = await Promise.all([getDownloadInfo(id), getPremium()]);
  if (!track) notFound();
  const host = externalHttpsUrl(track.free_download_url);
  const sponsor = externalHttpsUrl(process.env.DOWNLOAD_SPONSOR_URL);
  const sponsorName = process.env.DOWNLOAD_SPONSOR_NAME?.trim();
  return <main id="main" className="public-main page download-page">
    <Link href={`/releases/${track.slug}`} className="text-link back-link">Back to release</Link>
    <section className="download-panel">
      <header className="download-heading"><img src={track.cover} width="88" height="88" alt=""/>
        <div><p className="eyebrow">{member ? "Premium download" : "Free download"}</p>
          <h1>{track.title}</h1><p>{track.artist}</p></div>
      </header>
      {member ? <a href={`/api/tracks/${track.id}/download`} className="button solid" download><Download size={17}/>Download original</a> : <>
        {sponsor && sponsorName && host && <aside className="download-sponsor" aria-label="Advertisement">
          <small>Advertisement</small><a href={sponsor} target="_blank" rel="sponsored noopener noreferrer">{sponsorName}<ExternalLink size={15}/></a>
        </aside>}
        {host ? <div className="download-choice"><p>The free download opens on <strong>{new URL(host).hostname}</strong>, an external ad-supported host.</p>
          <a href={`/api/tracks/${track.id}/free`} className="button solid" rel="sponsored noreferrer">Continue to free host<ExternalLink size={16}/></a>
        </div> : <p className="download-note">A free host link hasn’t been added for this track.</p>}
        <div className="download-alternative"><span>Download directly with Premium.</span>
          <Link className="text-link" href={`/premium?track=${encodeURIComponent(track.id)}`}>Use a Premium pass</Link></div>
      </>}
    </section>
  </main>;
}
