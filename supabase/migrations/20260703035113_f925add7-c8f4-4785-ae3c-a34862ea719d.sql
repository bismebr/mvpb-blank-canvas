CREATE OR REPLACE FUNCTION public.update_company_slug(_company_id uuid, _new_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
  _normalized text;
  _current text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT private.is_company_member(_company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Normaliza: minúsculas, remove espaços das pontas, troca espaços internos por hífen,
  -- remove qualquer caractere que não seja letra minúscula, número ou hífen.
  _normalized := lower(btrim(coalesce(_new_slug, '')));
  _normalized := regexp_replace(_normalized, '\s+', '-', 'g');
  _normalized := regexp_replace(_normalized, '[^a-z0-9-]', '', 'g');

  -- Valida formato (mesmo padrão do CHECK da coluna): 3 a 50 chars, início/fim alfanumérico.
  IF _normalized !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;

  SELECT slug INTO _current FROM public.companies WHERE id = _company_id;

  -- Mesmo slug atual: sucesso sem alteração.
  IF _current = _normalized THEN
    RETURN _normalized;
  END IF;

  -- Já usado por outra empresa.
  IF EXISTS (
    SELECT 1 FROM public.companies
    WHERE slug = _normalized AND id <> _company_id
  ) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE public.companies
     SET slug = _normalized,
         updated_at = now()
   WHERE id = _company_id;

  RETURN _normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.update_company_slug(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_company_slug(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_company_slug(uuid, text) TO authenticated;