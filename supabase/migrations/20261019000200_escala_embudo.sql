-- Escala (9e): el kanban con una columna de miles y las oportunidades de un lead.
--
-- Medido con 8.000 oportunidades de la dueña en una sola etapa (`pnpm db:medir:volumen`):
--   * `embudo_tablero` contaba cada columna con un `count(*)` sin tope (210 ms, y crece con la etapa);
--   * «Ver más» usaba un solo texto con `p_antes_en is null or (…)`: con y sin cursor son dos consultas
--     distintas para el plan genérico de plpgsql (`.claude/rules/escala.md`);
--   * `lead_oportunidades` leía todas las de un lead.
--
-- 1. `embudo_tablero(p_embudo, p_tope, p_tope_total)`: el total de cada columna se cuenta sobre un
--    subselect con `limit p_tope_total + 1` y se devuelve acotado: `total` (a lo sumo el tope) y
--    `total_hay_mas` (había más). Nadie ve nunca un total exacto. `hay_mas` sigue diciendo si hay más
--    tarjetas que las que trae la primera página.
-- 2. `embudo_etapa_pagina` es plpgsql con una consulta para la primera página y otra para después del
--    cursor: la segunda es una condición de índice sobre `oportunidades_tablero_idx`.
-- 3. `lead_oportunidades` trae a lo sumo 100 (las abiertas primero) y dice `hay_mas`.
-- La firma cambia (un parámetro más): se borra la anterior para que `rpc()` no encuentre dos.

drop function if exists public.embudo_tablero(uuid, int);

-- El kanban de un embudo propio: sus etapas, el total acotado de cada una y las primeras `p_tope`
-- tarjetas (las que se movieron más recientemente). Nulo si el embudo no es de quien mira.
-- Índice: `oportunidades_tablero_idx (usuario_id, etapa_id, ultima_actividad_en desc, id desc)`.
create or replace function public.embudo_tablero(p_embudo uuid, p_tope int default 50, p_tope_total int default 500)
returns jsonb language sql stable set search_path = '' as $$
  with tope as (select least(greatest(coalesce(p_tope, 50), 1), 100) as n,
                       least(greatest(coalesce(p_tope_total, 500), 1), 1000) as total)
  select jsonb_build_object(
    'embudo', jsonb_build_object('id', x.id, 'nombre', x.nombre, 'es_default', x.es_default, 'actualizado_en', x.actualizado_en),
    'columnas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                   'es_inicial', s.es_inicial, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
        'total', least(c.leidas, (select total from tope)),
        'total_hay_mas', c.leidas > (select total from tope),
        'hay_mas', c.leidas > (select n from tope),
        'tarjetas', coalesce((
          select jsonb_agg(t.tarjeta order by t.en desc, t.id desc)
            from (select public._tarjeta_json(o, jsonb_build_object('id', l.id, 'numero', l.numero, 'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta, o.ultima_actividad_en as en, o.id
                    from public.oportunidades o
                    join public.leads l on l.id = o.lead_id
                    left join public.vehiculos v on v.id = o.vehiculo_id
                   where o.etapa_id = s.id
                   order by o.ultima_actividad_en desc, o.id desc
                   limit (select n from tope)) t), '[]'::jsonb))
        order by s.orden, s.id)
      from public.embudos_etapas s
      cross join lateral (select count(*)::int as leidas
                            from (select 1 from public.oportunidades o2 where o2.etapa_id = s.id
                                  limit (select total from tope) + 1) q) c
      where s.embudo_id = x.id), '[]'::jsonb))
  from public.embudos x where x.id = p_embudo;
$$;
revoke all on function public.embudo_tablero(uuid, int, int) from public, anon;
grant execute on function public.embudo_tablero(uuid, int, int) to authenticated;

-- «Ver más» de una columna: las siguientes después de (`p_antes_en`, `p_antes_id`). Dos consultas, con y
-- sin cursor; ambas por `oportunidades_tablero_idx`.
create or replace function public.embudo_etapa_pagina(p_etapa uuid, p_antes_en timestamptz, p_antes_id uuid, p_tope int default 50)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_n int := least(greatest(coalesce(p_tope, 50), 1), 100);
  v_tarjetas jsonb;
  v_hay_mas boolean;
begin
  if p_antes_en is null then
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id, 'numero', l.numero, 'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  else
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id, 'numero', l.numero, 'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
               and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  end if;
  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', v_hay_mas);
end;
$$;
revoke all on function public.embudo_etapa_pagina(uuid, timestamptz, uuid, int) from public, anon;
grant execute on function public.embudo_etapa_pagina(uuid, timestamptz, uuid, int) to authenticated;

-- Las oportunidades de quien mira sobre un lead (la sección de la ficha), con su etapa y su embudo, y si
-- puede crear (cartera + `leads.editar`). Las abiertas primero; a lo sumo 100 (`hay_mas` si hay otras). Una
-- sola lectura de 101 (la policy de `oportunidades` cuesta lo mismo en cada consulta).
create or replace function public.lead_oportunidades(p_lead uuid)
returns jsonb language sql stable set search_path = '' as $$
  with leidas as (
    select public._oportunidad_json(o) || jsonb_build_object(
             'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                        'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
             'embudo', jsonb_build_object('id', e.id, 'nombre', e.nombre)) as json,
           (o.estado = 'abierta') as abierta, o.ultima_actividad_en as en, o.id,
           row_number() over (order by (o.estado = 'abierta') desc, o.ultima_actividad_en desc, o.id desc) as k
      from public.oportunidades o
      join public.embudos e on e.id = o.embudo_id
      join public.embudos_etapas s on s.id = o.etapa_id
     where o.lead_id = p_lead
     order by (o.estado = 'abierta') desc, o.ultima_actividad_en desc, o.id desc
     limit 101)
  select jsonb_build_object(
    'puedo_crear', public.puede_actuar_lead(p_lead, 'leads.editar'),
    'hay_mas', coalesce(bool_or(l.k > 100), false),
    'oportunidades', coalesce(jsonb_agg(l.json order by l.abierta desc, l.en desc, l.id desc) filter (where l.k <= 100), '[]'::jsonb))
  from leidas l;
$$;
revoke all on function public.lead_oportunidades(uuid) from public, anon;
grant execute on function public.lead_oportunidades(uuid) to authenticated;
