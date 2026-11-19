CREATE TABLE staff (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX staff_sessions_staff_idx ON staff_sessions (staff_id);
CREATE INDEX staff_sessions_expiry_idx ON staff_sessions (expires_at);

CREATE TABLE login_limits (
  email text PRIMARY KEY,
  attempts integer NOT NULL,
  closes_at timestamptz NOT NULL
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES staff(id),
  kind text NOT NULL CHECK (kind IN ('cover', 'audio')),
  storage text NOT NULL CHECK (storage IN ('local', 'demo')),
  storage_key text NOT NULL UNIQUE,
  name text NOT NULL,
  mime text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE releases (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES staff(id),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL,
  artist text NOT NULL,
  genre text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('Single', 'EP', 'Album', 'VA')),
  label text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  release_date date NOT NULL,
  cover_id uuid REFERENCES media_assets(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured boolean NOT NULL DEFAULT false CHECK (NOT featured OR status = 'published'),
  demo boolean NOT NULL DEFAULT false,
  downloads bigint NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE UNIQUE INDEX releases_one_featured_idx ON releases (featured) WHERE featured;
CREATE INDEX releases_public_date_idx ON releases (release_date DESC, id) WHERE status = 'published';
CREATE INDEX releases_public_genre_idx ON releases (genre, release_date DESC) WHERE status = 'published';
CREATE INDEX releases_public_downloads_idx ON releases (downloads DESC, release_date DESC) WHERE status = 'published';
CREATE INDEX releases_owner_idx ON releases (owner_id, updated_at DESC);
CREATE INDEX releases_cover_idx ON releases (cover_id);

CREATE TABLE tracks (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  audio_id uuid NOT NULL REFERENCES media_assets(id),
  preview_id uuid REFERENCES media_assets(id),
  duration_seconds integer CHECK (duration_seconds > 0),
  downloads bigint NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  UNIQUE (release_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX tracks_audio_idx ON tracks (audio_id);
CREATE INDEX tracks_preview_idx ON tracks (preview_id);

CREATE TABLE studio_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES staff(id),
  action text NOT NULL,
  target_id uuid,
  target_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_activity_actor_idx ON studio_activity (actor_id, id DESC);
