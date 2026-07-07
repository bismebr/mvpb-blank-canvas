CREATE OR REPLACE FUNCTION public.get_public_site_by_slug(_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _cid uuid; _result jsonb;
begin
  select id into _cid from public.companies where slug = _slug;
  if _cid is null then return null; end if;

  select jsonb_build_object(
    'company', (select jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'timezone', c.timezone)
                from public.companies c where c.id = _cid),
    'site', (select jsonb_build_object(
               'display_name',      s.display_name,
               'about',             s.about,
               'cover_url',         s.cover_url,
               'logo_url',          s.logo_url,
               'whatsapp',          s.whatsapp,
               'address',           s.address,
               'social_instagram',  s.social_instagram,
               'social_facebook',   s.social_facebook,
               'template_key',      s.template_key,
               'theme_key',         s.theme_key,
               'show_address',      s.show_address,
               'social_youtube',    s.social_youtube,
               'social_tiktok',     s.social_tiktok,
               'website_url',       s.website_url,
               'amenities',         s.amenities,
               'about_image_url',   s.about_image_url,
               'work_image_urls',   s.work_image_urls,
               'rating_average',    s.rating_average,
               'reviews_count',     s.reviews_count
             )
             from public.site_settings s where s.company_id = _cid),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object(
               'weekday', h.weekday, 'is_open', h.is_open,
               'opens_at', h.opens_at, 'closes_at', h.closes_at) order by h.weekday), '[]'::jsonb)
             from public.business_hours h where h.company_id = _cid),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', x.id, 'name', x.name, 'position', x.position) order by x.position), '[]'::jsonb)
             from public.service_categories x where x.company_id = _cid),
    'services', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', sv.id, 'name', sv.name, 'description', sv.description,
               'price_cents', sv.price_cents, 'duration_minutes', sv.duration_minutes,
               'image_url', sv.image_url, 'category_id', sv.category_id)), '[]'::jsonb)
             from public.services sv where sv.company_id = _cid and sv.is_active),
    'professionals', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'role_title', p.role_title,
               'photo_url', p.photo_url, 'bio', p.bio, 'position', p.position
             ) order by p.position), '[]'::jsonb)
             from public.professionals p
             where p.company_id = _cid and p.is_active and p.is_visible and not p.is_default_owner),
    'service_professionals', (select coalesce(jsonb_agg(jsonb_build_object(
               'service_id', sp.service_id, 'professional_id', sp.professional_id)), '[]'::jsonb)
             from public.service_professionals sp
             join public.professionals p
               on p.id = sp.professional_id and p.company_id = sp.company_id
             where sp.company_id = _cid
               and p.is_active and p.is_visible and not p.is_default_owner),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object(
               'customer_name', r.customer_name, 'rating', r.rating,
               'comment', r.comment, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
             from public.reviews r where r.company_id = _cid and r.is_published)
  ) into _result;

  return _result;
end $function$;