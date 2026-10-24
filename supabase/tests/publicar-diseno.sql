-- Guardar y publicar el diseño de la hoja (`…20261019005800_formula_con_diseno.sql`, paso 4.08 prompt 2): `formula_guardar_borrador` con su diseño,
-- `formula_publicar` y el ⚙ (`formula_cambiar_constante`) con `validar_diseno()` y la compilación de `formulas.visibilidad`, `_nivel_en_uso`, y lo
-- que no debe existir (la firma vieja, ayudantes ejecutables, la fórmula entera en `actividad`). Corre después de `humo.sql` y de `tonos.sql`.
-- `scripts/probar-schema.mjs` carga antes `_juego_de_diseno` (casos-de-diseno.json) y `_juego_de_formula`. La dueña es `…0001`.
-- Cada bloque trabaja en su propio origen y lo borra; los tonos «compra», «logistica» y «aduana» que nombran los grupos de las capturas se
-- crean al empezar y se borran al terminar.

create or replace function pg_temp.motivo(p_sql text) returns text language plpgsql as $$
declare v_e text; v_d text; v_h text; v_m text;
begin
  execute p_sql;
  return 'sin error';
exception when others then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  v_e := sqlstate;
  return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
end $$;

create or replace function pg_temp.espera(p_sql text, p_prefijo text) returns void language plpgsql as $$
declare v text := pg_temp.motivo(p_sql);
begin
  if left(v, length(p_prefijo)) <> p_prefijo then raise exception '% debía dar «%», dio «%»', p_sql, p_prefijo, v; end if;
end $$;

create or replace function pg_temp.def_capturas() returns jsonb language sql security definer as $$
  select doc -> 'formulas' -> 'capturas' -> 'definicion' from _juego_de_diseno
$$;
create or replace function pg_temp.params_capturas() returns jsonb language sql security definer as $$
  select doc -> 'formulas' -> 'capturas' -> 'params' from _juego_de_diseno
$$;

-- El diseño de las capturas con «costos»: las tres secciones de «Avanzado» (cif, impuestos, poliza) ver y editar, `fees` sólo editar y la
-- sección de la garantía sólo editar. Con 'sin_garantia' la sección de la garantía dibuja `garantia_pct` y no `garantia` (el aparte sin dibujar).
create or replace function pg_temp.diseno_costos(p_modo text default 'normal') returns jsonb language plpgsql security definer as $$
declare d jsonb := (select doc -> 'casos' -> 0 -> 'diseno' from _juego_de_diseno);
begin
  return jsonb_set(d, '{secciones}', (
    select jsonb_agg(case s ->> 'id'
      when 'cif' then s || '{"nivel_ver": "costos", "nivel_editar": "costos"}'
      when 'impuestos' then s || '{"nivel_ver": "costos", "nivel_editar": "costos"}'
      when 'poliza' then s || '{"nivel_ver": "costos", "nivel_editar": "costos"}'
      when 'garantia' then case when p_modo = 'sin_garantia'
          then jsonb_set(s || '{"nivel_editar": "costos"}', '{items}', '[{"tipo": "celda", "nodo": "garantia_pct", "ancho": "completo"}]')
          else s || '{"nivel_editar": "costos"}' end
      when 'compra' then jsonb_set(s, '{items}', (
          select jsonb_agg(case when i ->> 'nodo' = 'fees' then i || '{"nivel_editar": "costos"}' else i end order by o)
            from jsonb_array_elements(s -> 'items') with ordinality t(i, o)))
      else s end order by n)
    from jsonb_array_elements(d -> 'secciones') with ordinality q(s, n)));
end $$;

-- La visibilidad esperada, escrita a mano: {nodo: {ver, editar}}.
create or replace function pg_temp.mapa(p_ver text, p_editar text, p_nodos text) returns jsonb language sql as $$
  select coalesce(jsonb_object_agg(n, jsonb_build_object('ver', p_ver, 'editar', p_editar)), '{}'::jsonb) from unnest(string_to_array(p_nodos, ',')) n
$$;

