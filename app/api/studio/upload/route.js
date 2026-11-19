import { staffForWrite } from "../../../../lib/auth";
import { saveUpload } from "../../../../lib/media";
import { allowWrite, handleRequest, json } from "../../../../lib/request.mjs";

export const POST = handleRequest(async (request) => {
  allowWrite(request);
  return json(await saveUpload(request, await staffForWrite()), 201);
});
