import Link from "next/link";
import { ArrowLeft, Database, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getStaff } from "../../../lib/auth";
import { databaseConfigured } from "../../../lib/db.mjs";
import { Logo } from "../../../components/navigation";
import { SignIn } from "../../../components/studio/auth-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio sign-in" };

export default async function SignInPage() {
  if (await getStaff()) redirect("/studio");
  const setup = !databaseConfigured();
  return <main id="main" className="sign-in-page">
    <div className="sign-in-top"><Logo studio/><Link className="text-link" href="/"><ArrowLeft size={16}/> Back to Aftertone</Link></div>
    <section className="sign-in-card">
      <span className="sign-in-icon"><ShieldCheck size={27} aria-hidden="true"/></span>
      <h1>Sign in to Studio</h1><p>Publish releases and manage the Aftertone catalog.</p>
      {setup ? <div className="notice" role="status"><Database size={20}/><div><strong>PostgreSQL setup required</strong><p>Copy the example environment file, migrate your database, and create the first admin using the README.</p></div></div> : <SignIn/>}
    </section>
  </main>;
}
