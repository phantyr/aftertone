import Link from "next/link";
import { PremiumAccess } from "../../../components/premium-access";
import { databaseConfigured } from "../../../lib/db.mjs";
import { externalHttpsUrl } from "../../../lib/download-policy.mjs";
import { getPremium } from "../../../lib/premium";

export const dynamic = "force-dynamic";
export const metadata = { title: "Premium access" };

export default async function PremiumPage({ searchParams }) {
  const member = await getPremium();
  const { track } = await searchParams;
  const trackId = typeof track === "string" && /^[a-z0-9-]{1,90}$/.test(track) ? track : null;
  const joinUrl = externalHttpsUrl(process.env.PREMIUM_JOIN_URL);
  return <main id="main" className="public-main page download-page"><section className="download-panel premium-panel">
    <header className="page-heading"><h1>{member ? "Your Premium access" : "Premium downloads"}</h1>
      <p>{member ? `Active through ${new Date(member.expires_at).toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })} (UTC).` :
        "Get the original audio directly from the release page, ad-free."}</p></header>
    {databaseConfigured() ? <>
      {!member && <p className="download-note">Enter the private pass supplied by the site team.</p>}
      <PremiumAccess active={Boolean(member)} trackId={trackId}/>
      {!member && joinUrl && <a className="text-link" href={joinUrl} rel="noreferrer">Get a Premium pass</a>}
    </> : <p className="download-note">Pass activation is available on the database-backed site.</p>}
    {member && <Link className="text-link" href={trackId ? `/downloads/${trackId}` : "/browse"}>{trackId ? "Return to download" : "Browse releases"}</Link>}
  </section></main>;
}
