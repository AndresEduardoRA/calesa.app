-- Cotizar encima (paso 4.15-2, P1–P6, P9 y P10): `cotizacion_encima(p_id, p_anterior)` crea en el acto la versión nueva (N+1) de una cotización:
-- una cotización nueva, preventa, con `cotizacion_padre_id` = la anterior y `version` + 1, su propio número, el lead y el vehículo de la anterior, la
-- fórmula publicada y los tipos de cambio de hoy, y lo tipeado en la anterior de cada nodo que sigue en la versión de hoy (también lo que quien
-- cotiza no ve: se guarda y no se le devuelve). La anterior no cambia. Una versión nueva viva por anterior (P3): `cotizaciones_encima_unica`.
-- Sin `p_abierta`: no sale de una hoja que la persona vio ni lleva una hora del cliente (lo dice docs/DECISIONES.md, en el paso 4.15-2).
-- docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».

-- Una versión nueva viva por anterior. Una en la papelera no cuenta (y restaurarla cuando ya hay otra choca: 4-70).
create unique index cotizaciones_encima_unica on public.cotizaciones (cotizacion_padre_id) where eliminado_en is null;
comment on index public.cotizaciones_encima_unica is 'Una versión nueva (cotizar encima) viva por cotización anterior (P3 del 4.15). La lee _cotizacion_cadena y la ordena cotizacion_encima.';

-- Lo que se lleva de la anterior a la versión de hoy: lo tipeado de cada nodo que sigue con un tipo que lo acepta (`_cotizacion_entradas_de` por la definición de
-- hoy, sin mirar quién lo ve: lo pone la base), y la variante sólo si es una de las opciones de hoy. Devuelve la entrada del motor. Pura y de nadie.
create function public._cotizacion_lo_que_se_lleva(p_def jsonb, p_entrada jsonb, p_valores jsonb, p_fuentes jsonb) returns jsonb
  language sql stable
  set search_path = ''
as $$
  select p_entrada || (r - 'variante')
         || case when exists (select 1 from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n cross join lateral jsonb_array_elements(coalesce(n -> 'opciones', '[]'::jsonb)) o
                               where n ->> 'tipo' = 'opcion' and o ->> 'clave' = r ->> 'variante')
                 then jsonb_build_object('variante', r -> 'variante') else '{}'::jsonb end
    from (select public._cotizacion_entradas_de(p_def, p_valores, p_fuentes) as r) x;
