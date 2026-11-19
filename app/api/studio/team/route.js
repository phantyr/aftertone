import { saveTeamMember, staffForWrite } from "../../../../lib/auth";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  return json({ id: await saveTeamMember(await staffForWrite(true), await readJson(request)) });
});
