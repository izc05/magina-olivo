create or replace function block_memberships_during_account_deletion()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from account_deletion_requests
    where user_id = new.user_id
      and status in ('requested', 'processing')
  ) then
    raise exception 'Cannot create or change holding membership while account deletion is pending'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists holding_members_block_during_account_deletion on holding_members;

create trigger holding_members_block_during_account_deletion
before insert or update of user_id, status, role on holding_members
for each row
execute function block_memberships_during_account_deletion();

comment on function block_memberships_during_account_deletion() is
  'Prevents new or changed holding memberships for users with an active account deletion request, closing the race between membership writes and destructive deletion.';
