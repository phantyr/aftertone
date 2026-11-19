"use client";

import { useState } from "react";
import { send } from "./studio/requests";

export function PremiumAccess({ active, trackId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const code = new FormData(event.currentTarget).get("code");
    setBusy(true);
    setError("");
    try {
      await send("/api/premium/session", { code }, active ? "DELETE" : "POST");
      window.location.assign(trackId && !active ? `/downloads/${encodeURIComponent(trackId)}` : "/premium");
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }
  return <form className="pass-form" onSubmit={submit}>
    {!active && <label>Premium pass<input name="code" type="password" autoComplete="off" spellCheck={false} maxLength={64} placeholder="EDM-…" required/></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button disabled={busy} className={`button ${active ? "outline" : "solid"}`}>{busy ? "Please wait…" : active ? "Sign out of Premium" : "Activate on this device"}</button>
  </form>;
}
