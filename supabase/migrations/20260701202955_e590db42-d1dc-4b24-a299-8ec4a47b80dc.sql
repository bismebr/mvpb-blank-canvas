-- =============================================================
-- 1. Defaults novos: empresa nasce sem trial iniciado
-- =============================================================
alter table public.subscriptions
  alter column plan   set default 'none';

alter table public.subscriptions
  alter column status set default 'none';

-- =============================================================
-- 2. Novos campos em public.subscriptions
-- =============================================================
alter table public.subscriptions
  add column if not exists trial_started_at     timestamptz,
  add column if not exists current_period_start timestamptz,
  add column if not exists canceled_at          timestamptz;

-- =============================================================
-- 3. Backfill seguro para empresas já em trial
-- =============================================================
update public.subscriptions
   set trial_started_at = coalesce(trial_started_at, updated_at)
 where status = 'trial'
   and trial_ends_at is not null
   and trial_started_at is null;

-- =============================================================
-- 4. create_company_for_current_user: empresa nasce em 'none'
-- =============================================================
create or replace function public.create_company_for_current_user(_name text, _slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _cid uuid;
  _full text;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;

  if _slug !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' then
    raise exception 'slug inválido';
  end if;

  insert into public.companies(name, slug)
  values (btrim(_name), _slug)
  returning id into _cid;

  insert into public.company_members(company_id, user_id, role)
  values (_cid, _uid, 'owner');

  insert into public.site_settings(company_id, display_name)
  values (_cid, btrim(_name));

  insert into public.subscriptions(company_id, status, plan, trial_ends_at, trial_started_at)
  values (_cid, 'none', 'none', null, null);

  insert into public.business_hours(company_id, weekday, is_open, opens_at, closes_at)
  select
    _cid,
    d,
    case when d = 0 then false else true end,
    time '08:00',
    case
      when d = 6 then time '16:00'
      else time '18:00'
    end
  from generate_series(0, 6) as d;

  select coalesce(full_name, email)
  into _full
  from public.profiles
  where id = _uid;

  insert into public.professionals(company_id, name, is_visible, is_default_owner)
  values (_cid, coalesce(_full, 'Proprietário'), false, true);

  return _cid;
end;
$$;

-- =============================================================
-- 5. start_trial_if_needed(_company_id)
-- =============================================================
create or replace function public.start_trial_if_needed(_company_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _row public.subscriptions;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;

  if not private.is_company_member(_company_id) then
    raise exception 'not a member of this company';
  end if;

  select * into _row
    from public.subscriptions
   where company_id = _company_id
   for update;

  if not found then
    raise exception 'subscription row not found';
  end if;

  if _row.trial_started_at is null and _row.status = 'none' then
    update public.subscriptions
       set trial_started_at = now(),
           trial_ends_at    = now() + interval '7 days',
           status           = 'trial',
           plan             = 'none',
           updated_at       = now()
     where company_id = _company_id
    returning * into _row;
  end if;

  return _row;
end;
$$;

revoke all on function public.start_trial_if_needed(uuid) from public;
grant execute on function public.start_trial_if_needed(uuid) to authenticated;
