-- `cotizacion_encima()` por cada nivel (paso 4.15-2, E7): quien cotiza encima sin el nivel se lleva a la versión nueva lo tipeado en los nodos del nivel (P2: se guarda),
-- no lo recibe en la respuesta, y `descartados` no cuenta lo oculto que se pierde; con el nivel, recibe todo y lo cuenta. El inventario de lo oculto la registra con este
-- bloque como `cubierta_por`. Corre después de `cotizacion-encima.sql` (usa sus `pg_temp.ce_corre` y `ce_persona`); la dueña es `…0001`.

-- Todas las claves de objeto, las hojas de texto y las numéricas de una respuesta, a cualquier profundidad.
create or replace function pg_temp.cn_hojas(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(distinct t), '{}') from (
    select jsonb_object_keys(h) as t from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) = 'object'
    union all select h #>> '{}' from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) in ('string', 'number')) x
$f$;

-- Una versión del origen: visible (todos), xn y xq (del nivel), total; la v2 ya no tiene xq.
create or replace function pg_temp.cn_publicar(p_o uuid, p_nivel text, p_v2 boolean) returns uuid language plpgsql as $f$
declare v_def jsonb; f uuid; v_ids text[] := case when p_v2 then array['visible', 'xn'] else array['visible', 'xn', 'xq'] end;
begin
  update public.formulas set estado = 'archivada' where origen_id = p_o and estado = 'publicada';
  v_def := jsonb_build_object('nodos', (select jsonb_agg(jsonb_build_object('id', i, 'tipo', 'input', 'etiqueta', 'ETQ-' || i, 'bucket', 'origen')) from unnest(v_ids) i)
                                       || jsonb_build_array(jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
                                                            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', to_jsonb(v_ids), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
                              'buckets', jsonb_build_object('origen', 'tc'));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_o, case when p_v2 then 2 else 1 end, 'publicada', v_def, '{}', '{}',
          jsonb_build_object('visible', '{"ver": "todos", "editar": "todos"}'::jsonb, 'tc', '{"ver": "todos", "editar": "todos"}'::jsonb, 'total', '{"ver": "todos", "editar": null}'::jsonb)
          || (select jsonb_object_agg(i, jsonb_build_object('ver', p_nivel, 'editar', p_nivel)) from unnest(array['xn', 'xq']) i where i = any (v_ids)), now() - interval '1 day')
  returning id into f;
  return f;
end $f$;

-- @test cotizacion_encima: E7 por cada nivel (los de fábrica y uno creado con nivel_crear), sin el nivel se lleva lo oculto sin recibirlo ni contarlo; con él, lo recibe y lo cuenta
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_nuevo uuid := gen_random_uuid(); v_nivel text; v_i int := 0; o uuid; l uuid; v uuid; f uuid; sin uuid; con uuid; a_sin uuid; a_con uuid; r jsonb; v_res jsonb; n jsonb;
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'];
begin
  perform set_config('request.jwt.claim.sub', duena::text, true);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CN');
  reset role;
  foreach v_nivel in array array(select clave from public.cotizaciones_niveles where clave <> 'todos' order by clave) loop
    v_i := v_i + 1;
    insert into public.origenes (clave, nombre) values ('cn_' || v_i, 'CN origen ' || v_i) returning id into o;
    f := pg_temp.cn_publicar(o, v_nivel, false);
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
    values ('CN lead', '7218' || lpad(v_i::text, 4, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
    insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CN vehículo', 'toyota') returning id into v;
    v_res := public.evaluar_formula((select definicion from public.formulas where id = f), '{}',
                                    '{"inputs": {"visible": 1, "xn": 9177.25, "xq": 9188.5}, "banderas": {}, "overrides": {}, "vehiculo": {}, "tablas": {}, "tipos_cambio": {"oficial": 6.96}}', null);
    insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
    values (o, l, v, duena, f, v_res -> 'valores', v_res -> 'fuentes', '{"oficial": 6.96}', v_res -> 'totales', 1) returning id into a_sin;
    insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
    values (o, l, v, duena, f, v_res -> 'valores', v_res -> 'fuentes', '{"oficial": 6.96}', v_res -> 'totales', 1) returning id into a_con;
    perform pg_temp.cn_publicar(o, v_nivel, true);
    sin := pg_temp.ce_persona(variadic v_base);
    con := pg_temp.ce_persona(variadic v_base || array['cotizaciones.nivel.' || v_nivel || '.ver', 'cotizaciones.nivel.' || v_nivel || '.editar']);
    r := pg_temp.ce_corre(sin, format('select public.cotizacion_encima(%L, %L)', gen_random_uuid(), a_sin));
    if r ? 'error' then raise exception 'E7 %: sin: %', v_nivel, r; end if;
    if pg_temp.cn_hojas(r) && array['xn', 'xq', 'ETQ-xn', 'ETQ-xq', '9177.25', '9188.5'] then
      raise exception 'E7 %: sin recibe algo del nivel: %', v_nivel, (select array_agg(h) from unnest(pg_temp.cn_hojas(r)) h where h in ('xn', 'xq', 'ETQ-xn', 'ETQ-xq', '9177.25', '9188.5'));
    end if;
    if (r ->> 'descartados')::int <> 0 then raise exception 'E7 %: sin cuenta lo oculto: %', v_nivel, r ->> 'descartados'; end if;
    select valores into n from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
    if n -> 'xn' is distinct from '9177.25' or n ? 'xq' then raise exception 'E7 %: la nueva de sin no se llevó lo oculto: %', v_nivel, n; end if;
    r := pg_temp.ce_corre(con, format('select public.cotizacion_encima(%L, %L)', gen_random_uuid(), a_con));
    if r ? 'error' or r -> 'valores' -> 'xn' is distinct from '9177.25' or (r ->> 'descartados')::int <> 1 then raise exception 'E7 %: con: %', v_nivel, r; end if;
  end loop;
  if v_i < 2 then raise exception 'E7: esperaba al menos costos y el creado'; end if;
end $$;
rollback;
