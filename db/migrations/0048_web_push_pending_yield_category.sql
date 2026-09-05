alter table push_notification_events
  drop constraint if exists push_notification_events_category_check;

alter table push_notification_events
  add constraint push_notification_events_category_check
  check (category in ('tasks', 'rewards', 'pending_yield'));

comment on constraint push_notification_events_category_check on push_notification_events is
  'Restricts empty-payload reminder ledger categories to task, reward and pending-yield notifications.';
