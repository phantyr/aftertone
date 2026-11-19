import { staffForWrite } from "../../../../lib/auth";
import { saveRelease } from "../../../../lib/studio";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  return json(await saveRelease(await staffForWrite(), null, await readJson(request)), 201);
});
