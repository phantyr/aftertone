import { countDownload, sendAsset, trackAsset } from "../../../../../lib/media";
import { InputError } from "../../../../../lib/input.mjs";
import { handleRequest } from "../../../../../lib/request.mjs";
import { getPremium } from "../../../../../lib/premium";
import { getDownloadInfo } from "../../../../../lib/catalog";
import { externalHttpsUrl } from "../../../../../lib/download-policy.mjs";

export const dynamic = "force-dynamic";

export const GET = handleRequest(async (request, { params }) => {
  const { id, mode } = await params;
  if (mode === "free") {
    const track = await getDownloadInfo(id);
    if (!track) throw new InputError("Track not found.", 404);
    if (await getPremium()) return redirectTo(`/api/tracks/${track.id}/download`);
    const destination = externalHttpsUrl(track.free_download_url);
    if (!destination) throw new InputError("Free download link unavailable.", 404);
    if (request.method === "GET") await countDownload(track.id, track.release_id).catch(() => console.error("Aftertone could not record a free download link visit."));
    return redirectTo(destination);
  }
  if (mode !== "download" && mode !== "preview") throw new InputError("Media not found.", 404);
  const download = mode === "download";
  if (download && !await getPremium()) {
    if (!await getDownloadInfo(id)) throw new InputError("Track not found.", 404);
    return redirectTo(`/downloads/${encodeURIComponent(id)}`);
  }
  const asset = await trackAsset(id, download);
  const response = await sendAsset(request, asset, download);
  if (download && request.method === "GET" && response.status === 200) {
    await countDownload(id, asset.release_id).catch(() => console.error("Aftertone could not record a download."));
  }
  return response;
});

export const HEAD = GET;

function redirectTo(location) {
  return new Response(null, { status: 307, headers: { Location: location, "Cache-Control": "private, no-store", Vary: "Cookie", "Referrer-Policy": "no-referrer" } });
}
