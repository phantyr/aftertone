"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { send } from "./requests";

function AccountForm({ account, isCurrent, onDone }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    setWorking(true);
    setError("");
    try {
      await send("/api/studio/team", {
        id: account?.id, name: data.name, email: data.email, password: data.password,
        role: isCurrent ? account.role : data.role, active: isCurrent || form.has("active"),
      });
      onDone(account ? "Account updated." : "Staff account created.");
    } catch (failure) {
      setError(failure.message);
      setWorking(false);
    }
  }
  return <form className="studio-form team-form" onSubmit={submit}>
    <label>Name<input name="name" required maxLength={100} defaultValue={account?.name}/></label>
    <label>Email<input name="email" type="email" required maxLength={254} defaultValue={account?.email} autoComplete="off"/></label>
    <label>Role<select name="role" defaultValue={account?.role || "editor"} disabled={isCurrent}><option value="editor">Editor</option><option value="admin">Administrator</option></select></label>
    <label>{account ? "New password" : "Temporary password"}<input name="password" type="password" minLength={12} maxLength={128} required={!account} autoComplete="new-password"/>{account && <small>Leave blank to keep the current password.</small>}</label>
    <label className="checkbox"><input type="checkbox" name="active" defaultChecked={account?.active ?? true} disabled={isCurrent}/> Account active</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button solid" type="submit" disabled={working}>{working ? "Saving…" : account ? "Save account" : "Create account"}</button>
  </form>;
}

export function TeamEditor({ team, currentId }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const account = team.find((item) => item.id === selected);
  function done(message) {
    setNotice(message);
    setFormVersion((value) => value + 1);
    router.refresh();
  }
  return <div className="team-layout">
    <section className="studio-panel"><header><h2>Staff accounts</h2><button type="button" className="button outline" onClick={() => { setSelected(null); setNotice(""); }}><UserPlus size={17}/> Add staff</button></header>
      <div className="table-scroll"><table className="studio-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>
      {team.map((item) => <tr key={item.id}><td><strong>{item.name}{item.id === currentId ? " (you)" : ""}</strong><small>{item.email}</small></td><td>{item.role === "admin" ? "Administrator" : "Editor"}</td>
        <td><span className={`status-pill ${item.active ? "published" : "archived"}`}>{item.active ? "Active" : "Inactive"}</span></td>
        <td><button className="icon-button" type="button" onClick={() => { setSelected(item.id); setNotice(""); }} aria-label={`Edit ${item.name}`}><Pencil size={16}/></button></td></tr>)}
      </tbody></table></div></section>
    <section className="studio-panel"><header><h2>{account ? "Edit account" : "Add a staff member"}</h2></header>
      {notice && <p className="form-success padded-notice" role="status">{notice}</p>}
      <AccountForm key={`${selected || "new"}:${formVersion}:${account?.name}:${account?.active}`} account={account} isCurrent={account?.id === currentId} onDone={done}/>
    </section>
  </div>;
}
