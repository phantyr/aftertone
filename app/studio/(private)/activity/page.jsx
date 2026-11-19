import { requireStaff } from "../../../../lib/auth";
import { studioActivity } from "../../../../lib/studio";
import { ActivityTable } from "../../../../components/studio/tables";

export const metadata = { title: "Studio activity" };

export default async function ActivityPage() {
  const staff = await requireStaff();
  const rows = await studioActivity(staff, 100);
  return <main id="main" className="studio-main"><header className="studio-heading"><div><h1>Activity</h1><p>Recent release and staff account changes.</p></div></header>
    <section className="studio-panel"><header><h2>Activity history</h2></header><ActivityTable rows={rows}/></section>
  </main>;
}
