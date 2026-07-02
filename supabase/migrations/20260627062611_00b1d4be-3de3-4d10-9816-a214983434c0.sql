
-- =============================================================
-- BISME V5 FINAL
-- =============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to postgres, service_role;

alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from anon;
alter default privileges in schema private revoke execute on functions from authenticated;

-- ===== ENUMS =====
do $$ begin create type public.app_role as enum ('owner','admin');
exception when duplicate_object then null; end $$;

do $$ begin create type public.appointment_status as enum
  ('pendente','confirmado','concluido','cancelado','naoCompareceu');
exception when duplicate_object then null; end $$;

do $$ begin create type public.subscription_status as enum
  ('trial','active','past_due','canceled','none');
exception when duplicate_object then null; end $$;

do $$ begin create type public.cancel_actor as enum ('client','company','system');
exception when duplicate_object then null; end $$;

create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =============================================================
-- TABELAS
-- =============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  avatar_url text,
  phone text check (phone is null or phone ~ '^\+[1-9]\d{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists company_members_user_idx on public.company_members(user_id);
create index if not exists company_members_company_idx on public.company_members(company_id);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(btrim(name))>0),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid,
  name text not null check (length(btrim(name))>0),
  description text,
  price_cents int not null default 0 check (price_cents >= 0),
  duration_minutes int not null default 30 check (duration_minutes > 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (category_id, company_id)
    references public.service_categories(id, company_id) on delete set null (category_id)
);
create index if not exists services_company_idx on public.services(company_id);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(btrim(name))>0),
  role_title text,
  photo_url text,
  bio text,
  is_active boolean not null default true,
  is_visible boolean not null default true,
  is_default_owner boolean not null default false,
  position int not null default 0,
  shift_start time,
  shift_end time,
  off_days smallint[] not null default '{}',
  vacation_start date,
  vacation_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  check (vacation_end is null or vacation_start is null or vacation_end >= vacation_start),
  check (shift_end is null or shift_start is null or shift_end > shift_start)
);
create unique index if not exists professionals_default_owner_uk
  on public.professionals(company_id) where is_default_owner;

create table if not exists public.service_professionals (
  service_id uuid not null,
  professional_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  primary key (service_id, professional_id),
  foreign key (service_id, company_id)
    references public.services(id, company_id) on delete cascade,
  foreign key (professional_id, company_id)
    references public.professionals(id, company_id) on delete cascade
);
create index if not exists sp_company_idx on public.service_professionals(company_id);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '08:00',
  closes_at time not null default '18:00',
  unique (company_id, weekday),
  check (closes_at > opens_at)
);

create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid,
  weekday smallint check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at),
  foreign key (professional_id, company_id)
    references public.professionals(id, company_id) on delete cascade
);

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid,
  start_date date not null,
  end_date date not null,
  reason text,
  check (end_date >= start_date),
  foreign key (professional_id, company_id)
    references public.professionals(id, company_id) on delete cascade
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid,
  block_date date not null,
  starts_at time,
  ends_at time,
  full_day boolean not null default false,
  check (full_day or (starts_at is not null and ends_at is not null and ends_at > starts_at)),
  foreign key (professional_id, company_id)
    references public.professionals(id, company_id) on delete cascade
);

create table if not exists public.site_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  display_name text,
  about text,
  cover_url text,
  logo_url text,
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[1-9]\d{7,14}$'),
  address text,
  social_instagram text,
  social_facebook text,
  template_key text,
  theme_key text,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (length(btrim(name))>0),
  phone text check (phone is null or phone ~ '^\+[1-9]\d{7,14}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);
create unique index if not exists clients_company_phone_uk
  on public.clients(company_id, phone) where phone is not null;
create unique index if not exists clients_company_user_uk
  on public.clients(company_id, user_id) where user_id is not null;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_id uuid not null,
  professional_id uuid not null,
  client_id uuid,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (length(btrim(customer_name))>0),
  customer_phone text not null check (customer_phone ~ '^\+[1-9]\d{7,14}$'),
  customer_email text check (customer_email is null or customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  duration_minutes_snapshot int not null check (duration_minutes_snapshot > 0),
  service_name_snapshot text not null,
  service_price_cents_snapshot int not null check (service_price_cents_snapshot >= 0),
  professional_name_snapshot text not null,
  notes text,
  status public.appointment_status not null default 'pendente',
  cancel_token uuid not null default gen_random_uuid(),
  review_token uuid not null default gen_random_uuid(),
  review_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, company_id),
  foreign key (service_id, company_id)
    references public.services(id, company_id) on delete restrict,
  foreign key (professional_id, company_id)
    references public.professionals(id, company_id) on delete restrict,
  foreign key (client_id, company_id)
    references public.clients(id, company_id) on delete set null (client_id),
  constraint appts_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendente','confirmado'))
);
create index if not exists appts_company_date_idx on public.appointments(company_id, starts_at);
create index if not exists appts_prof_date_idx on public.appointments(professional_id, starts_at);
create index if not exists appts_user_idx on public.appointments(customer_user_id);

