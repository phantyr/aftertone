import { activatePass, leavePremium } from "../../../../lib/premium";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  await activatePass(await readJson(request), request);
  return json({ ok: true });
});

export const DELETE = handleRequest(async (request) => {
  allowWrite(request);
  await leavePremium();
  return json({ ok: true });
});
