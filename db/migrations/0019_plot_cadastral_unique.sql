create unique index plots_holding_cadastral_active_uq
  on plots (holding_id, cadastral_reference)
  where active = true and cadastral_reference is not null;

comment on index plots_holding_cadastral_active_uq is
  'Prevents accidentally adding the same active cadastral parcel twice inside one holding; explicit duplicate-resolution workflows must deactivate or reconcile the prior plot first.';