create table if not exists public.appointment_cancellations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  reason text,
  canceled_by public.cancel_actor not null,
  created_at timestamptz not null default now(),
  foreign key (appointment_id, company_id)
    references public.appointments(id, company_id) on delete cascade
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_id uuid unique,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (appointment_id, company_id)
    references public.appointments(id, company_id) on delete cascade
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  name text not null,
  description text,
  content text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid,
  appointment_id uuid,
  sent_to text,
  sent_at timestamptz not null default now(),
  foreign key (template_id, company_id)
    references public.message_templates(id, company_id) on delete set null (template_id),
  foreign key (appointment_id, company_id)
    references public.appointments(id, company_id) on delete set null (appointment_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  company_id uuid primary key references public.companies(id) on delete cascade,
  plan text not null default 'free',
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- =============================================================
-- updated_at triggers
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'companies','profiles','service_categories','services','professionals',
    'clients','appointments','message_templates','site_settings','subscriptions'
  ] loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I
                    for each row execute function private.set_updated_at()', t, t);
  end loop;
end $$;

-- =============================================================
-- FUNÇÕES PRIVATE
-- =============================================================

create or replace function private.is_company_member(_company_id uuid, _role public.app_role default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid()
      and (_role is null or m.role = _role)
  );
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.assert_service_professional()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.service_professionals sp
    where sp.service_id = new.service_id
      and sp.professional_id = new.professional_id
      and sp.company_id = new.company_id
  ) then raise exception 'Profissional não realiza este serviço'; end if;
  return new;
end $$;

drop trigger if exists trg_appts_service_pro on public.appointments;
create trigger trg_appts_service_pro
  before insert or update of service_id, professional_id, company_id
  on public.appointments
  for each row execute function private.assert_service_professional();

