-- validar_diseno() contra validarDiseno() de TS (paso 4.08, prompt 1; docs/COTIZADOR.md › «El diseño de la hoja»).
-- `scripts/probar-schema.mjs` carga antes los JSON en tablas temporales (la base no lee archivos del repo):
--   _juego_de_diseno    ← src/modules/cotizaciones/entities/casos-de-diseno.json (los 221 casos, una regla por caso)
--   _juego_de_formula   ← src/modules/cotizaciones/entities/casos-de-formula.json (las fórmulas que nombra «formula_de»)
--   _corpus_de_diseno   ← supabase/tests/corpus-de-diseno.json (el corpus diferencial: los diseños válidos mutados)
-- Un rechazo cuenta sólo si es 22023 y su DETAIL es el código de una regla: los errores propios de jsonb de Postgres también son
-- 22023, pero sin DETAIL, y no son un rechazo del diseño.

-- `pg_temp.paridad_de_diseno(casos)` corre cada caso y devuelve lo esperado y lo visto (`válida`, `regla@donde` o `lanzó …`).
-- La fórmula de un caso es una clave de «formulas» del juego o el nombre de un caso válido de casos-de-formula.json.
create function pg_temp.formula_del_caso(p_caso jsonb) returns jsonb language sql as $$
  select case when p_caso ? 'formula' then (select doc -> 'formulas' -> (p_caso ->> 'formula') from _juego_de_diseno)
              else (select c.value from _juego_de_formula j, jsonb_array_elements(j.doc -> 'casos') c
                     where c.value ->> 'nombre' = p_caso ->> 'formula_de') end
$$;

create function pg_temp.texto_de(p_lista jsonb) returns text[] language sql as $$
  select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p_lista) x
$$;

create function pg_temp.paridad_de_diseno(p_casos jsonb)
returns table (nombre text, esperado text, visto text) language plpgsql as $$
declare
  v_caso jsonb;
  v_f jsonb;
  v_ctx jsonb;
  v_estado text;
  v_detalle text;
  v_pista text;
  v_mensaje text;
begin
  for v_caso in select c.value from jsonb_array_elements(p_casos) c loop
    nombre := v_caso ->> 'nombre';
    esperado := case when (v_caso -> 'valida') = 'true'::jsonb then 'válida'
                     else (v_caso -> 'motivo' ->> 'regla') || '@' || coalesce(v_caso -> 'motivo' ->> 'donde', '') end;
    v_f := pg_temp.formula_del_caso(v_caso);
    v_ctx := coalesce(v_caso -> 'contexto', (select doc -> 'contexto' from _juego_de_diseno));
    begin
      perform public.validar_diseno(v_f -> 'definicion', v_caso -> 'diseno', pg_temp.texto_de(v_ctx -> 'niveles'),
                                    pg_temp.texto_de(v_ctx -> 'retirados'), pg_temp.texto_de(v_ctx -> 'tonos'));
      visto := 'válida';
    exception when others then
      get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail,
                              v_pista = pg_exception_hint, v_mensaje = message_text;
      visto := case when v_estado = '22023' and v_detalle <> '' then v_detalle || '@' || v_pista
                    else format('lanzó %s: %s', v_estado, v_mensaje) end;
    end;
    return next;
  end loop;
end $$;

-- @test diseño: las fórmulas del juego pasan validar_formula (el diseño sólo se valida contra una fórmula válida)
do $$
declare v_caso jsonb; v_f jsonb; v_n int := 0;
begin
  for v_caso in select c.value from _juego_de_diseno j, jsonb_array_elements(j.doc -> 'casos') c loop
    v_f := pg_temp.formula_del_caso(v_caso);
    if v_f is null then raise exception '«%» nombra una fórmula que no existe', v_caso ->> 'nombre'; end if;
    perform public.validar_formula(v_f -> 'definicion', v_f -> 'params');
    v_n := v_n + 1;
  end loop;
  if v_n <> 221 then raise exception 'se esperaban 221 casos y hay %', v_n; end if;
end $$;

-- @test diseño: los 221 casos de casos-de-diseno.json dan la misma regla y el mismo donde que validar-diseno.ts
do $$
declare v_malos text[]; v_n int;
begin
  select array_agg(format('%s: esperado %s, visto %s', p.nombre, p.esperado, p.visto))
    into v_malos
    from pg_temp.paridad_de_diseno((select doc -> 'casos' from _juego_de_diseno)) p
   where p.visto is distinct from p.esperado;
  v_n := jsonb_array_length((select doc -> 'casos' from _juego_de_diseno));
  if v_n <> 221 then raise exception 'el juego tiene % casos, no 221', v_n; end if;
  if v_malos is not null then
    raise exception '% de % casos no dan lo de validar-diseno.ts:%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos, E'\n  ');
  end if;
end $$;

-- @test diseño: el corpus diferencial da la misma regla y el mismo donde que validarDiseno (y nunca acepta lo que Zod rechaza)
-- Lo genera `supabase/tests/corpus-de-diseno.ts` con una semilla fija; el esperado lo calculó `validarDiseno`. Una diferencia es un
-- hallazgo: se arregla el lado equivocado.
do $$
declare v_malos text[]; v_aceptadas text[]; v_n int;
begin
  create temp table _paridad_del_corpus_de_diseno on commit drop as
    select * from pg_temp.paridad_de_diseno((select doc -> 'casos' from _corpus_de_diseno));
  v_n := (select jsonb_array_length(doc -> 'casos') from _corpus_de_diseno);
  if v_n < 400 then raise exception 'el corpus tiene % casos y se esperaban al menos 400', v_n; end if;
  select array_agg(nombre) into v_aceptadas from _paridad_del_corpus_de_diseno where esperado like 'forma@%' and visto = 'válida';
  if v_aceptadas is not null then
    raise exception 'la base aceptó % diseños que Zod rechaza:%', cardinality(v_aceptadas), E'\n  ' || array_to_string(v_aceptadas, E'\n  ');
  end if;
  select array_agg(format('%s: esperado %s, visto %s', nombre, esperado, visto)) into v_malos
    from _paridad_del_corpus_de_diseno where visto is distinct from esperado;
  if v_malos is not null then
    raise exception '% de % casos del corpus no dan lo de validarDiseno:%', cardinality(v_malos), v_n,
      E'\n  ' || array_to_string(v_malos[1:40], E'\n  ');
  end if;
