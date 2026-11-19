import { notFound } from "next/navigation";
import { listTeam, requireStaff } from "../../../../lib/auth";
import { TeamEditor } from "../../../../components/studio/team-editor";

export const metadata = { title: "Studio team" };

export default async function TeamPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") notFound();
  const team = await listTeam();
  return <main id="main" className="studio-main"><header className="studio-heading"><div><h1>Team</h1><p>Editors can manage their own releases. Administrators manage all releases and staff accounts.</p></div></header>
    <TeamEditor team={team.map(({ created_at, ...user }) => user)} currentId={staff.id}/>
  </main>;
}
