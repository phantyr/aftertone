import { staffForWrite } from "../../../../../lib/auth";
import { saveRelease } from "../../../../../lib/studio";
import { allowWrite, handleRequest, json, readJson } from "../../../../../lib/request.mjs";

export const PUT = handleRequest(async (request, { params }) => {
  allowWrite(request);
  const { id } = await params;
  return json(await saveRelease(await staffForWrite(), id, await readJson(request)));
});
