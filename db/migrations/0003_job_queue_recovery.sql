create index if not exists job_queue_running_lease_idx
  on job_queue (locked_at, id)
  where status = 'running';
