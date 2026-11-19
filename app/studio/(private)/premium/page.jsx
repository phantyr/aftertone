import { notFound } from "next/navigation";
import { requireStaff } from "../../../../lib/auth";
import { listPasses } from "../../../../lib/premium";
import { PassManager } from "../../../../components/studio/pass-manager";

export const metadata = { title: "Premium passes" };

export default async function StudioPremium() {
  const actor = await requireStaff();
  if (actor.role !== "admin") notFound();
  const passes = await listPasses();
  return <main id="main" className="studio-main">
    <header className="studio-heading"><div><h1>Premium passes</h1><p>Give a listener time-limited access to direct, ad-free downloads.</p></div></header>
    <PassManager passes={passes.map(({ expires_at, ...pass }) => ({ ...pass, expiry: new Date(expires_at).toISOString().slice(0, 10) }))}/>
  </main>;
}
