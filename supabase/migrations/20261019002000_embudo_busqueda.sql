-- Buscar en el embudo para llegar a lo antiguo de una columna (cierre 1 de la Fase 3).
--
-- Una columna dibuja a lo sumo 500 tarjetas (las de actividad más reciente) y el camino a las demás era la ficha de cada lead.
-- Ahora el tablero y «Ver más» reciben `p_buscar` (el título de la oportunidad o el nombre del lead, al menos 2 caracteres):
-- filtra todas las columnas, y el conteo de cada una («37», «500+») cuenta lo que coincide. Camina
-- `oportunidades_tablero_idx` (la columna de quien mira, por actividad) y filtra: una búsqueda sin resultados recorre la
-- columna entera de la persona (medido en `medir-escala.sql`, con 8.000 en una etapa). Bajo RLS un `ilike` no usa un índice
-- de trigramas (no es `leakproof`), y no hace falta: lo que se recorre es lo que tiene la persona.
-- Mismo permiso y misma RLS: las dos son de invocador.

-- El patrón de una búsqueda: nulo con menos de 2 caracteres; los comodines del texto se escapan.
create or replace function public._embudo_patron(p_texto text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when char_length(btrim(coalesce(p_texto, ''))) < 2 then null
              else '%' || replace(replace(replace(btrim(left(p_texto, 60)), '\', '\\'), '%', '\%'), '_', '\_') || '%' end
$$;

drop function if exists public.embudo_tablero(uuid, integer, integer);
drop function if exists public.embudo_etapa_pagina(uuid, timestamp with time zone, uuid, integer);

create or replace function public.embudo_tablero(p_embudo uuid, p_tope integer DEFAULT 50, p_tope_total integer DEFAULT 500, p_buscar text DEFAULT NULL)
 returns jsonb
 language sql
 stable
 set search_path = ''
as $$
  with tope as (select public._acotar_pagina(p_tope, 50, 100) as n,
                       public._acotar_pagina(p_tope_total, 500, 1000) as total,
                       public._embudo_patron(p_buscar) as patron)
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
            from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta, o.ultima_actividad_en as en, o.id
                    from public.oportunidades o
                    join public.leads l on l.id = o.lead_id
                    left join public.vehiculos v on v.id = o.vehiculo_id
                   where o.etapa_id = s.id
                     and ((select patron from tope) is null
                          or o.titulo ilike (select patron from tope) or l.nombre ilike (select patron from tope))
                   order by o.ultima_actividad_en desc, o.id desc
                   limit (select n from tope)) t), '[]'::jsonb))
        order by s.orden, s.id)
      from public.embudos_etapas s
      cross join lateral (select count(*)::int as leidas
                            from (select 1 from public.oportunidades o2 join public.leads l2 on l2.id = o2.lead_id
                                   where o2.etapa_id = s.id
                                     and ((select patron from tope) is null
                                          or o2.titulo ilike (select patron from tope) or l2.nombre ilike (select patron from tope))
                                  limit (select total from tope) + 1) q) c
      where s.embudo_id = x.id), '[]'::jsonb))
  from public.embudos x where x.id = p_embudo;
$$;
revoke all on function public.embudo_tablero(uuid, integer, integer, text) from public, anon;
grant execute on function public.embudo_tablero(uuid, integer, integer, text) to authenticated;

create or replace function public.embudo_etapa_pagina(p_etapa uuid, p_antes_en timestamp with time zone, p_antes_id uuid, p_tope integer DEFAULT 50, p_buscar text DEFAULT NULL)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_n int := public._acotar_pagina(p_tope, 50, 100);
  v_patron text := public._embudo_patron(p_buscar);
  v_tarjetas jsonb;
  v_hay_mas boolean;
begin
  if p_antes_en is null then
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
               and (v_patron is null or o.titulo ilike v_patron or l.nombre ilike v_patron)
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  else
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
               and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
               and (v_patron is null or o.titulo ilike v_patron or l.nombre ilike v_patron)
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  end if;
  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', v_hay_mas);
end;
$$;
revoke all on function public.embudo_etapa_pagina(uuid, timestamp with time zone, uuid, integer, text) from public, anon;
grant execute on function public.embudo_etapa_pagina(uuid, timestamp with time zone, uuid, integer, text) to authenticated;
