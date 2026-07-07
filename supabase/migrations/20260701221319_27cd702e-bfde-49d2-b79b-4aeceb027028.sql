
-- 1) Helper interna
CREATE OR REPLACE FUNCTION private.is_company_subscription_available(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.company_id = _company_id
      AND (
        (s.status = 'trial'
          AND s.trial_ends_at IS NOT NULL
          AND s.trial_ends_at >= now())
        OR
        (s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR
        (s.status = 'canceled'
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_company_subscription_available(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_company_subscription_available(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.is_company_subscription_available(uuid) FROM authenticated;

-- 2) RPC pública de disponibilidade
CREATE OR REPLACE FUNCTION public.get_public_site_availability(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _cid uuid; _available boolean;
BEGIN
  SELECT id INTO _cid FROM public.companies WHERE slug = _slug;
  IF _cid IS NULL THEN
    RETURN jsonb_build_object('available', false);
  END IF;

  _available := private.is_company_subscription_available(_cid);
  RETURN jsonb_build_object('available', COALESCE(_available, false));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_site_availability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_site_availability(text) TO anon, authenticated;

-- 3) get_available_slots com guard
CREATE OR REPLACE FUNCTION public.get_available_slots(_slug text, _service_id uuid, _professional_id uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare _cid uuid; _tz text; _dur int; _opens time; _closes time; _is_open boolean;
        _pid uuid; _slot timestamp; _end timestamp; _slots jsonb := '[]'::jsonb;
begin
  select id, timezone into _cid, _tz from public.companies where slug=_slug;
  if _cid is null then raise exception 'empresa inexistente'; end if;

  if not private.is_company_subscription_available(_cid) then
    raise exception 'site indisponível';
  end if;

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
end $function$;

-- 4) create_public_appointment com guard
CREATE OR REPLACE FUNCTION public.create_public_appointment(_slug text, _service_id uuid, _professional_id uuid, _starts_at timestamp with time zone, _customer_name text, _customer_phone text, _customer_email text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  if not private.is_company_subscription_available(_cid) then
    raise exception 'site indisponível';
  end if;

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
end $function$;
