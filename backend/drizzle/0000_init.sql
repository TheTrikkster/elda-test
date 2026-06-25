-- PostGIS DDL kept hand-authored on purpose: the spatial extension, the
-- geometry column typing (SRID 4326) and the GiST indexes are exactly where an
-- ORM's abstractions are too thin. The application-level spatial logic then
-- runs in the database through ST_* functions (see ZonesService).

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS machines (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  id           BIGSERIAL PRIMARY KEY,
  machine_id   TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  geom         geometry(Point, 4326) NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  geom  geometry(Polygon, 4326) NOT NULL
);

-- Spatial index for ST_Within / ST_Intersection lookups.
CREATE INDEX IF NOT EXISTS positions_geom_gist ON positions USING GIST (geom);
CREATE INDEX IF NOT EXISTS zones_geom_gist     ON zones     USING GIST (geom);

-- Fast "latest position per machine" via DISTINCT ON (machine_id) ORDER BY ... DESC.
CREATE INDEX IF NOT EXISTS positions_machine_recorded
  ON positions (machine_id, recorded_at DESC);
