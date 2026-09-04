drop index if exists job_queue_dedupe_idx;

create unique index job_queue_dedupe_idx
  on job_queue (dedupe_key);

comment on index job_queue_dedupe_idx is
  'Global job deduplication index. PostgreSQL unique indexes allow multiple NULL values, so this preserves nullable dedupe keys while supporting ON CONFLICT (dedupe_key).';
