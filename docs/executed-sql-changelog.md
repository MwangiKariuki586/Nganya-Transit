# Executed SQL Changelog

## 2026-03-22 - single_nganya_per_account

Applied via Supabase MCP migration `single_nganya_per_account`.

```sql
create unique index if not exists idx_nganya_registration_requests_one_per_account
  on public.nganya_registration_requests (created_by);

create unique index if not exists idx_crew_nganyas_one_per_account
  on public.crew_nganyas (crew_user_id);
```

## 2026-03-22 - nganya_request_status_enum

Applied via Supabase MCP migration `nganya_request_status_enum`.

```sql
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'nganya_registration_request_status'
  ) then
    create type public.nganya_registration_request_status as enum (
      'DRAFT',
      'PENDING',
      'APPROVED',
      'REJECTED',
      'NEEDS_INFO'
    );
  end if;
end $$;

drop policy if exists nganya_registration_requests_insert_own on public.nganya_registration_requests;
drop policy if exists nganya_registration_requests_update_own_editable on public.nganya_registration_requests;
drop policy if exists nganya_registration_request_media_insert_own on public.nganya_registration_request_media;
drop policy if exists nganya_registration_request_media_update_own on public.nganya_registration_request_media;
drop policy if exists nganya_registration_request_media_delete_own on public.nganya_registration_request_media;

alter table public.nganya_registration_requests
  alter column status drop default;

alter table public.nganya_registration_requests
  drop constraint if exists nganya_registration_requests_status_check;

alter table public.nganya_registration_requests
  alter column status type public.nganya_registration_request_status
  using status::public.nganya_registration_request_status;

alter table public.nganya_registration_requests
  alter column status set default 'PENDING'::public.nganya_registration_request_status;

create policy nganya_registration_requests_insert_own
  on public.nganya_registration_requests
  for insert
  to authenticated
  with check (
    (auth.uid() = created_by)
    and (is_admin() or is_crew())
    and status in (
      'DRAFT'::public.nganya_registration_request_status,
      'PENDING'::public.nganya_registration_request_status,
      'NEEDS_INFO'::public.nganya_registration_request_status
    )
  );

create policy nganya_registration_requests_update_own_editable
  on public.nganya_registration_requests
  for update
  to authenticated
  using (
    (auth.uid() = created_by)
    and status in (
      'DRAFT'::public.nganya_registration_request_status,
      'NEEDS_INFO'::public.nganya_registration_request_status
    )
  )
  with check (
    (auth.uid() = created_by)
    and status in (
      'DRAFT'::public.nganya_registration_request_status,
      'PENDING'::public.nganya_registration_request_status,
      'NEEDS_INFO'::public.nganya_registration_request_status
    )
  );

create policy nganya_registration_request_media_insert_own
  on public.nganya_registration_request_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in (
          'DRAFT'::public.nganya_registration_request_status,
          'NEEDS_INFO'::public.nganya_registration_request_status,
          'PENDING'::public.nganya_registration_request_status
        )
    )
  );

create policy nganya_registration_request_media_update_own
  on public.nganya_registration_request_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in (
          'DRAFT'::public.nganya_registration_request_status,
          'NEEDS_INFO'::public.nganya_registration_request_status
        )
    )
  )
  with check (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in (
          'DRAFT'::public.nganya_registration_request_status,
          'NEEDS_INFO'::public.nganya_registration_request_status
        )
    )
  );

create policy nganya_registration_request_media_delete_own
  on public.nganya_registration_request_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in (
          'DRAFT'::public.nganya_registration_request_status,
          'NEEDS_INFO'::public.nganya_registration_request_status
        )
    )
  );
```

## 2026-03-22 - rbac_function_alignment

Applied via Supabase MCP migration `rbac_function_alignment`.

```sql
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(
    (
      select ur.role::text
      from public.user_roles ur
      where ur.user_id = auth.uid()
      limit 1
    ),
    (
      select p.role::text
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    nullif(auth.jwt()->'app_metadata'->>'role', ''),
    nullif(auth.jwt()->'user_metadata'->>'role', ''),
    nullif(auth.jwt()->>'user_role', '')
  );
$function$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.current_app_role() = 'admin';
$function$;

create or replace function public.is_crew()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.current_app_role() = 'crew';
$function$;

grant execute on function public.current_app_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_crew() to anon, authenticated, service_role;
```

## 2026-03-22 - nganya_registration_requests

Applied via Supabase MCP migration `nganya_registration_requests`.

