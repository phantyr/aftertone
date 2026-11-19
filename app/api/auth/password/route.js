import { changePassword } from "../../../../lib/auth";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  await changePassword(await readJson(request));
  return json({ ok: true });
});
