import { requireStaff } from "../../../../lib/auth";
import { ChangePasswordForm } from "../../../../components/studio/password-form";

export const metadata = { title: "Studio account" };

export default async function AccountPage() {
  const user = await requireStaff();
  return <main id="main" className="studio-main">
    <header className="studio-heading"><div><h1>My account</h1><p>{user.email}</p></div></header>
    <section className="studio-panel account-panel"><header><h2>Change password</h2></header><ChangePasswordForm/></section>
  </main>;
}