```sql
create table if not exists public.nganya_registration_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  corridor_id uuid not null references public.corridors(id) on delete restrict,
  proposed_name text not null,
  plate_last4 text null,
  plate_hash text null,
  sacco text null,
  tags text[] not null default '{}',
  status text not null default 'PENDING' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO')),
  approved_nganya_id uuid null references public.nganyas(id) on delete set null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  review_notes text null,
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nganya_registration_request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.nganya_registration_requests(id) on delete cascade,
  storage_path text not null,
  media_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_nganya_registration_requests_created_by_created_at
  on public.nganya_registration_requests (created_by, created_at desc);

create index if not exists idx_nganya_registration_requests_corridor_status
  on public.nganya_registration_requests (corridor_id, status);

create index if not exists idx_nganya_registration_requests_status_created_at
  on public.nganya_registration_requests (status, created_at desc);

create index if not exists idx_nganya_registration_requests_plate_last4
  on public.nganya_registration_requests (plate_last4)
  where plate_last4 is not null;

create index if not exists idx_nganya_registration_request_media_request_sort
  on public.nganya_registration_request_media (request_id, sort_order);

alter table public.nganya_registration_requests enable row level security;
alter table public.nganya_registration_request_media enable row level security;

drop policy if exists nganya_registration_requests_select_own_or_admin on public.nganya_registration_requests;
create policy nganya_registration_requests_select_own_or_admin
  on public.nganya_registration_requests
  for select
  to authenticated
  using ((auth.uid() = created_by) or is_admin());

drop policy if exists nganya_registration_requests_insert_own on public.nganya_registration_requests;
create policy nganya_registration_requests_insert_own
  on public.nganya_registration_requests
  for insert
  to authenticated
  with check (
    (auth.uid() = created_by)
    and (is_admin() or is_crew())
    and status in ('DRAFT', 'PENDING', 'NEEDS_INFO')
  );

drop policy if exists nganya_registration_requests_update_own_editable on public.nganya_registration_requests;
create policy nganya_registration_requests_update_own_editable
  on public.nganya_registration_requests
  for update
  to authenticated
  using ((auth.uid() = created_by) and status in ('DRAFT', 'NEEDS_INFO'))
  with check ((auth.uid() = created_by) and status in ('DRAFT', 'PENDING', 'NEEDS_INFO'));

drop policy if exists nganya_registration_requests_admin_manage on public.nganya_registration_requests;
create policy nganya_registration_requests_admin_manage
  on public.nganya_registration_requests
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists nganya_registration_request_media_select_own_or_admin on public.nganya_registration_request_media;
create policy nganya_registration_request_media_select_own_or_admin
  on public.nganya_registration_request_media
  for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
    )
  );

drop policy if exists nganya_registration_request_media_insert_own on public.nganya_registration_request_media;
create policy nganya_registration_request_media_insert_own
  on public.nganya_registration_request_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in ('DRAFT', 'NEEDS_INFO', 'PENDING')
    )
  );

drop policy if exists nganya_registration_request_media_update_own on public.nganya_registration_request_media;
create policy nganya_registration_request_media_update_own
  on public.nganya_registration_request_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in ('DRAFT', 'NEEDS_INFO')
    )
  )
  with check (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in ('DRAFT', 'NEEDS_INFO')
    )
  );

drop policy if exists nganya_registration_request_media_delete_own on public.nganya_registration_request_media;
create policy nganya_registration_request_media_delete_own
  on public.nganya_registration_request_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.nganya_registration_requests req
      where req.id = request_id
        and req.created_by = auth.uid()
        and req.status in ('DRAFT', 'NEEDS_INFO')
    )
  );

drop policy if exists nganya_registration_request_media_admin_manage on public.nganya_registration_request_media;
create policy nganya_registration_request_media_admin_manage
  on public.nganya_registration_request_media
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admins and crew can insert nganyas" on public.nganyas;
drop policy if exists "Authenticated users can insert media" on public.nganya_media;
drop policy if exists "Authenticated users can insert nganya media" on public.nganya_media;

drop policy if exists nganyas_admin_insert_only on public.nganyas;
create policy nganyas_admin_insert_only
  on public.nganyas
  for insert
  to authenticated
  with check (is_admin());

drop policy if exists nganya_media_admin_insert_only on public.nganya_media;
create policy nganya_media_admin_insert_only
  on public.nganya_media
  for insert
  to authenticated
  with check (is_admin());

create or replace function public.approve_nganya_registration_request(
  p_request_id uuid,
  p_review_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request public.nganya_registration_requests%rowtype;
  v_nganya_id uuid;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into v_request
  from public.nganya_registration_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.status = 'APPROVED' and v_request.approved_nganya_id is not null then
    return v_request.approved_nganya_id;
  end if;

  if v_request.status not in ('PENDING', 'NEEDS_INFO', 'DRAFT') then
    raise exception 'REQUEST_NOT_APPROVABLE';
  end if;

  insert into public.nganyas (
    corridor_id,
    name,
    tags,
    is_verified,
    created_by
  )
  values (
    v_request.corridor_id,
    v_request.proposed_name,
    v_request.tags,
    true,
    v_request.created_by
  )
  returning id into v_nganya_id;

  insert into public.nganya_media (
    nganya_id,
    media_url,
    media_type
  )
  select
    v_nganya_id,
    media_url,
    'image'
  from public.nganya_registration_request_media
  where request_id = v_request.id
  order by sort_order, created_at;

  insert into public.crew_nganyas (
    crew_user_id,
    nganya_id
  )
  values (
    v_request.created_by,
    v_nganya_id
  )
  on conflict do nothing;

  update public.nganya_registration_requests
  set status = 'APPROVED',
      approved_nganya_id = v_nganya_id,
      reviewed_by = auth.uid(),
      review_notes = coalesce(p_review_notes, review_notes),
      reviewed_at = now(),
      updated_at = now(),
      submitted_at = coalesce(submitted_at, now())
  where id = v_request.id;

  return v_nganya_id;
end;
$$;


```
