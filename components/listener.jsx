"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AudioLines, Heart, ListMusic, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";

const Listener = createContext(null);
const SAVE_KEY = "aftertone-saved-v2";
const VOLUME_KEY = "aftertone-volume";

function timeLabel(seconds) {
  const n = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

export function useListener() {
  return useContext(Listener);
}

export function ListenerProvider({ children }) {
  const audio = useRef(null);
  const current = useRef(null);
  const volumeBeforeMute = useRef(0.7);
  const [track, setTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showQueue, setShowQueue] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const decoded = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
      if (Array.isArray(decoded)) setSaved(decoded.filter((id) => typeof id === "string").slice(0, 100));
      const preference = localStorage.getItem(VOLUME_KEY);
      if (preference !== null) {
        const level = Number(preference);
        if (Number.isFinite(level) && level >= 0 && level <= 1) setVolume(level);
      }
    } catch { /* Playback remains available when browser storage is disabled. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
    if (ready) {
      try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* optional preference */ }
    }
  }, [volume, ready]);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* optional preference */ }
    }
  }, [saved, ready]);

  function toggleSaved(id) {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [id, ...items].slice(0, 100));
  }

  async function play(next, playlist, toggle = false) {
    if (!next?.preview || !audio.current) return;
    const element = audio.current;
    if (playlist?.length) setQueue(playlist.filter((item) => item?.preview));
    if (current.current?.id !== next.id) {
      current.current = next;
      setTrack(next);
      setPlaying(false);
      setDuration(0);
      setElapsed(0);
      element.src = next.preview;
    } else if (toggle && !element.paused) {
      element.pause();
      return;
    }
    setError(false);
    try {
      await element.play();
    } catch (failure) {
      if (failure.name !== "AbortError" && current.current?.id === next.id) setError(true);
    }
  }

  const index = queue.findIndex((item) => item.id === track?.id);
  const previous = () => {
    if (audio.current.currentTime > 3 || index < 1) {
      audio.current.currentTime = 0;
      setElapsed(0);
    } else play(queue[index - 1]);
  };
  const next = () => {
    if (index >= 0 && index < queue.length - 1) play(queue[index + 1]);
  };

  function mute() {
    if (volume) {
      volumeBeforeMute.current = volume;
      setVolume(0);
    } else setVolume(volumeBeforeMute.current);
  }

  function stop() {
    const element = audio.current;
    current.current = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
    setTrack(null);
    setPlaying(false);
    setElapsed(0);
    setDuration(0);
    setShowQueue(false);
    setError(false);
    setQueue([]);
  }

  return <Listener.Provider value={{ track, playing, play, saved, toggleSaved, ready }}>
    {children}
    <audio ref={audio} preload="none"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onEnded={() => { setPlaying(false); next(); }}
      onError={() => { if (current.current) setError(true); }}
      onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
      onDurationChange={(event) => { const value = event.currentTarget.duration; setDuration(Number.isFinite(value) ? value : 0); }}
    />
    {showQueue && <aside className="queue-panel" aria-label="Play queue">
      <div className="queue-title"><h2>Play queue</h2><button className="icon-button" aria-label="Close queue" type="button" onClick={() => setShowQueue(false)}><X size={18}/></button></div>
      {queue.map((item, i) => <button type="button" key={item.id} className="queue-item" onClick={() => play(item)} aria-current={track?.id === item.id ? "true" : undefined}>
        <span>{String(i + 1).padStart(2, "0")}</span><img src={item.cover} alt="" width="39" height="39"/>
        <span><strong>{item.title}</strong><small>{item.artist}</small></span><Play size={14}/>
      </button>)}
    </aside>}
    <aside className="listening-deck" aria-label="Audio player">
      <div className="deck-track">
        {track ? <Link href={`/releases/${track.releaseSlug}`} className="deck-art"><img src={track.cover} width="43" height="43" alt=""/></Link>
          : <span className="deck-art idle"><AudioLines size={20}/></span>}
        <div>{track ? <Link href={`/releases/${track.releaseSlug}`}>{track.title}</Link> : <strong>Aftertone player</strong>}
          <small>{error ? "This preview couldn’t load" : track?.artist || "Pick a track to listen"}</small></div>
      </div>
      <div className="deck-main">
        <div className="deck-transport">
          <button className="icon-button" type="button" disabled={!track} onClick={previous} aria-label="Previous track"><SkipBack size={17}/></button>
          <button className="deck-play" type="button" disabled={!track} onClick={() => play(track, undefined, true)} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? <Pause size={17} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button>
          <button className="icon-button" type="button" disabled={index < 0 || index >= queue.length - 1} onClick={next} aria-label="Next track"><SkipForward size={17}/></button>
        </div>
        <div className="deck-timeline">
          <span>{timeLabel(elapsed)}</span>
          <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(elapsed, duration)} disabled={!duration} aria-label="Playback position"
            onChange={(event) => { const value = Number(event.target.value); audio.current.currentTime = value; setElapsed(value); }}/>
          <span>{timeLabel(duration)}</span>
        </div>
      </div>
      <div className="deck-tools">
        <button className="icon-button" type="button" onClick={() => setShowQueue(!showQueue)} disabled={!queue.length} aria-label="Play queue" aria-expanded={showQueue}><ListMusic size={19}/></button>
        <button className="icon-button deck-mute" type="button" onClick={mute} aria-label={volume ? "Mute audio" : "Unmute audio"}>{volume ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
        <input className="deck-volume" type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={(event) => setVolume(Number(event.target.value))}/>
        {track && <button className="icon-button deck-close" type="button" aria-label="Clear track" onClick={stop}><X size={17}/></button>}
      </div>
    </aside>
  </Listener.Provider>;
}

export function PlayButton({ track, playlist, className = "button solid", iconOnly = false, children = "Play preview" }) {
  const player = useListener();
  if (!track?.preview) return null;
  const active = player.track?.id === track.id && player.playing;
  const Icon = active ? Pause : Play;
  return <button type="button" className={className} onClick={() => player.play(track, playlist || [track], true)} aria-label={`${active ? "Pause" : "Play"} ${track.title}`}>
    <Icon size={iconOnly ? 17 : 16} fill="currentColor" aria-hidden="true"/>{!iconOnly && (active ? "Pause preview" : children)}
  </button>;
}

export function SaveButton({ release, iconOnly = true }) {
  const { saved, toggleSaved } = useListener();
  const active = saved.includes(release.id);
  return <button type="button" className={iconOnly ? "icon-button save-icon" : "button outline"} aria-label={`${active ? "Remove" : "Save"} ${release.title}`} aria-pressed={active} onClick={() => toggleSaved(release.id)}>
    <Heart size={17} fill={active ? "currentColor" : "none"} aria-hidden="true"/>{!iconOnly && (active ? "Saved" : "Save release")}
  </button>;
}
