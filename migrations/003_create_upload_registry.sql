CREATE TABLE IF NOT EXISTS upload_registry (
  id BIGSERIAL PRIMARY KEY,
  file_fingerprint VARCHAR(128) UNIQUE NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  uploaded_file_name VARCHAR(255) NOT NULL,
  bucket_name VARCHAR(255) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_registry_fingerprint ON upload_registry(file_fingerprint);
