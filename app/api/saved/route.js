import { getSaved } from "../../../lib/catalog";
import { handleRequest, json } from "../../../lib/request.mjs";

export const dynamic = "force-dynamic";

export const GET = handleRequest(async (request) => {
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").slice(0, 100) || [];
  return json(await getSaved(ids));
});
