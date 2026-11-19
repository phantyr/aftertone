import { signIn } from "../../../../lib/auth";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  await signIn(await readJson(request), request);
  return json({ ok: true });
});
