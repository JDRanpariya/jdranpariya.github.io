-- Additive only: this shares D1 with research without altering research tables.
CREATE TABLE IF NOT EXISTS guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 40),
  message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 175),
  url TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'beige',
  stamp TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('visible', 'held', 'hidden')),
  created_at TEXT NOT NULL,
  ip_day_hash TEXT NOT NULL UNIQUE,
  challenge_id TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS guestbook_visible_idx ON guestbook_entries(status, id DESC);