create or replace function private.sync_links_for_service(_sid uuid, _cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.service_professionals where service_id=_sid;
  if exists(select 1 from public.services where id=_sid and is_active) then
    insert into public.service_professionals(service_id, professional_id, company_id)
    select _sid, p.id, _cid
      from public.professionals p
     where p.company_id=_cid and p.is_active and (p.is_visible or p.is_default_owner);
  end if;
end $$;

create or replace function private.sync_service_links_for_company(_cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.service_professionals where company_id=_cid;
  insert into public.service_professionals(service_id, professional_id, company_id)
  select s.id, p.id, _cid
    from public.services s
    cross join public.professionals p
   where s.company_id=_cid and s.is_active
     and p.company_id=_cid and p.is_active and (p.is_visible or p.is_default_owner);
end $$;

create or replace function private.auto_link_service_to_pros()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform private.sync_links_for_service(new.id, new.company_id); return new; end $$;

create or replace function private.auto_link_pro_to_services()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform private.sync_service_links_for_company(new.company_id); return new; end $$;

drop trigger if exists trg_services_autolink on public.services;
create trigger trg_services_autolink
  after insert or update of is_active on public.services
  for each row execute function private.auto_link_service_to_pros();

drop trigger if exists trg_pros_autolink on public.professionals;
create trigger trg_pros_autolink
  after insert or update of is_active, is_visible, is_default_owner on public.professionals
  for each row execute function private.auto_link_pro_to_services();

create or replace function private.resolve_professional(_cid uuid, _professional_id uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare _count int; _pid uuid; _ok boolean;
begin
  if _professional_id is not null then
    select (is_active and is_visible and not is_default_owner and company_id=_cid)
      into _ok from public.professionals where id=_professional_id;
    if not coalesce(_ok,false) then raise exception 'profissional inválido'; end if;
    return _professional_id;
  end if;

  select count(*) into _count from public.professionals
   where company_id=_cid and is_active and is_visible and not is_default_owner;

  if _count = 0 then
    select id into _pid from public.professionals
     where company_id=_cid and is_default_owner and is_active limit 1;
    return _pid;
  elsif _count = 1 then
    select id into _pid from public.professionals
     where company_id=_cid and is_active and is_visible and not is_default_owner limit 1;
    return _pid;
  else
    raise exception 'profissional é obrigatório';
  end if;
end $$;

create or replace function private.check_availability(
  _cid uuid, _professional_id uuid, _starts_at timestamptz, _duration int
) returns void language plpgsql stable security definer set search_path = public as $$
declare _tz text;
        _start_local timestamp; _end_local timestamp;
        _date date; _dow smallint;
        _open_local timestamp; _close_local timestamp;
        _opens time; _closes time; _is_open boolean;
        _shift_s time; _shift_e time; _off smallint[]; _vac_s date; _vac_e date;
begin
  select timezone into _tz from public.companies where id=_cid;
  if _tz is null then raise exception 'empresa inexistente'; end if;

  _start_local := (_starts_at at time zone _tz);
  _end_local   := ((_starts_at + make_interval(mins=>_duration)) at time zone _tz);
  _date        := _start_local::date;
  _dow         := extract(dow from _start_local)::smallint;

  if _end_local::date <> _date then raise exception 'horário cruza meia-noite'; end if;

  select opens_at, closes_at, is_open into _opens, _closes, _is_open
    from public.business_hours where company_id=_cid and weekday=_dow;
  if _is_open is not true then raise exception 'fechado neste dia'; end if;

  _open_local  := _date + _opens;
  _close_local := _date + _closes;
  if _start_local < _open_local or _end_local > _close_local
    then raise exception 'horário fora do expediente'; end if;

  select shift_start, shift_end, off_days, vacation_start, vacation_end
    into _shift_s, _shift_e, _off, _vac_s, _vac_e
    from public.professionals
   where id=_professional_id and company_id=_cid and is_active;
  if not found then raise exception 'profissional inválido'; end if;

  if _shift_s is not null and _start_local < (_date + _shift_s)
    then raise exception 'antes do turno do profissional'; end if;
  if _shift_e is not null and _end_local > (_date + _shift_e)
    then raise exception 'depois do turno do profissional'; end if;
  if _off is not null and _dow = any(_off)
    then raise exception 'folga do profissional'; end if;
  if _vac_s is not null and _vac_e is not null and _date between _vac_s and _vac_e
    then raise exception 'profissional em férias'; end if;

  if exists (
    select 1 from public.breaks b
     where b.company_id=_cid
       and (b.professional_id is null or b.professional_id=_professional_id)
       and (b.weekday is null or b.weekday=_dow)
       and tsrange(_date + b.starts_at, _date + b.ends_at, '[)')
           && tsrange(_start_local, _end_local, '[)')
  ) then raise exception 'intervalo de pausa'; end if;

  if exists (
    select 1 from public.time_off t
     where t.company_id=_cid
       and (t.professional_id is null or t.professional_id=_professional_id)
       and _date between t.start_date and t.end_date
  ) then raise exception 'folga registrada'; end if;

  if exists (
    select 1 from public.blocks bl
     where bl.company_id=_cid
       and (bl.professional_id is null or bl.professional_id=_professional_id)
       and bl.block_date=_date
       and (bl.full_day
            or tsrange(_date + bl.starts_at, _date + bl.ends_at, '[)')
               && tsrange(_start_local, _end_local, '[)'))
  ) then raise exception 'horário bloqueado'; end if;

  if (extract(epoch from (_start_local - _open_local))::int % (_duration*60)) <> 0
    then raise exception 'horário não alinhado'; end if;
end $$;

create or replace function private.tick_appointment_completion()
returns int language plpgsql security definer set search_path = public as $$
declare _n int;
begin
  with upd as (
    update public.appointments set status='concluido'
     where status in ('pendente','confirmado') and ends_at <= now()
    returning 1
  ) select count(*) into _n from upd;
  return _n;
end $$;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;

-- =============================================================
-- RPCs PUBLIC
-- =============================================================

create or replace function public.create_company_for_current_user(_name text, _slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _cid uuid; _full text;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if _slug !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' then raise exception 'slug inválido'; end if;

  insert into public.companies(name, slug) values (btrim(_name), _slug) returning id into _cid;
  insert into public.company_members(company_id, user_id, role) values (_cid, _uid, 'owner');
  insert into public.site_settings(company_id, display_name) values (_cid, btrim(_name));
  insert into public.subscriptions(company_id, status, trial_ends_at)
    values (_cid, 'trial', now() + interval '30 days');

  insert into public.business_hours(company_id, weekday, is_open, opens_at, closes_at)
  select _cid, d, case when d=0 then false else true end, '08:00',
         case when d=6 then '16:00' else '18:00' end
  from generate_series(0,6) d;

  select coalesce(full_name, email) into _full from public.profiles where id=_uid;
  insert into public.professionals(company_id, name, is_visible, is_default_owner)
  values (_cid, coalesce(_full,'Proprietário'), false, true);

  return _cid;
end $$;

create or replace function public.get_public_site_by_slug(_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _cid uuid; _result jsonb;
begin
  select id into _cid from public.companies where slug=_slug;
  if _cid is null then return null; end if;

  select jsonb_build_object(
    'company',(select jsonb_build_object('name',c.name,'slug',c.slug,'timezone',c.timezone)
               from public.companies c where c.id=_cid),
    'site',(select jsonb_build_object('display_name',s.display_name,'about',s.about,
              'cover_url',s.cover_url,'logo_url',s.logo_url,'whatsapp',s.whatsapp,'address',s.address,
              'social_instagram',s.social_instagram,'social_facebook',s.social_facebook,
              'template_key',s.template_key,'theme_key',s.theme_key)
             from public.site_settings s where s.company_id=_cid),
    'hours',(select coalesce(jsonb_agg(jsonb_build_object('weekday',h.weekday,'is_open',h.is_open,
              'opens_at',h.opens_at,'closes_at',h.closes_at) order by h.weekday),'[]'::jsonb)
             from public.business_hours h where h.company_id=_cid),
    'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'position',x.position) order by x.position),'[]'::jsonb)
                  from public.service_categories x where x.company_id=_cid),
    'services',(select coalesce(jsonb_agg(jsonb_build_object('id',sv.id,'name',sv.name,
                  'description',sv.description,'price_cents',sv.price_cents,
                  'duration_minutes',sv.duration_minutes,'image_url',sv.image_url,'category_id',sv.category_id)),'[]'::jsonb)
                from public.services sv where sv.company_id=_cid and sv.is_active),
    'professionals',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
                      'role_title',p.role_title,'photo_url',p.photo_url,'bio',p.bio,'position',p.position) order by p.position),'[]'::jsonb)
                     from public.professionals p
                     where p.company_id=_cid and p.is_active and p.is_visible and not p.is_default_owner),
    'service_professionals',(select coalesce(jsonb_agg(jsonb_build_object(
                      'service_id',sp.service_id,'professional_id',sp.professional_id)),'[]'::jsonb)
                     from public.service_professionals sp
                     join public.professionals p
                       on p.id=sp.professional_id and p.company_id=sp.company_id
                     where sp.company_id=_cid
                       and p.is_active and p.is_visible and not p.is_default_owner),
    'reviews',(select coalesce(jsonb_agg(jsonb_build_object('customer_name',r.customer_name,
                  'rating',r.rating,'comment',r.comment,'created_at',r.created_at) order by r.created_at desc),'[]'::jsonb)
               from public.reviews r where r.company_id=_cid and r.is_published)
  ) into _result;
  return _result;
