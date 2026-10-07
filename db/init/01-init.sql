-- Runs once, on first start of an empty data volume.
CREATE TABLE IF NOT EXISTS schema_info (
  id         SERIAL PRIMARY KEY,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_info (note) VALUES ('pmts database initialized');
