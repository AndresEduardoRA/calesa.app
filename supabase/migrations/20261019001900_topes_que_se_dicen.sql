-- Los topes se dicen (cierre 1 de la Fase 3): cada lista de vehículos que cortaba en silencio lee uno de más, y la pantalla
-- dice «Mostrando los N más recientes» con el mismo texto y en el mismo lugar que el resto de la app (`<AvisoDeTope>`).
-- Los vínculos de un vehículo (50) y sus interesados (100); los vinculados (100), los interesados (100) y el historial (50)
-- de un lead; el selector «Agregar vehículo» (20). El historial de tipos de cambio (30) lee uno de más desde la app.
-- Mismas firmas, mismos permisos: sólo el `limit`.

create or replace function public.vehiculo_interesados(p_vehiculo uuid)
 returns table (lead_id uuid, lead_nombre text, lead_numero bigint, lead_numero_propio integer, nota text,
                creado_en timestamptz, por_nombre text)
 language sql stable set search_path = '' as $$
  select i.lead_id, l.nombre, g.numero, np.numero, i.nota, i.creado_en, p.nombre
  from public.vehiculos_interesados i
  join public.leads l on l.id = i.lead_id
  left join public.leads_numeros_globales g on g.lead_id = l.id
  left join public.leads_numeros_propios np on np.lead_id = l.id
  left join public.perfiles p on p.id = i.usuario_id
  where i.vehiculo_id = p_vehiculo
  order by i.creado_en desc, i.lead_id
  -- Uno de más: la pantalla dice «Mostrando los 100 más recientes» si los hay (cierre 1).
  limit 101;
$$;

create or replace function public.vehiculo_vinculos(p_vehiculo uuid)
 returns table (lead_id uuid, lead_nombre text, lead_numero bigint, lead_numero_propio integer, desde timestamptz,
                hasta timestamptz, por_nombre text)
 language sql stable set search_path = '' as $$
  select k.lead_id, l.nombre, g.numero, np.numero, k.desde, k.hasta, p.nombre
  from public.vehiculos_vinculos k
  left join public.leads l on l.id = k.lead_id
  left join public.leads_numeros_globales g on g.lead_id = l.id
  left join public.leads_numeros_propios np on np.lead_id = l.id
  left join public.perfiles p on p.id = k.usuario_id
  where k.vehiculo_id = p_vehiculo
  -- El vigente primero; después, del más reciente al más viejo.
  order by (k.hasta is not null), k.desde desc, k.id desc
  -- Uno de más: la pantalla dice «Mostrando los 50 más recientes» si los hay (cierre 1).
  limit 51;
$$;

create or replace function public.vehiculos_para_lead(p_lead uuid, p_texto text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_texto text := nullif(btrim(left(coalesce(p_texto, ''), 60)), '');
  v_numero bigint;
  v_patron text;
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return '[]'::jsonb;
  end if;
  if v_texto ~ '^#?[0-9]{1,12}$' then
    v_numero := ltrim(v_texto, '#')::bigint;
  end if;
  v_patron := '%' || replace(replace(replace(coalesce(v_texto, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
             'vinculado_aqui', v.lead_id is not distinct from p_lead,
             'vinculado_a_otro', v.lead_id is not null and v.lead_id <> p_lead,
             'otro_lead', case when v.lead_id is not null and v.lead_id <> p_lead then
                            (select jsonb_build_object('nombre', l.nombre, 'numero', g.numero, 'numero_propio', np.numero)
                              from public.leads l
                              left join public.leads_numeros_globales g on g.lead_id = l.id
                              left join public.leads_numeros_propios np on np.lead_id = l.id
                             where l.id = v.lead_id) end,
             'reemplazable', v.lead_id is not null and v.lead_id <> p_lead and public.puede_actuar_lead(v.lead_id, 'leads.editar'),
             'interesado', exists (select 1 from public.vehiculos_interesados i where i.vehiculo_id = v.id and i.lead_id = p_lead))
           order by v.creado_en desc, v.id desc)
      from (select * from public.vehiculos x
             where v_texto is null
                or x.numero = v_numero
                or x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron
             order by x.creado_en desc, x.id desc
             -- Uno de más: la pantalla dice «Mostrando los primeros 20» y que escribir afina (cierre 1).
             limit 21) v), '[]'::jsonb);
end;
$$;

create or replace function public.lead_vehiculos(p_lead uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return jsonb_build_object('vinculados', '[]'::jsonb, 'interesados', '[]'::jsonb, 'historial', '[]'::jsonb,
                              'puedo_actuar', false);
  end if;
  return jsonb_build_object(
    'vinculados', coalesce((
      select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
               'desde', (select k.desde from public.vehiculos_vinculos k where k.vehiculo_id = v.id and k.hasta is null))
             order by v.numero desc)
        from (select * from public.vehiculos x where x.lead_id = p_lead order by x.numero desc limit 101) v), '[]'::jsonb),
    'interesados', coalesce((
      select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
               'nota', i.nota, 'marcado_en', i.creado_en, 'vinculado_aqui', v.lead_id is not distinct from p_lead)
             order by i.creado_en desc, v.id)
        from (select * from public.vehiculos_interesados y where y.lead_id = p_lead order by y.creado_en desc limit 101) i
        join public.vehiculos v on v.id = i.vehiculo_id), '[]'::jsonb),
    'historial', coalesce((
      select jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'titulo', v.titulo, 'numero', v.numero,
                                          'desde', k.desde, 'hasta', k.hasta)
             order by k.hasta desc, k.id desc)
        from (select * from public.vehiculos_vinculos z where z.lead_id = p_lead and z.hasta is not null
               order by z.hasta desc, z.id desc limit 51) k
        join public.vehiculos v on v.id = k.vehiculo_id), '[]'::jsonb),
    'puedo_actuar', public.puede_actuar_lead(p_lead, 'leads.editar'));
end;
$$;
