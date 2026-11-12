-- La bandeja de logística en Inicio (paso 6.12-1, C7–C10): `logistica_bandeja(p_tope)` con tres listas cortas (demoradas, trabados, por aprobar),
-- cada una `{ filas, hay_mas }`; nunca un conteo. `security definer` y no invocadora, como la cadena (6.02-2): el alcance se resuelve una vez por origen
-- (`_logistica_alcance`, el menor de `logistica.ver` y `vehiculos.ver`) y se aplica a la fila con el predicado de la policy de `vehiculos`. Se lee por
-- rutas, cada una con su `order by … limit`.
--
-- Trabado (GLOSARIO): una unidad demorada a la que le falta al menos un requisito bloqueante para entrar a su fase siguiente (la activa de menor orden
-- entre las que tienen transición desde la suya). Se evalúan sólo las primeras 50 demoradas.

-- Las demoradas que ve quien mira: por cada par (origen visible, fase que alerta) hasta `p_n` unidades por `vehiculos_cadena_idx`; quien llama las junta
-- y ordena por `vence` (la más pasada de su límite primero).
create function public._bandeja_demoradas(p_n integer)
returns table (id uuid, titulo text, origen_id uuid, fase_id uuid, fase text, fase_desde timestamptz, dias integer, vence timestamptz)
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
#variable_conflict use_column
declare v_uid uuid := (select auth.uid()); p record;
begin
  if v_uid is null then
    return;
  end if;
  for p in
    select fl.origen_id as o, f.id as f, f.nombre, x.dias, a.alc
      from public.flujos fl
      cross join lateral (select public._logistica_alcance(fl.origen_id) as alc) a
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id is not null and a.alc is not null and x.dias is not null
  loop
    return query
      -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, rango de fase_desde.
      select v.id, v.titulo, v.origen_id, v.fase_id, p.nombre, v.fase_desde, p.dias, v.fase_desde + make_interval(days => p.dias)
        from public.vehiculos v
       where v.origen_id = p.o and v.fase_id = p.f and v.eliminado_en is null and v.fase_desde < now() - make_interval(days => p.dias)
         and (p.alc = 'todos' or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       order by v.fase_desde, v.id
       limit p_n;
  end loop;
end;
$$;

revoke all on function public._bandeja_demoradas(integer) from public, anon, authenticated;
grant execute on function public._bandeja_demoradas(integer) to service_role;

-- Los trabados entre las demoradas ya leídas (en su orden): `{ filas, hay_mas }` con hasta `p_n`.
create function public._bandeja_trabados(p_demoradas jsonb, p_n integer) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare r record; v_sig uuid; v_sig_nombre text; v_motivo text; v_filas jsonb := '[]'::jsonb; v_k int := 0;
begin
  for r in select (e ->> 'id')::uuid as id, e ->> 'titulo' as titulo, (e ->> 'fase_id')::uuid as fase_id, e ->> 'fase' as fase, e -> 'fase_desde' as fase_desde
             from jsonb_array_elements(p_demoradas) with ordinality x(e, i) order by x.i loop
    v_sig := null; v_sig_nombre := null; v_motivo := null;
    select f.id, f.nombre into v_sig, v_sig_nombre
      from public.fases_transiciones t join public.fases f on f.id = t.a_fase_id
     where t.de_fase_id = r.fase_id and f.activa
     order by f.orden, f.id limit 1;
    continue when v_sig is null;
    select q.descripcion into v_motivo
      from public.evaluar_requisitos(r.id, null, v_sig) q join public.fases_requisitos fr on fr.id = q.requisito_id
     where q.bloqueante and not q.cumplido
     order by fr.orden, fr.id limit 1;
    continue when v_motivo is null;
    v_k := v_k + 1;
    exit when v_k > p_n;
    v_filas := v_filas || jsonb_build_object('id', r.id, 'titulo', r.titulo, 'fase', r.fase, 'fase_desde', r.fase_desde,
                                             'fase_siguiente', v_sig_nombre, 'motivo', v_motivo);
  end loop;
  return jsonb_build_object('filas', v_filas, 'hay_mas', v_k > p_n);
end;
$$;

revoke all on function public._bandeja_trabados(jsonb, integer) from public, anon, authenticated;
grant execute on function public._bandeja_trabados(jsonb, integer) to service_role;

-- Los documentos por aprobar de vehículos en los orígenes donde quien mira tiene `logistica.documentos.aprobar` y ve la logística (el menor alcance de
-- las tres claves): `{ filas, hay_mas }` con hasta `p_n`, los más viejos primero.
create function public._bandeja_por_aprobar(p_n integer) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_origenes uuid[]; v_todos uuid[]; v_filas jsonb;
begin
  select coalesce(array_agg(x.o), '{}'), coalesce(array_agg(x.o) filter (where x.alc = 'todos' and x.apr = 'todos'), '{}')
    into v_origenes, v_todos
    from (select fl.origen_id as o, public._logistica_alcance(fl.origen_id) as alc,
                 public.alcance_de('logistica.documentos.aprobar', fl.origen_id) as apr
            from public.flujos fl where fl.ambito = 'vehiculos' and fl.origen_id is not null) x
   where x.alc is not null and x.apr is not null;
  if v_uid is null or cardinality(v_origenes) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'hay_mas', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'vehiculo_id', y.vehiculo_id, 'titulo', y.titulo, 'tipo', y.tipo, 'creado_en', y.creado_en)
                            order by y.creado_en, y.id), '[]'::jsonb)
    into v_filas
    from (
      -- documentos_por_revisar_idx (creado_en, id) where subido y vivo: una cola corta.
      select d.id, d.vehiculo_id, v.titulo, t.nombre as tipo, d.creado_en
        from public.documentos d
        join public.vehiculos v on v.id = d.vehiculo_id
        join public.tipos_documento t on t.id = d.tipo_documento_id
       where d.estado = 'subido' and d.eliminado_en is null and v.eliminado_en is null and v.origen_id = any (v_origenes)
         and (v.origen_id = any (v_todos) or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       order by d.creado_en, d.id
       limit p_n + 1
    ) y;
  return jsonb_build_object('filas', coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(v_filas) with ordinality z(e, i) where i <= p_n),
                                              '[]'::jsonb),
                            'hay_mas', jsonb_array_length(v_filas) > p_n);
