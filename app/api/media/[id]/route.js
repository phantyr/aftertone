import { getStaff } from "../../../../lib/auth";
import { sendAsset, visibleAsset } from "../../../../lib/media";
import { handleRequest } from "../../../../lib/request.mjs";

export const dynamic = "force-dynamic";

export const GET = handleRequest(async (request, { params }) => {
  const { id } = await params;
  return sendAsset(request, await visibleAsset(id, await getStaff()));
});

export const HEAD = GET;