create or replace function pg_temp.preparar() returns uuid language plpgsql as $$
declare o uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_publicar', 'Prueba publicar') returning id into o;
  insert into public.tonos (clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  select t.k, initcap(t.k), '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8' from unnest(array['compra', 'logistica', 'aduana']) t(k)
  on conflict (clave) do nothing;
  return o;
end $$;

create or replace function pg_temp.limpiar(p_origen uuid) returns void language plpgsql as $$
begin
  delete from public.origenes where id = p_origen;
  delete from public.tonos where clave in ('compra', 'logistica', 'aduana');
end $$;

-- @test publicar: el diseño de las capturas con «costos» publica y su visibilidad es la calculada a mano; el borrador no la tiene
do $$
declare
  o uuid := pg_temp.preparar(); v_vis jsonb; v_esp jsonb; v_f uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  v_f := public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  if (select visibilidad from public.formulas where id = v_f) is not null then raise exception 'el borrador trae visibilidad'; end if;
  if (select diseno from public.formulas where id = v_f) is distinct from pg_temp.diseno_costos() then raise exception 'el borrador no guardó el diseño'; end if;
  perform public.formula_publicar(o, 'Primera');
  reset role;
  select visibilidad into v_vis from public.formulas where id = v_f;
  v_esp := pg_temp.mapa('todos', 'todos', 'variante,cuenta_especial_usa,mostrar_garantia,tc_oficial,tc_paralelo,tc_unificado,remate,transferencia,transferencia_pct,cuenta_especial,grua,transporte_bolivia,transporte_chile,comision,documentacion,export,nacionalizacion')
        || pg_temp.mapa('todos', 'costos', 'fees,fees_pct,garantia,garantia_pct')
        || pg_temp.mapa('costos', 'costos', 'valor_tabla,factor_dp,fob,seguro,seguro_pct,flete,gasto_puerto,gasto_taller,utilidad,cif,ga,ga_pct,iva,iva_pct,ice,ice_pct,total_impuesto,factura_taller,almacenaje,total_gastos,agencia,gas_sao,factura_venta,almacenaje_salida')
        || '{"total": {"ver": "todos", "editar": null}}'::jsonb;
  if v_vis is distinct from v_esp then
    raise exception 'la visibilidad no es la calculada a mano. Sobran: % Faltan: %',
      (select jsonb_object_agg(k, v_vis -> k) from jsonb_object_keys(v_vis) k where v_vis -> k is distinct from v_esp -> k),
      (select jsonb_object_agg(k, v_esp -> k) from jsonb_object_keys(v_esp) k where v_esp -> k is distinct from v_vis -> k);
  end if;
  if (select estado::text || version from public.formulas where id = v_f) <> 'publicada1' then raise exception 'no quedó publicada v1'; end if;
  -- La auditoría registró la publicación, sin el contenido de la fórmula.
  if not exists (select 1 from public.actividad where tabla = 'formulas' and registro_id = v_f::text and accion = 'formulas.update'
                  and despues ->> 'estado' = 'publicada' and not (despues ? 'definicion')) then
    raise exception 'publicar no quedó en actividad'; end if;
  -- Ni el anio (campo del vehículo) ni lo que no se dibuja viaja.
  if v_vis ? 'anio' then raise exception 'un nodo sin dibujar viaja'; end if;
  perform pg_temp.limpiar(o);
end $$;

-- @test publicar: un aparte que no se dibuja no se edita; un aparte que es el pct de una celda restringida se ve igual (D7: la base lo manda)
do $$
declare
  o uuid := pg_temp.preparar(); v_vis jsonb; v_def jsonb; v_d jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos('sin_garantia'));
  perform public.formula_publicar(o, 'Aparte sin dibujar');
  reset role;
  select visibilidad into v_vis from public.formulas where origen_id = o and estado = 'publicada';
  if v_vis -> 'garantia' is distinct from '{"ver": "todos", "editar": null}'::jsonb then raise exception 'el aparte sin dibujar: %', v_vis -> 'garantia'; end if;
  if v_vis -> 'garantia_pct' is distinct from '{"ver": "todos", "editar": "costos"}'::jsonb then raise exception 'garantia_pct: %', v_vis -> 'garantia_pct'; end if;
  if v_vis -> 'total' is distinct from '{"ver": "todos", "editar": null}'::jsonb then raise exception 'el total: %', v_vis -> 'total'; end if;

  -- 4-9: fees_pct es un aparte y se dibuja como el pct de `fees`, que sólo ve «costos»: el pct se ve igual que el total.
  v_def := jsonb_set(pg_temp.def_capturas(), '{nodos}', (select jsonb_agg(case when n ->> 'id' = 'fees_pct' then n || '{"salida": "aparte"}' else n end order by o2)
                                                       from jsonb_array_elements(pg_temp.def_capturas() -> 'nodos') with ordinality t(n, o2)));
  v_d := jsonb_set(pg_temp.diseno_costos(), '{secciones}', (select jsonb_agg(case when s ->> 'id' = 'compra'
        then jsonb_set(s, '{items}', (select jsonb_agg(case when i ->> 'nodo' = 'fees' then i || '{"nivel_ver": "costos", "nivel_editar": "costos"}' else i end order by o3)
                                        from jsonb_array_elements(s -> 'items') with ordinality t(i, o3))) else s end order by n)
                                  from jsonb_array_elements(pg_temp.diseno_costos() -> 'secciones') with ordinality q(s, n)));
  set local role authenticated;
  perform public.formula_guardar_borrador(o, v_def, pg_temp.params_capturas(), v_d);
  perform public.formula_publicar(o, 'Pct aparte');
  reset role;
  select visibilidad into v_vis from public.formulas where origen_id = o and estado = 'publicada';
  if v_vis -> 'fees' is distinct from '{"ver": "costos", "editar": "costos"}'::jsonb then raise exception 'fees: %', v_vis -> 'fees'; end if;
  if v_vis -> 'fees_pct' is distinct from '{"ver": "todos", "editar": "costos"}'::jsonb then raise exception 'el pct aparte: %', v_vis -> 'fees_pct'; end if;
  perform pg_temp.limpiar(o);
