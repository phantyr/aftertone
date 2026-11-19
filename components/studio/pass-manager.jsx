"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PASS_DAYS } from "../../lib/download-policy.mjs";
import { send } from "./requests";

export function PassManager({ passes }) {
  const router = useRouter();
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(input) {
    setBusy(true);
    setError("");
    try {
      const result = await send("/api/studio/passes", input);
      if (result.code) setIssued({ holder: input.holder, code: result.code });
      else setIssued(null);
      router.refresh();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <>
    <section className="studio-panel"><header><h2>Issue a pass</h2></header>
      <form className="studio-form" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        submit({ action: "issue", holder: data.get("holder"), days: Number(data.get("days")) });
      }}>
        <div className="field-grid two">
          <label>Member name or reference<input name="holder" required maxLength={120}/></label>
          <label>Valid from today<select name="days" defaultValue="30">{PASS_DAYS.map((days) => <option key={days} value={days}>{days} days</option>)}</select></label>
        </div>
        <button type="submit" disabled={busy} className="button solid">Issue Premium pass</button>
        {issued && <label role="status">Pass for {issued.holder}<input readOnly value={issued.code} onFocus={(event) => event.target.select()}/><small>Copy it now and send it privately. The listener can activate it at /premium.</small></label>}
      </form>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="studio-panel"><header><h2>Issued passes</h2></header>
      {!passes.length ? <p className="studio-empty">No Premium passes issued yet.</p> : <div className="table-scroll"><table className="studio-table">
        <thead><tr><th>Member</th><th>Expires (UTC)</th><th>Status</th><th>Access</th></tr></thead>
        <tbody>{passes.map((pass) => <tr key={pass.id}><td>{pass.holder}</td><td>{pass.expiry}</td><td>{pass.status}</td><td>
          {pass.status === "Active" && <button type="button" disabled={busy} className="button outline" onClick={() => {
            if (window.confirm(`Revoke Premium access for ${pass.holder}?`)) submit({ action: "revoke", id: pass.id });
          }}>Revoke</button>}</td></tr>)}</tbody>
      </table></div>}
    </section>
  </>;
}