end $$;

-- @test diseño: el rechazo es 22023 con la regla en DETAIL, donde en HINT y el texto de motivos-de-diseno.ts
do $$
declare
  v_estado text; v_detalle text; v_pista text; v_mensaje text;
  v_def jsonb := '{"nodos": [{"id": "a", "tipo": "input", "etiqueta": "A", "salida": "total"}]}';
  v_ok jsonb := '{"cabecera": {"modos": [], "ver_total_bs": false},
                  "secciones": [{"id": "s", "presentacion": "principal", "items": [{"tipo": "celda", "nodo": "a", "ancho": "completo"}]}],
                  "tarjeta_total": {"nodo": "a", "secundarios": []}}';
begin
  perform public.validar_diseno(v_def, v_ok, '{}', '{}', '{}');
  -- Con donde.
  begin
    perform public.validar_diseno(v_def, jsonb_set(v_ok, '{secciones,0,items,0,nodo}', '"zzz"'), '{}', '{}', '{}');
    raise exception 'aceptó un nodo inexistente';
  exception when invalid_parameter_value then
    get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail,
                            v_pista = pg_exception_hint, v_mensaje = message_text;
  end;
  if v_detalle is distinct from 'nodo_inexistente' or v_pista is distinct from 'zzz'
     or v_mensaje is distinct from 'El diseño nombra «zzz», que no es un nodo de la fórmula.' then
    raise exception 'rechazo inesperado: detail %, hint %, mensaje %', v_detalle, v_pista, v_mensaje;
  end if;
  -- Sin donde, sin hint.
  begin
    perform public.validar_diseno(v_def, jsonb_set(v_ok, '{cabecera,ver_total_bs}', '1'), '{}', '{}', '{}');
    raise exception 'aceptó una cabecera sin forma';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint, v_mensaje = message_text;
  end;
  if v_detalle is distinct from 'forma' or v_pista <> ''
     or v_mensaje is distinct from 'El diseño no tiene la forma esperada en «diseno.cabecera.ver_total_bs».' then
    raise exception 'sin donde: detail %, hint «%», mensaje %', v_detalle, v_pista, v_mensaje;
  end if;
  -- Un nulo de SQL es forma, no un «no hay nada que revisar».
  begin
    perform public.validar_diseno(v_def, null, '{}', '{}', '{}');
    raise exception 'aceptó un diseño nulo';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail;
  end;
  if v_detalle is distinct from 'forma' then raise exception 'el diseño nulo da %', v_detalle; end if;
  -- Un arreglo nulo del contexto es uno vacío: «todos» vale, y «costos» no existe.
  perform public.validar_diseno(v_def, jsonb_set(v_ok, '{secciones,0,nivel_ver}', '"todos"'), null, null, null);
  begin
    perform public.validar_diseno(v_def, jsonb_set(v_ok, '{secciones,0,nivel_ver}', '"costos"'), null, null, null);
    raise exception 'aceptó un nivel sin niveles';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'nivel_inexistente' or v_pista is distinct from 's' then
    raise exception 'nivel sin niveles: detail %, hint %', v_detalle, v_pista;
  end if;
end $$;

-- @test diseño: authenticated ejecuta validar_diseno y sus ayudantes; anon y PUBLIC no
do $$
declare f text;
begin
  foreach f in array array[
    'public.validar_diseno(jsonb,jsonb,text[],text[],text[])', 'public._diseno_forma_item(jsonb)', 'public._diseno_forma(jsonb)',
    'public._diseno_nivel(text,text,jsonb,jsonb)', 'public._diseno_modos(jsonb,jsonb,integer,text,jsonb,text[])',
    'public._diseno_secciones(jsonb,jsonb,text[],text[],text[],text[],boolean[],text[],jsonb,jsonb,jsonb,jsonb,jsonb)'
  ] loop
    if not has_function_privilege('authenticated', f, 'execute') then raise exception 'authenticated no ejecuta %', f; end if;
    if has_function_privilege('anon', f, 'execute') then raise exception 'anon ejecuta %', f; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC ejecuta %', f;
    end if;
  end loop;
end $$;

-- @test diseño: validar_diseno y sus ayudantes son STABLE, invoker y con search_path vacío
-- Como validar_formula (…005100): con IMMUTABLE el planificador la evaluaría al planificar con constantes; con definer correría con
-- los derechos de la base. Son seis: la función, la forma de un ítem y del diseño, un nivel, los modos y las secciones.
do $$
declare r record;
begin
  for r in select p.proname, p.provolatile, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname = 'validar_diseno' or p.proname like '\_diseno\_%') loop
    if r.provolatile <> 's' then raise exception '% no es STABLE (%)', r.proname, r.provolatile; end if;
    if r.prosecdef then raise exception '% es security definer', r.proname; end if;
    if r.proconfig is null or not (r.proconfig @> array['search_path=""']) then
      raise exception '% no fija search_path = «»: %', r.proname, r.proconfig;
    end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and (p.proname = 'validar_diseno' or p.proname like '\_diseno\_%')) <> 6 then
    raise exception 'se esperaban validar_diseno y sus 5 ayudantes';
  end if;
end $$;
