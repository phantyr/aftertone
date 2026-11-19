import Link from "next/link";
import { Download, FileText, Globe, Library, Plus } from "lucide-react";
import { requireStaff } from "../../../lib/auth";
import { studioActivity, studioList, studioStats } from "../../../lib/studio";
import { ActivityTable, ReleaseTable } from "../../../components/studio/tables";

export const metadata = { title: "Studio overview" };

export default async function StudioPage() {
  const staff = await requireStaff();
  const [stats, recent, activity] = await Promise.all([studioStats(staff), studioList(staff, { size: 6 }), studioActivity(staff, 5)]);
  const metrics = [
    ["Total releases", stats.total, Library], ["Published", stats.live, Globe],
    ["Drafts", stats.drafts, FileText], ["Downloads", stats.downloads, Download],
  ];
  return <main id="main" className="studio-main">
    <header className="studio-heading"><div><h1>Studio overview</h1><p>Manage your releases and track downloads.</p></div><Link className="button solid" href="/studio/releases/new"><Plus size={18}/> New release</Link></header>
    <div className="metrics">{metrics.map(([label, value, Icon]) => <div className="metric" key={label}><span className="metric-icon"><Icon size={19}/></span><span>{label}</span><strong>{Number(value).toLocaleString()}</strong></div>)}</div>
    <section className="studio-panel"><header><h2>Recent releases</h2><Link className="text-link" href="/studio/releases">All releases</Link></header><ReleaseTable rows={recent.rows}/></section>
    <section className="studio-panel"><header><h2>Recent activity</h2><Link className="text-link" href="/studio/activity">View activity</Link></header><ActivityTable rows={activity}/></section>
  </main>;
}