end;
$$;

revoke all on function public._bandeja_por_aprobar(integer) from public, anon, authenticated;
grant execute on function public._bandeja_por_aprobar(integer) to service_role;

create function public.logistica_bandeja(p_tope integer default 5) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  n int := public._acotar_pagina(p_tope, 5, 20);
  v_vacia constant jsonb := '{"filas": [], "hay_mas": false}';
  v_dem jsonb;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('demoradas', v_vacia, 'trabados', v_vacia, 'por_aprobar', v_vacia);
  end if;
  -- Las primeras 50 demoradas (las de trabados); las primeras n son la lista de demoradas.
  select coalesce(jsonb_agg(to_jsonb(d) - 'vence' order by d.vence, d.id), '[]'::jsonb) into v_dem
    from (select * from public._bandeja_demoradas(50) x order by x.vence, x.id limit 50) d;
  return jsonb_build_object(
    'demoradas', jsonb_build_object(
      'filas', coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(v_dem) with ordinality z(e, i) where i <= n), '[]'::jsonb),
      'hay_mas', jsonb_array_length(v_dem) > n),
    'trabados', public._bandeja_trabados(v_dem, n),
    'por_aprobar', public._bandeja_por_aprobar(n));
end;
$$;

revoke all on function public.logistica_bandeja(integer) from public, anon;
grant execute on function public.logistica_bandeja(integer) to authenticated, service_role;

comment on function public.logistica_bandeja(integer) is
  'Bandeja de logística en Inicio (6.12): { demoradas, trabados, por_aprobar }, cada una { filas, hay_mas } con hasta p_tope (5, máximo 20); sin conteo. Sólo lo de los orígenes que quien mira ve (el menor de logistica.ver y vehiculos.ver; por aprobar, además logistica.documentos.aprobar).';
