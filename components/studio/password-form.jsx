"use client";

import { useState } from "react";
import { send } from "./requests";

export function ChangePasswordForm() {
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.newPassword !== data.confirmPassword) {
      setFeedback({ error: true, message: "The new passwords don’t match." });
      return;
    }
    setWorking(true);
    setFeedback(null);
    try {
      await send("/api/auth/password", { currentPassword: data.currentPassword, newPassword: data.newPassword });
      setFeedback({ message: "Password updated. Other sessions were signed out." });
      form.reset();
    } catch (failure) {
      setFeedback({ error: true, message: failure.message });
    } finally {
      setWorking(false);
    }
  }
  return <form className="studio-form team-form" onSubmit={submit}>
    <label>Current password<input type="password" name="currentPassword" autoComplete="current-password" maxLength={128} required/></label>
    <label>New password<input type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={128} required/></label>
    <label>Confirm new password<input type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={128} required/></label>
    {feedback && <p className={feedback.error ? "form-error" : "form-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
    <button className="button solid" type="submit" disabled={working}>{working ? "Saving…" : "Change password"}</button>
  </form>;
}
