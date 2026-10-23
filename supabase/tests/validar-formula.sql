-- validar_formula() contra validarFormula() de TS (paso 4.05, prompt 4; docs/COTIZADOR.md › «Las reglas»).
-- `scripts/probar-schema.mjs` carga antes los JSON en tablas temporales (la base no lee archivos del repo):
--   _juego_de_formula   ← src/modules/cotizaciones/entities/casos-de-formula.json (los 61 casos, una regla por caso)
-- Un rechazo cuenta sólo si es 22023 y su DETAIL es el código de una regla: los errores propios de jsonb de Postgres también son
-- 22023, pero sin DETAIL, y no son un rechazo de la fórmula.

-- @test fórmula: los 61 casos de casos-de-formula.json dan la misma regla y el mismo donde que validar.ts
-- `pg_temp.paridad(casos)` corre cada caso y devuelve lo esperado y lo visto (`válida`, `regla@donde` o `lanzó …`).
create function pg_temp.paridad(p_casos jsonb)
returns table (nombre text, esperado text, visto text) language plpgsql as $$
declare
  v_caso jsonb;
  v_estado text;
  v_detalle text;
  v_pista text;
  v_mensaje text;
begin
  for v_caso in select c.value from jsonb_array_elements(p_casos) c loop
    nombre := v_caso ->> 'nombre';
    esperado := case when (v_caso -> 'valida') = 'true'::jsonb then 'válida'
                     else (v_caso -> 'motivo' ->> 'regla') || '@' || coalesce(v_caso -> 'motivo' ->> 'donde', '') end;
    begin
      perform public.validar_formula(v_caso -> 'definicion', v_caso -> 'params');
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

do $$
declare v_malos text[]; v_n int;
begin
  select array_agg(format('%s: esperado %s, visto %s', p.nombre, p.esperado, p.visto))
    into v_malos
    from pg_temp.paridad((select doc -> 'casos' from _juego_de_formula)) p
   where p.visto is distinct from p.esperado;
  v_n := jsonb_array_length((select doc -> 'casos' from _juego_de_formula));
  if v_n <> 61 then raise exception 'el juego tiene % casos, no 61', v_n; end if;
  if v_malos is not null then
    raise exception '% de % casos no dan lo de validar.ts:%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos, E'\n  ');
  end if;
end $$;

-- @test fórmula: el rechazo es 22023 con la regla en DETAIL, donde en HINT y el texto de motivos-de-formula.ts
do $$
declare v_estado text; v_detalle text; v_pista text; v_mensaje text;
begin
  begin
    perform public.validar_formula(
      '{"nodos": [{"id": "a", "tipo": "calculo", "op": "suma", "de": ["zzz"], "etiqueta": "A", "salida": "total"}]}', '{}');
    raise exception 'aceptó una referencia inexistente';
  exception when invalid_parameter_value then
    get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail,
                            v_pista = pg_exception_hint, v_mensaje = message_text;
  end;
  if v_detalle is distinct from 'referencia_inexistente' or v_pista is distinct from 'a'
     or v_mensaje is distinct from '«a» usa «zzz», que no es un nodo de la fórmula.' then
    raise exception 'rechazo inesperado: detail %, hint %, mensaje %', v_detalle, v_pista, v_mensaje;
  end if;
  -- Sin donde, sin hint.
  begin
    perform public.validar_formula('{"nodos": []}', '{}');
    raise exception 'aceptó una fórmula sin total';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'total_unico' or v_pista <> '' then
    raise exception 'sin total: detail %, hint «%»', v_detalle, v_pista;
  end if;
  -- Un nulo de SQL es forma, no un «no hay nada que revisar».
  begin
    perform public.validar_formula(null, null);
    raise exception 'aceptó una fórmula nula';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail;
  end;
  if v_detalle is distinct from 'forma' then raise exception 'la fórmula nula da %', v_detalle; end if;
end $$;

-- @test fórmula: las dos fórmulas del seed validan tal cual están guardadas
do $$
declare f record; v_n int := 0;
begin
  for f in select o.clave, x.definicion, x.params from public.formulas x join public.origenes o on o.id = x.origen_id
            where o.clave in ('subasta_usa', 'oficina') and x.version = 1 loop
    perform public.validar_formula(f.definicion, f.params);
    v_n := v_n + 1;
  end loop;
  if v_n <> 2 then raise exception 'se esperaban las dos fórmulas del seed y hay %', v_n; end if;
end $$;

-- @test fórmula: authenticated ejecuta validar_formula y sus ayudantes; anon y PUBLIC no
do $$
declare f text;
begin
  foreach f in array array[
    'public.validar_formula(jsonb,jsonb)', 'public._formula_rechazar(text,text,text)', 'public._formula_forma_nodo(jsonb)',
    'public._formula_forma(jsonb,jsonb)', 'public._formula_cambio_y_grupos(jsonb,jsonb,text[],text[],text[],integer,jsonb,jsonb,jsonb)',
    'public._formula_variante(jsonb,text[],text[])'
  ] loop
    if not has_function_privilege('authenticated', f, 'execute') then raise exception 'authenticated no ejecuta %', f; end if;
    if has_function_privilege('anon', f, 'execute') then raise exception 'anon ejecuta %', f; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC ejecuta %', f;
    end if;
  end loop;
end $$;