$$;
revoke all on function public._cotizacion_lo_que_se_lleva(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._cotizacion_lo_que_se_lleva(jsonb, jsonb, jsonb, jsonb) to service_role;
comment on function public._cotizacion_lo_que_se_lleva(jsonb, jsonb, jsonb, jsonb) is 'La entrada del motor para cotizar encima: lo tipeado en la anterior (valores y fuentes) de cada nodo que sigue en la definición de hoy con un tipo que lo acepta, y la variante si es una opción de hoy. De nadie; la llama cotizacion_encima.';

-- Cuántas entradas tipeadas de la anterior que quien llama VE en la versión de la anterior no llegan a la nueva: su nodo no sigue, su tipo ya no las acepta, una
-- variante que no es opción de hoy o un override que el motor descartó. Lo oculto que se pierde no se cuenta (no delata cuántos nodos ocultos había). De nadie.
create function public._cotizacion_descartados(p_def_ant jsonb, p_visibles text[], p_valores jsonb, p_fuentes jsonb, p_lleva jsonb, p_res jsonb) returns integer
  language sql stable
  set search_path = ''
as $$
  with ant as (select public._cotizacion_entradas_de(p_def_ant, p_valores, p_fuentes) as e),
  descartados as (select coalesce(jsonb_agg(d ->> 'id'), '[]'::jsonb) as ids from jsonb_array_elements(coalesce(p_res -> 'overrides_descartados', '[]'::jsonb)) d)
  select (select count(*) from ant, jsonb_each(ant.e -> 'inputs') k where k.key = any (p_visibles) and not coalesce(p_lleva -> 'inputs', '{}'::jsonb) ? k.key)::int
       + (select count(*) from ant, jsonb_each(ant.e -> 'banderas') k where k.key = any (p_visibles) and not coalesce(p_lleva -> 'banderas', '{}'::jsonb) ? k.key)::int
       + (select count(*) from ant, descartados, jsonb_each(ant.e -> 'overrides') k
           where k.key = any (p_visibles) and (not coalesce(p_lleva -> 'overrides', '{}'::jsonb) ? k.key or descartados.ids ? k.key))::int
       + (select count(*) from ant, jsonb_array_elements(coalesce(p_def_ant -> 'nodos', '[]'::jsonb)) n
           where n ->> 'tipo' = 'opcion' and n ->> 'id' = any (p_visibles) and ant.e ? 'variante' and (p_lleva -> 'variante') is distinct from (ant.e -> 'variante'))::int;
$$;
revoke all on function public._cotizacion_descartados(jsonb, text[], jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._cotizacion_descartados(jsonb, text[], jsonb, jsonb, jsonb, jsonb) to service_role;
comment on function public._cotizacion_descartados(jsonb, text[], jsonb, jsonb, jsonb, jsonb) is 'Cuántas entradas tipeadas de la anterior que quien llama ve (p_visibles, en la versión de la anterior) no llegan a la versión nueva (no siguen, no se aceptan, variante que ya no es opción u override descartado por el motor). De nadie; la llama cotizacion_encima.';

create function public.cotizacion_encima(p_id uuid, p_anterior uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  c public.cotizaciones; ant public.cotizaciones; a record;
  v_formula uuid; v_vuelta int := 0; v_enc uuid; v_obligatorio boolean;
  v_lleva jsonb; v_modo_tc text; v_bs boolean; v_res jsonb; v_total_base numeric; v_constraint text; v_desc int;
begin
  perform public.assert_activo();
  if p_id is null or p_anterior is null then
    raise exception 'Faltan el identificador y la cotización anterior.' using errcode = '22023';
  end if;
  -- La anterior, antes que todo lo demás: una que no existe, está en la papelera o no se ve da el mismo error, con o sin permiso de cotizar y vea o no su lead.
  if not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  perform public.assert_permiso('cotizaciones.crear', ant.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant.origen_id);
  if ant.lead_id is null then
    raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
  end if;
  if not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El intento, como en `cotizacion_crear` (el mismo candado): una mía viva con ese id es la de este intento si es de esta anterior.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.eliminado_en is null;
  if found then
    if c.cotizacion_padre_id is distinct from p_anterior then
      raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La anterior `for share` (choca con guardarla y con mandarla a la papelera) y otra vez visible; se relee lo que quedó.
  perform 1 from public.cotizaciones x where x.id = p_anterior and x.eliminado_en is null for share;
  if not found or not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  -- Una versión nueva viva por anterior (P3): de la que se ve, su id en el hint; de la que no, sólo que existe (P11).
  select x.id into v_enc from public.cotizaciones x where x.cotizacion_padre_id = p_anterior and x.eliminado_en is null limit 1;   -- cotizaciones_encima_unica
  if v_enc is not null and public.puede_cotizacion(v_enc, 'cotizaciones.ver') then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima', hint = v_enc::text;
  elsif v_enc is not null then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
  end if;

  -- El lead (bloquear y volver a mirar) y el vehículo de la anterior.
  perform 1 from public.leads l where l.id = ant.lead_id and l.eliminado_en is null for key share;
  if not found or not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if ant.vehiculo_id is not null then
    perform public._cotizacion_vehiculo(ant.vehiculo_id);
  else
    select coalesce((select e.vehiculo_obligatorio_al_cotizar from public.ajustes_empresa e where e.id = 1), true) into v_obligatorio;
    if v_obligatorio then
      raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
    end if;
  end if;

  -- La publicada de hoy, `for share` (como en `cotizacion_crear`).
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = ant.origen_id and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- La versión y las tarifas de hoy, con lo que se lleva de la anterior (P2: también lo que quien llama no ve); el modo de la anterior si sigue (si no, el primero de hoy) y
  -- «Ver total Bs» si hoy se ofrece. Un override llevado que el motor descarta no falla (nadie lo mandó): cuenta en `descartados`.
  select * into a from public._cotizacion_armar('{}'::jsonb, null, ant.origen_id, ant.vehiculo_id, v_formula);
  v_lleva := public._cotizacion_lo_que_se_lleva(a.definicion, a.entrada, ant.valores, ant.fuentes);
  select coalesce((select m ->> 'clave' from jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m where m ->> 'clave' = ant.modo_tc),
                  case when ant.modo_tc is not null then f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' end),
         ant.ver_total_bs and coalesce((f.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)
    into v_modo_tc, v_bs from public.formulas f where f.id = v_formula;
  v_res := public.evaluar_formula(a.definicion, a.params, v_lleva, public._cotizacion_modo(v_formula, v_modo_tc));
  v_total_base := public._cotizacion_guardable(v_res, '{}'::jsonb);
  v_desc := public._cotizacion_descartados((select f.definicion from public.formulas f where f.id = ant.formula_id),
                                           coalesce(array(select n.nodo from public._nodos_visibles(ant.formula_id) n), '{}'), ant.valores, ant.fuentes, v_lleva, v_res);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, notas, cotizacion_padre_id, version)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, ant.titulo, ant.notas, p_anterior, ant.version + 1)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_encima_unica' then
      raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', false, 'descartados', v_desc);
end $$;

revoke all on function public.cotizacion_encima(uuid, uuid) from public, anon;
grant execute on function public.cotizacion_encima(uuid, uuid) to authenticated, service_role;

comment on function public.cotizacion_encima(uuid, uuid) is 'Cotizar encima (N+1): crea en el acto una cotización nueva, preventa, sobre la anterior (cotizacion_padre_id, version + 1, su número, su lead y su vehículo) con la publicada y las tarifas de hoy y lo tipeado de la anterior en los nodos que siguen (también lo que quien llama no ve; no se le devuelve). La anterior no cambia; una versión nueva viva por anterior (PT409 ya_tiene_encima). Pide ver la anterior y su lead, cotizaciones.crear y cotizaciones.ver del origen. Idempotente por el id del intento. Devuelve la respuesta de cotizacion_leer, repetido y descartados (lo que quien llama ve y se pierde). docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».';

-- Dónde se aplican los permisos (la nube no vuelve a correr el seed).
update public.permisos set aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_hoja_guardada, cotizacion_crear, cotizacion_encima, cotizacion_guardar'
 where clave = 'cotizaciones.ver';
update public.permisos set aplicado_en = 'cotizacion_crear, cotizacion_encima, cotizacion_hoja, cotizacion_evaluar, cotizacion_tabla' where clave = 'cotizaciones.crear';
