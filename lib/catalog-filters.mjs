import { RELEASE_TYPES } from "./input.mjs";

export const RELEASE_ORDERS = {
  latest: "Newest first",
  popular: "Most downloaded",
  oldest: "Oldest first",
  az: "Title A–Z",
};

export const RELEASE_WINDOWS = {
  week: "Last 7 days",
  month: "Last 30 days",
};

const read = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";

export function readCatalogFilters(params) {
  const page = Number(read(params.page, 6));
  return {
    q: read(params.q, 120),
    genre: read(params.genre, 48),
    subgenre: read(params.subgenre, 60),
    label: read(params.label, 90),
    kind: RELEASE_TYPES.includes(params.kind) ? params.kind : "",
    released: typeof params.released === "string" && Object.hasOwn(RELEASE_WINDOWS, params.released) ? params.released : "",
    sort: typeof params.sort === "string" && Object.hasOwn(RELEASE_ORDERS, params.sort) ? params.sort : "latest",
    page: Number.isInteger(page) ? Math.max(1, page) : 1,
  };
}

export function catalogHref(path, filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([key, value]) =>
    value && (key !== "page" || value !== 1) && (key !== "sort" || value !== "latest")));
  return path + (params.size ? `?${params}` : "") + (path === "/" ? "#catalog" : "");
}

export function releaseWindow(released, date = new Date()) {
  const days = released === "week" ? 7 : released === "month" ? 30 : 0;
  if (!days) return [null, null];
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return [start.toISOString().slice(0, 10), date.toISOString().slice(0, 10)];
}
