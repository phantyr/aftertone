"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { send } from "./requests";

export function SignIn() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await send("/api/auth/sign-in", { email: fields.get("email"), password: fields.get("password") });
      window.location.assign("/studio");
    } catch (failure) {
      setError(failure.message);
      setWorking(false);
    }
  }
  return <form className="auth-form" onSubmit={submit}>
    <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button solid" type="submit" disabled={working}>{working ? "Signing in…" : "Sign in"}</button>
  </form>;
}

export function SignOut() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function click() {
    setWorking(true);
    setError("");
    try {
      await send("/api/auth/sign-out", {});
      window.location.assign("/studio/sign-in");
    } catch (failure) {
      setError(failure.message);
      setWorking(false);
    }
  }
  return <><button type="button" className="button outline sign-out" onClick={click} disabled={working}><LogOut size={16}/><span>{working ? "Signing out…" : "Sign out"}</span></button>
    {error && <p className="form-error" role="alert">{error}</p>}</>;
}
