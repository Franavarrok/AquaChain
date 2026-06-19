-- AquaCHAIN - Esquema de base de datos
--
-- Uso local (Docker Compose): se ejecuta automáticamente vía
-- docker-entrypoint-initdb.d al crear el contenedor de Postgres.
--
-- Uso en Neon (producción): ejecutar este script una sola vez contra la
-- base de datos creada en el panel de Neon, usando el SQL Editor de Neon
-- o vía `psql "$DATABASE_URL" -f schema.sql`.

CREATE TABLE IF NOT EXISTS measurements (
    id              SERIAL PRIMARY KEY,
    sensor_id       VARCHAR(50)      NOT NULL,
    flow_rate       NUMERIC(10, 2)   NOT NULL, -- m3/s
    water_level     NUMERIC(10, 2)   NOT NULL, -- cm
    is_anomaly      BOOLEAN          NOT NULL DEFAULT FALSE,
    "timestamp"     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
    "index"         SERIAL PRIMARY KEY,
    measurement_id  INTEGER          NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    previous_hash   VARCHAR(64)      NOT NULL,
    hash            VARCHAR(64)      NOT NULL,
    data_hash       VARCHAR(64)      NOT NULL,
    "timestamp"     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    measurement_id  INTEGER          NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    type            VARCHAR(50)      NOT NULL, -- HIGH_FLOW | LOW_FLOW | HIGH_LEVEL
    message         TEXT             NOT NULL,
    value           NUMERIC(10, 2)   NOT NULL,
    "timestamp"     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurements_timestamp ON measurements("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_index ON blocks("index" DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts("timestamp" DESC);
