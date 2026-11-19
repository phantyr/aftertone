// These links are set by staff and may contain provider-specific query parameters.
export function externalHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

export const PASS_DAYS = [7, 30, 90, 365];