end $$;

create or replace function public.get_available_slots(
  _slug text, _service_id uuid, _professional_id uuid, _date date
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _cid uuid; _tz text; _dur int; _opens time; _closes time; _is_open boolean;
        _pid uuid; _slot timestamp; _end timestamp; _slots jsonb := '[]'::jsonb;
begin
  select id, timezone into _cid, _tz from public.companies where slug=_slug;
  if _cid is null then raise exception 'empresa inexistente'; end if;

  select duration_minutes into _dur from public.services
   where id=_service_id and company_id=_cid and is_active;
  if _dur is null then raise exception 'serviço inválido'; end if;

  _pid := private.resolve_professional(_cid, _professional_id);
  if _pid is null then raise exception 'profissional não disponível'; end if;

  select opens_at, closes_at, is_open into _opens, _closes, _is_open
    from public.business_hours where company_id=_cid and weekday=extract(dow from _date)::smallint;
  if _is_open is not true then return _slots; end if;

  _slot := (_date + _opens); _end  := (_date + _closes);
  while _slot + make_interval(mins=>_dur) <= _end loop
    begin
      perform private.check_availability(_cid,_pid,(_slot at time zone _tz),_dur);
      if (_slot at time zone _tz) > now()
         and not exists (
           select 1 from public.appointments a
            where a.professional_id=_pid and a.status in ('pendente','confirmado')
              and tstzrange(a.starts_at,a.ends_at,'[)')
                  && tstzrange((_slot at time zone _tz),
                               (_slot at time zone _tz) + make_interval(mins=>_dur),'[)')
         )
      then _slots := _slots || to_jsonb(_slot at time zone _tz); end if;
    exception when others then null; end;
    _slot := _slot + make_interval(mins=>_dur);
  end loop;
  return _slots;
end $$;

create or replace function public.create_public_appointment(
  _slug text, _service_id uuid, _professional_id uuid,
  _starts_at timestamptz,
  _customer_name text, _customer_phone text,
  _customer_email text default null, _notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare _cid uuid; _pid uuid; _dur int; _price int; _sname text; _pname text;
        _ends timestamptz; _id uuid; _ctok uuid; _rtok uuid;
        _client_id uuid; _existing_uid uuid;
        _email text := nullif(btrim(_customer_email),'');
begin
  if _customer_name is null or length(btrim(_customer_name))=0 then raise exception 'nome obrigatório'; end if;
  if _customer_phone is null or _customer_phone !~ '^\+[1-9]\d{7,14}$' then raise exception 'telefone inválido (use E.164)'; end if;
  if _starts_at <= now() then raise exception 'horário deve ser futuro'; end if;

  select id into _cid from public.companies where slug=_slug;
  if _cid is null then raise exception 'empresa inexistente'; end if;

  select duration_minutes, price_cents, name into _dur, _price, _sname
    from public.services where id=_service_id and company_id=_cid and is_active;
  if _dur is null then raise exception 'serviço inválido'; end if;

  _pid := private.resolve_professional(_cid, _professional_id);
  if _pid is null then raise exception 'profissional não disponível'; end if;

  select name into _pname from public.professionals where id=_pid and company_id=_cid and is_active;
  if _pname is null then raise exception 'profissional inválido'; end if;

  perform private.check_availability(_cid,_pid,_starts_at,_dur);
  _ends := _starts_at + make_interval(mins=>_dur);

  if auth.uid() is not null then
    select id into _client_id from public.clients
     where company_id=_cid and user_id=auth.uid() limit 1;
  end if;
  if _client_id is null then
    select id, user_id into _client_id, _existing_uid from public.clients
     where company_id=_cid and phone=_customer_phone limit 1;
    if _client_id is not null then
      if _existing_uid is not null and auth.uid() is not null and _existing_uid <> auth.uid() then
        raise exception 'telefone já vinculado a outro cliente';
      end if;
      if _existing_uid is null and auth.uid() is not null then
        update public.clients set user_id=auth.uid(),
               name=coalesce(name, btrim(_customer_name)),
               email=coalesce(email, _email), updated_at=now()
         where id=_client_id;
      end if;
    end if;
  end if;
  if _client_id is null then
    insert into public.clients(company_id, user_id, name, phone, email)
    values (_cid, auth.uid(), btrim(_customer_name), _customer_phone, _email)
    returning id into _client_id;
  end if;

  insert into public.appointments(
    company_id, service_id, professional_id, client_id, customer_user_id,
    customer_name, customer_phone, customer_email,
    starts_at, ends_at,
    duration_minutes_snapshot, service_name_snapshot, service_price_cents_snapshot, professional_name_snapshot,
    notes, status, review_token_expires_at
  ) values (
    _cid, _service_id, _pid, _client_id, auth.uid(),
    btrim(_customer_name), _customer_phone, _email,
    _starts_at, _ends,
    _dur, _sname, _price, _pname,
    _notes, 'pendente', _ends + interval '24 hours'
  ) returning id, cancel_token, review_token into _id, _ctok, _rtok;

  return jsonb_build_object('id',_id,'cancel_token',_ctok,'review_token',_rtok,'ends_at',_ends);
exception when exclusion_violation then raise exception 'horário já reservado';
end $$;

create or replace function public.cancel_appointment_by_token(_id uuid, _token uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare _cid uuid;
begin
  update public.appointments set status='cancelado'
   where id=_id and cancel_token=_token
     and status in ('pendente','confirmado') and starts_at > now()
  returning company_id into _cid;
  if _cid is null then raise exception 'cancelamento não permitido'; end if;
  insert into public.appointment_cancellations(appointment_id, company_id, reason, canceled_by)
  values (_id, _cid, _reason, 'client');
end $$;

create or replace function public.cancel_appointment_as_client(_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare _cid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.appointments set status='cancelado'
   where id=_id and customer_user_id=auth.uid()
     and status in ('pendente','confirmado') and starts_at > now()
  returning company_id into _cid;
  if _cid is null then raise exception 'cancelamento não permitido'; end if;
  insert into public.appointment_cancellations(appointment_id, company_id, reason, canceled_by)
  values (_id, _cid, _reason, 'client');
end $$;

create or replace function public.create_review_by_token(
  _appointment_id uuid, _token uuid, _rating int, _comment text
) returns void language plpgsql security definer set search_path = public as $$
declare _cid uuid; _name text; _status public.appointment_status; _exp timestamptz;
begin
  if _rating < 1 or _rating > 5 then raise exception 'rating inválido'; end if;
  select company_id, customer_name, status, review_token_expires_at
    into _cid, _name, _status, _exp
    from public.appointments where id=_appointment_id and review_token=_token;
  if _cid is null then raise exception 'agendamento não encontrado'; end if;
  if _status <> 'concluido' then raise exception 'agendamento ainda não concluído'; end if;
  if _exp is null or now() > _exp then raise exception 'prazo de avaliação expirado'; end if;
  if exists (select 1 from public.reviews where appointment_id=_appointment_id)
    then raise exception 'avaliação já registrada'; end if;
  insert into public.reviews(company_id, appointment_id, customer_name, rating, comment, is_published)
  values (_cid, _appointment_id, _name, _rating, _comment, false);
end $$;

create or replace function public.admin_sync_service_professionals(_cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_company_member(_cid,'owner') then raise exception 'forbidden'; end if;
  perform private.sync_service_links_for_company(_cid);
end $$;

-- =============================================================
-- GRANTS
-- =============================================================
grant select, insert, update, delete on
  public.service_categories, public.services, public.professionals,
  public.service_professionals, public.business_hours, public.breaks,
  public.time_off, public.blocks,
  public.clients, public.appointments,
  public.reviews, public.message_templates, public.message_logs, public.notifications
to authenticated;

grant select on
  public.companies, public.company_members, public.site_settings,
  public.subscriptions, public.profiles, public.appointment_cancellations
to authenticated;

grant insert, update on public.profiles to authenticated;
grant update on public.site_settings to authenticated;
grant insert on public.appointment_cancellations to authenticated;

grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;

revoke all on function public.create_company_for_current_user(text,text) from public;
grant execute on function public.create_company_for_current_user(text,text) to authenticated;

revoke all on function public.get_public_site_by_slug(text) from public;
grant execute on function public.get_public_site_by_slug(text) to anon, authenticated;

revoke all on function public.get_available_slots(text,uuid,uuid,date) from public;
grant execute on function public.get_available_slots(text,uuid,uuid,date) to anon, authenticated;

revoke all on function public.create_public_appointment(text,uuid,uuid,timestamptz,text,text,text,text) from public;
grant execute on function public.create_public_appointment(text,uuid,uuid,timestamptz,text,text,text,text) to anon, authenticated;

revoke all on function public.cancel_appointment_by_token(uuid,uuid,text) from public;
grant execute on function public.cancel_appointment_by_token(uuid,uuid,text) to anon, authenticated;

revoke all on function public.cancel_appointment_as_client(uuid,text) from public;
grant execute on function public.cancel_appointment_as_client(uuid,text) to authenticated;

revoke all on function public.create_review_by_token(uuid,uuid,int,text) from public;
grant execute on function public.create_review_by_token(uuid,uuid,int,text) to anon, authenticated;

revoke all on function public.admin_sync_service_professionals(uuid) from public;
grant execute on function public.admin_sync_service_professionals(uuid) to authenticated;

-- =============================================================
-- RLS
-- =============================================================
alter table public.companies                 enable row level security;
alter table public.profiles                  enable row level security;
alter table public.company_members           enable row level security;
alter table public.service_categories        enable row level security;
alter table public.services                  enable row level security;
alter table public.professionals             enable row level security;
alter table public.service_professionals     enable row level security;
alter table public.business_hours            enable row level security;
alter table public.breaks                    enable row level security;
alter table public.time_off                  enable row level security;
alter table public.blocks                    enable row level security;
alter table public.site_settings             enable row level security;
alter table public.clients                   enable row level security;
alter table public.appointments              enable row level security;
alter table public.appointment_cancellations enable row level security;
alter table public.reviews                   enable row level security;
alter table public.message_templates         enable row level security;
alter table public.message_logs              enable row level security;
alter table public.notifications             enable row level security;
alter table public.subscriptions             enable row level security;

drop policy if exists "companies members read" on public.companies;
create policy "companies members read" on public.companies for select to authenticated
  using (private.is_company_member(id));

drop policy if exists "members self read" on public.company_members;
create policy "members self read" on public.company_members for select to authenticated
  using (user_id = auth.uid() or private.is_company_member(company_id,'owner'));

drop policy if exists "sub member read" on public.subscriptions;
create policy "sub member read" on public.subscriptions for select to authenticated
  using (private.is_company_member(company_id));

drop policy if exists "profiles self rw" on public.profiles;
create policy "profiles self rw" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'service_categories','services','professionals','service_professionals',
    'business_hours','breaks','time_off','blocks',
    'clients','message_templates','message_logs','notifications','reviews'
  ] loop
    execute format('drop policy if exists "%s member all" on public.%I', t, t);
    execute format('create policy "%s member all" on public.%I for all to authenticated
                    using (private.is_company_member(company_id))
                    with check (private.is_company_member(company_id))', t, t);
  end loop;
end $$;

drop policy if exists "ss member read" on public.site_settings;
drop policy if exists "ss member upd"  on public.site_settings;
create policy "ss member read" on public.site_settings for select to authenticated
  using (private.is_company_member(company_id));
create policy "ss member upd" on public.site_settings for update to authenticated
  using (private.is_company_member(company_id))
  with check (private.is_company_member(company_id));

drop policy if exists "ap member all" on public.appointments;
create policy "ap member all" on public.appointments for all to authenticated
  using (private.is_company_member(company_id))
  with check (private.is_company_member(company_id));

drop policy if exists "ap client self read" on public.appointments;
create policy "ap client self read" on public.appointments for select to authenticated
  using (customer_user_id = auth.uid());

drop policy if exists "ac member read" on public.appointment_cancellations;
drop policy if exists "ac member ins"  on public.appointment_cancellations;
create policy "ac member read" on public.appointment_cancellations for select to authenticated
  using (private.is_company_member(company_id));
create policy "ac member ins" on public.appointment_cancellations for insert to authenticated
  with check (private.is_company_member(company_id));

-- =============================================================
-- pg_cron opcional, idempotente
-- =============================================================
do $do$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    if exists (select 1 from cron.job where jobname='bisme-tick-completion') then
      perform cron.unschedule('bisme-tick-completion');
    end if;
    perform cron.schedule(
      'bisme-tick-completion',
      '*/5 * * * *',
      $cmd$ select private.tick_appointment_completion(); $cmd$
    );
  end if;
exception when others then null;
end
$do$;

-- defesa final
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;

-- =============================================================
-- PATCH: permitir uso de private.is_company_member nas policies RLS
-- =============================================================
grant usage on schema private to authenticated;
grant execute on function private.is_company_member(uuid, public.app_role) to authenticated;