end $$;

-- @test publicar: lo que rechaza (diseño nulo, forma, fórmula que cambió, nivel, sin borrador, conflicto) y que el borrador admite lo incompleto
do $$
declare
  o uuid := pg_temp.preparar(); v_pub uuid; v_def jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  -- Sin borrador: no hay nada que publicar.
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Nada')$f$, o), '22023:-@ No hay borrador');
  -- Guardar valida la fórmula (la regla del validador, no una del diseño).
  perform pg_temp.espera(format($f$select public.formula_guardar_borrador(%L, '{"nodos": []}', '{}', %L)$f$, o, pg_temp.diseno_costos()), '22023:total_unico@');
  -- Un borrador sin diseño se guarda, pero no se publica.
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), null);
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Sin diseño')$f$, o), '22023:diseno_faltante@diseno');
  -- Una forma rota (un campo desconocido) se rechaza al guardar, con la regla en el detalle.
  perform pg_temp.espera(format($f$select public.formula_guardar_borrador(%L, %L, %L, %L)$f$, o, pg_temp.def_capturas(), pg_temp.params_capturas(),
                                jsonb_set(pg_temp.diseno_costos(), '{cabecera,color}', '"rojo"')), '22023:forma@');
  -- Un nivel que no existe, y «costos», que sí.
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(),
          jsonb_set(pg_temp.diseno_costos(), '{secciones,0,nivel_ver}', '"gerencia"'));
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Gerencia')$f$, o), '22023:nivel_inexistente@hoja');
  -- Una fórmula que cambió: el diseño guardado nombra un nodo que ya no está (la fórmula no puede perder uno: el total suma todos).
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(),
          jsonb_insert(pg_temp.diseno_costos(), '{secciones,3,items,0}', '{"tipo": "celda", "nodo": "viejo", "ancho": "completo"}'));
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Cambió')$f$, o), '22023:nodo_inexistente@viejo');
  -- Y al revés: un input nuevo sin celda.
  v_def := jsonb_set(pg_temp.def_capturas(), '{nodos}', (pg_temp.def_capturas() -> 'nodos') || '[{"id": "extra", "tipo": "input", "etiqueta": "Extra", "formato": "usd"}]');
  perform public.formula_guardar_borrador(o, v_def, pg_temp.params_capturas(), pg_temp.diseno_costos());
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Sin celda')$f$, o), '22023:nodo_sin_seccion@extra');
  -- Se arregla y publica; el conflicto con la publicada esperada.
  v_pub := public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Vieja', %L)$f$, o, gen_random_uuid()), 'PT409:');
  perform public.formula_publicar(o, 'Buena', null);
  -- Con la publicada esperada ya vieja, también cuando no queda borrador.
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Otra', %L)$f$, o, gen_random_uuid()), 'PT409:');
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Otra', %L)$f$, o, v_pub), '22023:-@ No hay borrador');
  -- La fórmula también se valida al publicar: un borrador que no pasó por guardar (insertado como postgres) no se publica.
  reset role;
  perform public.formula_descartar_borrador(o);
  insert into public.formulas (origen_id, estado, definicion, params, diseno)
  values (o, 'borrador', '{"nodos": []}', '{}', pg_temp.diseno_costos());
  set local role authenticated;
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Rota')$f$, o), '22023:total_unico@');
  reset role;
  delete from public.formulas where origen_id = o and estado = 'borrador';
  set local role authenticated;
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  -- Sin nota; sin permiso (una persona sin cotizaciones.configurar).
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, '  ')$f$, o), '22023:-@ Publicar pide una nota');
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Yo')$f$, o), '42501:');
  perform pg_temp.espera(format($f$select public.formula_guardar_borrador(%L, %L, %L, null)$f$, o, pg_temp.def_capturas(), pg_temp.params_capturas()), '42501:');
  reset role;
  perform pg_temp.limpiar(o);
