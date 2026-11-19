"use client";

import { useEffect, useState } from "react";
import { useListener } from "./listener";
import { EmptyPanel, ReleaseGrid } from "./releases";

export function SavedCatalog() {
  const { saved, ready } = useListener();
  const key = saved.join(",");
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!ready || !key) return;
    const controller = new AbortController();
    fetch(`/api/saved?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Saved releases couldn’t load.");
        return response.json();
      })
      .then((releases) => setResult({ key, releases }))
      .catch((error) => { if (error.name !== "AbortError") setResult({ key, error: true }); });
    return () => controller.abort();
  }, [key, ready]);

  if (!ready || (key && result?.key !== key)) return <p className="results-count" role="status">Loading collection…</p>;
  if (key && result?.error) return <EmptyPanel title="Your collection couldn’t load" description="Reload the page to try again."/>;
  const items = key ? saved.map((id) => result.releases.find((release) => release.id === id)).filter(Boolean) : [];
  return items.length ? <ReleaseGrid releases={items}/> :
    <EmptyPanel title="Your collection is empty" description="Save a release using the heart icon." href="/browse" action="Browse music"/>;
}
