"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, AudioLines, Disc3, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { RELEASE_TYPES } from "../../lib/input.mjs";
import { send, uploadFile } from "./requests";

const COVER_TYPES = ".jpg,.jpeg,.png,.webp";
const AUDIO_TYPES = ".mp3,.wav,.flac,.ogg,.opus,.m4a";

function AssetControl({ value, onChange, label, kind }) {
  const inputTypes = kind === "cover" ? COVER_TYPES : AUDIO_TYPES;
  const Icon = kind === "cover" ? ImagePlus : AudioLines;
  const [preview, setPreview] = useState("");
  const file = value?.file;
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const source = file ? preview : value?.id && `/api/media/${value.id}`;
  const artwork = kind === "cover" && source;

  return <div className={`asset-control ${kind}`}>
    <span className="asset-type">{label}</span>
    <div className="asset-row">
      {artwork ? <img src={artwork} alt="" width="64" height="64"/> : <Icon size={24} aria-hidden="true"/>}
      <div className="asset-caption"><strong>{value?.name || (kind === "cover" ? "Choose artwork" : "Choose audio")}</strong>
        <small>{kind === "cover" ? "JPG, PNG, WebP · up to 15 MB" : "MP3, WAV, FLAC, Ogg, Opus, M4A · up to 120 MB"}</small></div>
      <label className="button outline asset-picker"><Upload size={16}/><span>{value ? "Replace" : "Choose"}</span>
        <input type="file" accept={inputTypes} aria-label={`${value ? "Replace" : "Choose"} ${label.toLowerCase()}`} onChange={(event) => {
          const next = event.target.files?.[0];
          if (next) onChange({ file: next, name: next.name });
          event.target.value = "";
        }}/>
      </label>
      {value && <button type="button" className="icon-button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(null)}><Trash2 size={16}/></button>}
    </div>
    {kind === "audio" && source && <audio className="studio-audio" controls preload="none" src={source} aria-label={`Listen to ${label.toLowerCase()}`}/>}
  </div>;
}

function TrackEditor({ value, index, size, update, move, remove }) {
  return <div className="track-editor">
    <header><h3><span>{String(index + 1).padStart(2, "0")}</span> {value.title || "Untitled track"}</h3><div className="track-tools">
      <button className="icon-button" type="button" aria-label={`Move track ${index + 1} up`} onClick={() => move(-1)} disabled={index === 0}><ArrowUp size={17}/></button>
      <button className="icon-button" type="button" aria-label={`Move track ${index + 1} down`} onClick={() => move(1)} disabled={index === size - 1}><ArrowDown size={17}/></button>
      <button className="icon-button" type="button" aria-label={`Remove track ${index + 1}`} onClick={remove}><Trash2 size={17}/></button>
    </div></header>
    <div className="field-grid">
      <label>Track title<input value={value.title} onChange={(event) => update({ title: event.target.value })} maxLength={160} required/></label>
      <label>Track artist <small>Optional</small><input value={value.artist} onChange={(event) => update({ artist: event.target.value })} maxLength={120}/></label>
      <label>Duration (seconds) <small>Optional</small><input type="number" min="1" max="86400" value={value.durationSeconds || ""} onChange={(event) => update({ durationSeconds: event.target.value })}/></label>
      <label>Free download link<input type="url" maxLength={2048} placeholder="https://…" value={value.freeDownloadUrl || ""} onChange={(event) => update({ freeDownloadUrl: event.target.value })}/><small>Paste this track’s pay-per-download host link. Leave blank for Premium access only.</small></label>
    </div>
    <AssetControl label="Premium download file" kind="audio" value={value.audio} onChange={(audio) => update({ audio })}/>
    <AssetControl label="Public preview clip (optional)" kind="audio" value={value.preview} onChange={(preview) => update({ preview })}/>
  </div>;
}

export function ReleaseEditor({ genres, initial, admin }) {
  const router = useRouter();
  const [cover, setCover] = useState(initial.cover || null);
  const [tracks, setTracks] = useState((initial.tracks || []).map((track) => ({ ...track, key: track.id })));
  const [status, setStatus] = useState(initial.status || "draft");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  function updateTrack(key, values) {
    setTracks((current) => current.map((track) => track.key === key ? { ...track, ...values } : track));
  }
  function addTrack() {
    setTracks((current) => [...current, { key: globalThis.crypto?.randomUUID?.() || String(Date.now()), title: "", artist: "", audio: null, preview: null }]);
  }
  function moveTrack(index, direction) {
    setTracks((current) => {
      const next = [...current];
      const destination = index + direction;
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  async function preparedAsset(asset, kind, update, caption) {
    if (!asset?.file) return asset?.id || null;
    setWorking(`Uploading ${caption}…`);
    const result = await uploadFile(asset.file, kind);
    update(result);
    return result.id;
  }

  async function submit(event) {
    event.preventDefault();
    if (working) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    if (status === "published" && (!cover || tracks.length === 0)) {
      setError("Add cover art and at least one track before publishing.");
      return;
    }
    if (tracks.some((track) => !track.audio)) {
      setError("Choose a download file for each track.");
      return;
    }

    setWorking("Preparing release…");
    try {
      const coverId = await preparedAsset(cover, "cover", setCover, "cover art");
      const listing = [];
      for (const [index, track] of tracks.entries()) {
        const audioId = await preparedAsset(track.audio, "audio", (audio) => updateTrack(track.key, { audio }), `track ${index + 1}`);
        const previewId = await preparedAsset(track.preview, "audio", (preview) => updateTrack(track.key, { preview }), `preview ${index + 1}`);
        listing.push({ id: track.id, title: track.title, artist: track.artist, durationSeconds: Number(track.durationSeconds) || null, audioId, previewId, freeDownloadUrl: track.freeDownloadUrl || "" });
      }
      setWorking("Saving release…");
      const target = initial.id ? `/api/studio/releases/${initial.id}` : "/api/studio/releases";
      const result = await send(target, {
        ...data, coverId, tracks: listing, status, featured: data.featured === "on",
        slug: initial.slug || data.slug, revision: initial.revision,
      }, initial.id ? "PUT" : "POST");
      if (initial.id) window.location.reload();
      else { router.replace(`/studio/releases/${result.id}`); router.refresh(); }
    } catch (failure) {
      setError(failure.message);
      setWorking("");
    }
  }

  return <form className="release-editor" onSubmit={submit}>
    <fieldset disabled={Boolean(working)} className="editor-grid">
      <div className="editor-primary">
        <section className="studio-panel"><header><h2>Release details</h2></header>
          <div className="studio-form">
            <div className="field-grid two">
              <label>Title<input name="title" defaultValue={initial.title} required maxLength={140}/></label>
              <label>Artist<input name="artist" defaultValue={initial.artist} required maxLength={120}/></label>
              <label>Genre<input name="genre" defaultValue={initial.genre} list="genres" required maxLength={48}/></label>
              <datalist id="genres">{genres.map((genre) => <option key={genre} value={genre}/>)}</datalist>
              <label>Subgenre <small>Optional</small><input name="subgenre" defaultValue={initial.subgenre} maxLength={60}/></label>
              <label>Release type<select name="kind" defaultValue={initial.kind || "Single"}>{RELEASE_TYPES.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
              <label>Record label <small>Optional</small><input name="label" defaultValue={initial.label} maxLength={90}/></label>
              <label>Release date<input name="date" type="date" defaultValue={initial.date} required/></label>
            </div>
            <label>Short description <small>Optional</small><input name="summary" defaultValue={initial.summary} maxLength={220}/></label>
            <label>Release notes <small>Optional</small><textarea name="description" defaultValue={initial.description} maxLength={10000} rows={5}/></label>
          </div>
        </section>
        <section className="studio-panel"><header><h2>Tracklist</h2><button className="button outline" type="button" disabled={tracks.length >= 50} onClick={addTrack}><Plus size={17}/> Add track</button></header>
          <div className="editor-tracks">{tracks.length ? tracks.map((track, index) => <TrackEditor key={track.key} value={track} index={index} size={tracks.length}
            update={(values) => updateTrack(track.key, values)} move={(direction) => moveTrack(index, direction)} remove={() => setTracks((current) => current.filter((item) => item.key !== track.key))}/>)
            : <div className="studio-empty"><Disc3 size={27}/><p>Add a track when your audio is ready.</p></div>}</div>
        </section>
      </div>
      <div className="editor-aside">
        <section className="studio-panel"><header><h2>Artwork</h2></header><div className="studio-form"><AssetControl label="Cover art" kind="cover" value={cover} onChange={setCover}/></div></section>
        <section className="studio-panel"><header><h2>Publishing</h2></header><div className="studio-form">
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="draft">Draft</option><option value="published">Published</option>{initial.id && <option value="archived">Archived</option>}
          </select></label>
          <label>Release URL slug<input name="slug" defaultValue={initial.slug} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(initial.id)} placeholder="Generated from title"/><small>{initial.id ? "The URL stays the same when you edit the release." : "Leave blank to generate it from the title."}</small></label>
          {admin && <label className="checkbox"><input type="checkbox" name="featured" defaultChecked={initial.featured} disabled={status !== "published"}/> Featured on Discover</label>}
        </div></section>
      </div>
    </fieldset>
    <div className="editor-save">
      {error && <p className="form-error" role="alert">{error}</p>}
      {working && <p className="form-success" role="status">{working}</p>}
      <button className="button solid" type="submit" disabled={Boolean(working)}>{working ? "Saving…" : status === "published" && initial.status !== "published" ? "Publish release" : status === "archived" && initial.status !== "archived" ? "Archive release" : initial.id ? "Save changes" : "Save draft"}</button>
    </div>
  </form>;
}
