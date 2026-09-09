create unique index loyalty_transactions_collect_idempotency_uq
  on loyalty_transactions(user_id, reference_id)
  where kind = 'collect'
    and reference_type = 'collection_request'
    and reference_id is not null;