end $$;

-- @test publicar: los atajos no agregan nada a la visibilidad (su celda ya trae su nodo con sus mismos niveles): igual con y sin ellos en cada diseño válido del juego
do $$
declare c jsonb; f jsonb; d jsonb; v_sin jsonb; v_n int := 0;
begin
  for c in select x from _juego_de_diseno j, jsonb_array_elements(j.doc -> 'casos') x where (x ->> 'valida')::boolean and x::text like '%"atajos"%' loop
    f := case when c ? 'formula' then (select doc -> 'formulas' -> (c ->> 'formula') from _juego_de_diseno)
              else (select k.value from _juego_de_formula j, jsonb_array_elements(j.doc -> 'casos') k where k.value ->> 'nombre' = c ->> 'formula_de') end;
    d := c -> 'diseno';
    v_sin := jsonb_set(d, '{secciones}', (select jsonb_agg(jsonb_set(s, '{items}', coalesce((select jsonb_agg(i order by o) from jsonb_array_elements(s -> 'items') with ordinality t(i, o)
                                                                                           where i ->> 'tipo' <> 'atajos'), '[]'::jsonb)) order by n)
                                           from jsonb_array_elements(d -> 'secciones') with ordinality q(s, n)));
    if public._compilar_visibilidad(f -> 'definicion', d) is distinct from public._compilar_visibilidad(f -> 'definicion', v_sin) then
      raise exception 'los atajos cambian la visibilidad en «%»', c ->> 'nombre'; end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 3 then raise exception 'sólo % diseños con atajos', v_n; end if;
end $$;

-- @test publicar: un nivel retirado se rechaza al publicar y no frena el ⚙, que copia el diseño y vuelve a compilar la misma visibilidad
do $$
declare
  o uuid := pg_temp.preparar(); v_orig text := pg_get_functiondef('public._niveles_de_cotizacion()'::regprocedure); v_vis1 jsonb; v_f2 uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  perform public.formula_publicar(o, 'v1');
  reset role;
  select visibilidad into v_vis1 from public.formulas where origen_id = o and estado = 'publicada';
  -- «costos» pasa a retirado (lo que hará el 4.09): publicar un diseño que lo usa se rechaza…
  create or replace function public._niveles_de_cotizacion(out niveles text[], out retirados text[]) language sql stable set search_path = ''
    as $f$ select array['costos']::text[], array['costos']::text[] $f$;
  set local role authenticated;
  perform public.formula_guardar_borrador(o, pg_temp.def_capturas(), pg_temp.params_capturas(), pg_temp.diseno_costos());
  perform pg_temp.espera(format($f$select public.formula_publicar(%L, 'Retirado')$f$, o), '22023:nivel_retirado@');
  perform public.formula_descartar_borrador(o);
  -- …pero el ⚙ publica la N+1 con lo que ya usa el nivel retirado.
  v_f2 := public.formula_cambiar_constante(o, 'flete', 1500);
  reset role;
  if (select version from public.formulas where id = v_f2) <> 2 then raise exception 'el ⚙ no publicó la v2'; end if;
  if (select diseno from public.formulas where id = v_f2) is distinct from pg_temp.diseno_costos() then raise exception 'el ⚙ no copió el diseño'; end if;
  if (select visibilidad from public.formulas where id = v_f2) is distinct from v_vis1 then raise exception 'el ⚙ compiló otra visibilidad'; end if;
  if (select (params ->> 'flete')::numeric from public.formulas where id = v_f2) <> 1500 then raise exception 'el ⚙ no cambió la constante'; end if;
  execute v_orig;
  if public._niveles_de_cotizacion() is null then raise exception 'no se restauró _niveles_de_cotizacion'; end if;
  perform pg_temp.limpiar(o);
