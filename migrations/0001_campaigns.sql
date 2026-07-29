PRAGMA foreign_keys = ON;

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  owner_token_hash TEXT NOT NULL,
  creator_session_id TEXT NOT NULL,
  pet_name TEXT NOT NULL DEFAULT '',
  pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat', 'bird', 'small', 'other')),
  lost_date TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  municipality TEXT NOT NULL,
  color TEXT NOT NULL,
  features TEXT NOT NULL,
  caution TEXT NOT NULL DEFAULT '',
  photo_key TEXT NOT NULL,
  photo_mime TEXT NOT NULL CHECK (photo_mime = 'image/webp'),
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'closed', 'hidden')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX campaigns_creator_day_idx
  ON campaigns (creator_session_id, created_at);

CREATE INDEX campaigns_expiry_idx
  ON campaigns (status, expires_at);

CREATE TABLE sightings (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  reporter_session_id TEXT NOT NULL,
  seen_at TEXT NOT NULL,
  area TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT '',
  behavior TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
);

CREATE INDEX sightings_campaign_idx
  ON sightings (campaign_id, created_at DESC);

CREATE INDEX sightings_reporter_day_idx
  ON sightings (reporter_session_id, created_at);

CREATE TABLE reports (
  campaign_id TEXT NOT NULL,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('personal', 'false', 'unsafe')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (campaign_id, reporter_session_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
);

CREATE INDEX reports_created_idx ON reports (created_at);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX product_events_day_idx
  ON product_events (occurred_on, name);

CREATE INDEX product_events_session_idx
  ON product_events (session_id, created_at);
