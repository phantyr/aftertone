ALTER TABLE tracks ADD COLUMN free_download_url text NOT NULL DEFAULT ''
  CHECK (char_length(free_download_url) <= 2048);

-- Bundled demos have short public excerpts. Uploaded masters are never previews.
CREATE VIEW track_public_previews AS
SELECT t.id AS track_id, coalesce(p.id, a.id) AS asset_id
FROM tracks t
JOIN media_assets a ON a.id=t.audio_id
LEFT JOIN media_assets p ON p.id=t.preview_id AND p.kind='audio'
  AND NOT EXISTS (SELECT 1 FROM tracks master WHERE master.audio_id=p.id)
WHERE p.id IS NOT NULL OR a.storage='demo';

CREATE TABLE premium_passes (
  id uuid PRIMARY KEY,
  holder text NOT NULL,
  code_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE premium_sessions (
  token_hash text PRIMARY KEY,
  pass_id uuid NOT NULL REFERENCES premium_passes(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX premium_sessions_expiry_idx ON premium_sessions (expires_at);
