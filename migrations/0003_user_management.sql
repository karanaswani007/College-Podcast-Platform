alter table profiles add column if not exists blocked_at timestamptz;

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check
  check (role in ('student', 'creator', 'admin', 'superadmin'));

update profiles
set role = 'superadmin', updated_at = now()
where id = coalesce(
  (select id from profiles where role = 'admin' order by created_at, id limit 1),
  (select id from profiles order by created_at, id limit 1)
)
and not exists (select 1 from profiles where role = 'superadmin');
