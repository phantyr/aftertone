import { staffForWrite } from "../../../../lib/auth";
import { managePass } from "../../../../lib/premium";
import { allowWrite, handleRequest, json, readJson } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  return json(await managePass(await staffForWrite(true), await readJson(request)));
});
