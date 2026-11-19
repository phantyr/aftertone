import { signOut } from "../../../../lib/auth";
import { allowWrite, handleRequest, json } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  await signOut();
  return json({ ok: true });
});