end $$;

-- @test publicar: el contexto de niveles de hoy es «costos» (sin retirados) y «todos» no figura en la lista
do $$
declare n text[]; r text[];
begin
  select niveles, retirados into n, r from public._niveles_de_cotizacion();
  if n is distinct from array['costos'] or r is distinct from '{}'::text[] then raise exception 'niveles: % retirados: %', n, r; end if;
end $$;

-- @test publicar: _nivel_en_uso mira el diseño de toda versión (archivada, publicada, borrador), en secciones y en ítems, para ver y para editar
do $$
declare
  o uuid := pg_temp.preparar(); d jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  if public._nivel_en_uso('gerencia') is not null then raise exception 'libre figura en uso'; end if;
  d := (select doc -> 'casos' -> 0 -> 'diseno' from _juego_de_diseno);
  -- Cada forma de nombrar un nivel, como una versión archivada distinta (insertadas como postgres: sin validar).
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno) values
    (o, 1, 'archivada', '{"nodos": []}', '{}', jsonb_set(d, '{secciones,0,nivel_ver}', '"n_seccion_ver"')),
    (o, 2, 'archivada', '{"nodos": []}', '{}', jsonb_set(d, '{secciones,0,nivel_editar}', '"n_seccion_editar"')),
    (o, 3, 'archivada', '{"nodos": []}', '{}', jsonb_set(d, '{secciones,2,items,0,nivel_ver}', '"n_item_ver"')),
    (o, 4, 'archivada', '{"nodos": []}', '{}', jsonb_set(d, '{secciones,2,items,0,nivel_editar}', '"n_item_editar"'));
  insert into public.formulas (origen_id, estado, definicion, params, diseno)
  values (o, 'borrador', '{"nodos": []}', '{}', jsonb_set(d, '{secciones,1,nivel_ver}', '"n_borrador"'));
  if public._nivel_en_uso('n_seccion_ver') is null or public._nivel_en_uso('n_seccion_editar') is null
     or public._nivel_en_uso('n_item_ver') is null or public._nivel_en_uso('n_item_editar') is null or public._nivel_en_uso('n_borrador') is null then
    raise exception 'un nivel en uso no figura: % % % % %', public._nivel_en_uso('n_seccion_ver'), public._nivel_en_uso('n_seccion_editar'),
      public._nivel_en_uso('n_item_ver'), public._nivel_en_uso('n_item_editar'), public._nivel_en_uso('n_borrador');
  end if;
  if public._nivel_en_uso('n_seccion') is not null or public._nivel_en_uso('n_otro') is not null then raise exception 'una subcadena o un libre figura en uso'; end if;
  if public._nivel_en_uso('n_item_ver') <> 'Prueba publicar' then raise exception 'dice el origen: %', public._nivel_en_uso('n_item_ver'); end if;
  perform pg_temp.limpiar(o);
end $$;

-- @test publicar: la firma vieja ya no existe, los ayudantes no son de nadie y la fórmula entera no va a actividad
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'formula_guardar_borrador' and pronargs = 4) then raise exception 'quedó la firma vieja de formula_guardar_borrador'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_guardar_borrador') <> 1 then
    raise exception 'formula_guardar_borrador tiene sobrecargas'; end if;
  if not has_function_privilege('authenticated', 'public.formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text)', 'execute')
     or has_function_privilege('anon', 'public.formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text)', 'execute') then
    raise exception 'los grants de formula_guardar_borrador'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname in ('_publicar_formula', '_compilar_visibilidad', '_niveles_de_cotizacion', '_niveles_del_diseno', '_nivel_en_uso', 'formula_auditar')
                and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'un ayudante se puede ejecutar: %', (select string_agg(p.proname, ',') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('_publicar_formula', '_compilar_visibilidad', '_niveles_de_cotizacion', '_niveles_del_diseno', '_nivel_en_uso', 'formula_auditar')
        and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')));
  end if;
  if (select count(*) from public.actividad where tabla = 'formulas') = 0 then raise exception 'formulas no se audita'; end if;
  if exists (select 1 from public.actividad where tabla = 'formulas'
              and (coalesce(antes, '{}') ?| array['definicion', 'params', 'diseno', 'visibilidad'] or coalesce(despues, '{}') ?| array['definicion', 'params', 'diseno', 'visibilidad'])) then
    raise exception 'actividad guarda la fórmula entera';
  end if;
end $$;
