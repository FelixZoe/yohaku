#!/usr/bin/env bash
set -euo pipefail

CORE_PG_CONTAINER="${CORE_PG_CONTAINER:-mx-pg-dev}"
CORE_PG_USER="${CORE_PG_USER:-mx}"
CORE_PG_DATABASE="${CORE_PG_DATABASE:-mx_core}"
RELAY_PG_DATABASE="${RELAY_PG_DATABASE:-push_relay}"
RELAY_ORIGIN="${RELAY_ORIGIN:-http://127.0.0.1:8787}"
WAIT_SECONDS="${WAIT_SECONDS:-17}"

stamp="$(date +%s)"
resource_id="skill-proof-${stamp}"
event_id="content.published:post:${resource_id}"

docker exec -i "$CORE_PG_CONTAINER" \
  psql -U "$CORE_PG_USER" -d "$CORE_PG_DATABASE" \
  -v event_id="$event_id" \
  -v resource_id="$resource_id" \
  -v relay_origin="$RELAY_ORIGIN" <<'SQL'
INSERT INTO push_relay_deliveries (
  id, source_id, event_id, event_type, subject, payload,
  status, attempt, next_attempt_at, created_at, updated_at
)
SELECT
  'dlv_skill_' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
  id,
  :'event_id',
  'dev.mx-space.content.published.v1',
  'post/' || :'resource_id',
  jsonb_build_object(
    'specversion', '1.0',
    'id', :'event_id',
    'source', 'urn:mx-core:instance:' || remote_source_id,
    'type', 'dev.mx-space.content.published.v1',
    'subject', 'post/' || :'resource_id',
    'time', to_char(
      clock_timestamp() AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ),
    'datacontenttype', 'application/json',
    'data', jsonb_build_object(
      'resource_id', :'resource_id',
      'resource_type', 'post'
    )
  ),
  'pending', 0, now(), now(), now()
FROM push_relay_sources
WHERE enabled = true AND relay_url = :'relay_origin'
ORDER BY created_at DESC
LIMIT 1
RETURNING id, event_id, status;
SQL

echo "Waiting ${WAIT_SECONDS}s for core dispatch and Relay fan-out…"
sleep "$WAIT_SECONDS"

echo "Core outbox:"
docker exec "$CORE_PG_CONTAINER" \
  psql -U "$CORE_PG_USER" -d "$CORE_PG_DATABASE" \
  -c "SELECT event_id, status, attempt, last_error, delivered_at
      FROM push_relay_deliveries
      WHERE event_id = '$event_id';"

echo "Relay/APNs delivery:"
docker exec "$CORE_PG_CONTAINER" \
  psql -U "$CORE_PG_USER" -d "$RELAY_PG_DATABASE" \
  -c "SELECT d.status, d.attempt, d.apns_id, d.last_error
      FROM push_deliveries d
      JOIN push_events e
        ON e.source_id = d.source_id AND e.id = d.event_id
      WHERE e.id = '$event_id'
      ORDER BY d.created_at;"

echo "Evidence ID: $event_id"
