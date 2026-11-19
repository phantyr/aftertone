import { InputError } from "./input.mjs";
import { databaseConfigured } from "./db.mjs";

export function siteOrigin(request) {
  if (process.env.SITE_ORIGIN) return new URL(process.env.SITE_ORIGIN).origin;
  return process.env.NODE_ENV === "development" ? new URL(request.url).origin : null;
}

export function allowWrite(request) {
  if (!databaseConfigured()) throw new InputError("Configure PostgreSQL to use Studio.", 503);
  const origin = siteOrigin(request);
  if (!origin || request.headers.get("origin") !== origin) throw new InputError("This request did not come from Aftertone.", 403);
}

export async function readJson(request) {
  const limit = 128 * 1024;
  const declared = Number(request.headers.get("content-length"));
  if (declared > limit) throw new InputError("Request is too large.", 413);
  if (!request.body) throw new InputError("Send valid JSON.");
  const reader = request.body.getReader();
  try {
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new InputError("Request is too large.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("Send valid JSON.");
  } finally {
    reader.releaseLock();
  }
}

export const json = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export function handleRequest(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof InputError) return json({ error: error.message }, error.status);
      if (error.code === "23505") return json({ error: error.constraint_name === "staff_email_key" ? "That email is already in use." : "That release slug is already in use." }, 409);
      console.error("Aftertone request failed:", error.code || error.name);
      return json({ error: "The request failed. Check the server logs and try again." }, 500);
    }
  };
}
