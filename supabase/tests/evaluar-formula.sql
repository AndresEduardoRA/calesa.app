-- evaluar_formula() contra evaluar() de TS (paso 4.06, prompt 1; docs/COTIZADOR.md › «El motor»).
-- `scripts/probar-schema.mjs` carga antes los JSON en tablas temporales (la base no lee archivos del repo):
--   _juego_del_motor   ← src/modules/cotizaciones/entities/casos-del-motor.json (los 84 casos del motor, para ver sus nombres)
--   _corpus_del_motor  ← supabase/tests/corpus-del-motor.json (el juego con el resultado entero de evaluar(), el corpus diferencial,
--                         las fórmulas y las sintéticas de escala)
-- La igualdad es exacta: cada número se compara como float8, sin tolerancia; los tipos tienen que ser los mismos (un NaN o un
-- Infinity que se cuele como texto no pasa); los objetos por sus claves y los arreglos en orden. Un rechazo cuenta sólo si es 22023
-- y su DETAIL es el código de un error de llamada: los errores propios de Postgres (22003, 22012…) no son un rechazo del motor.

-- @test motor: la igualdad exacta de dos jsonb, y la que corre cada caso
-- `pg_temp.iguales(a, b)` es la comparación; `pg_temp.paridad_motor(casos, formulas)` corre cada caso y devuelve lo que no coincide.
create function pg_temp.iguales(a jsonb, b jsonb)
returns boolean language plpgsql as $$
declare
  k text;
  i int;
begin
  if jsonb_typeof(a) is distinct from jsonb_typeof(b) then return false; end if;
  case jsonb_typeof(a)
    when 'number' then
      return a::float8 = b::float8;
    when 'array' then
      if jsonb_array_length(a) <> jsonb_array_length(b) then return false; end if;
      for i in 0 .. jsonb_array_length(a) - 1 loop
        if not pg_temp.iguales(a -> i, b -> i) then return false; end if;
      end loop;
      return true;
    when 'object' then
      if (select count(*) from jsonb_object_keys(a)) <> (select count(*) from jsonb_object_keys(b)) then return false; end if;
      for k in select jsonb_object_keys(a) loop
        if not (b ? k) or not pg_temp.iguales(a -> k, b -> k) then return false; end if;
      end loop;
      return true;
    else
      return a = b;
  end case;
end $$;

create function pg_temp.paridad_motor(p_casos jsonb, p_formulas jsonb)
returns table (nombre text, ok boolean, esperado text, visto text) language plpgsql as $$
declare
  v_caso jsonb;
  v_formula jsonb;
  v_texto jsonb;
  v_def jsonb;
  v_par jsonb;
  v_ent jsonb;
  v_modo jsonb;
  v_res jsonb;
  v_esp jsonb;
  v_estado text;
  v_detalle text;
  v_pista text;
  v_mensaje text;
begin
  for v_caso in select c.value from jsonb_array_elements(p_casos) c loop
    nombre := v_caso ->> 'nombre';
    v_formula := p_formulas -> (v_caso ->> 'formula');
    v_texto := coalesce(v_caso -> 'texto', '{}'::jsonb);
    -- Con textos, la base recibe el JSON tal cual; sin ellos, el valor que se guardó.
    v_def := case when v_texto ? 'definicion' then (v_texto ->> 'definicion')::jsonb else v_formula -> 'definicion' end;
    v_par := case when v_texto ? 'params' then (v_texto ->> 'params')::jsonb else v_formula -> 'params' end;
    v_ent := case when v_texto ? 'entrada' then (v_texto ->> 'entrada')::jsonb else v_caso -> 'entrada' end;
    v_modo := case when v_texto ? 'modo' then (v_texto ->> 'modo')::jsonb else v_caso -> 'modo' end;
    v_esp := v_caso -> 'esperado';
    esperado := case when v_esp ? 'resultado' then 'resultado'
                     else (v_esp -> 'error' ->> 'codigo') || '@' || coalesce(v_esp -> 'error' ->> 'donde', '') end;
    begin
      v_res := public.evaluar_formula(v_def, v_par, v_ent, v_modo);
      visto := 'resultado';
      ok := v_esp ? 'resultado' and pg_temp.iguales(v_res, v_esp -> 'resultado');
    exception when others then
      get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail,
                              v_pista = pg_exception_hint, v_mensaje = message_text;
      visto := case when v_estado = '22023' and v_detalle <> '' then v_detalle || '@' || v_pista
                    else format('lanzó %s: %s', v_estado, v_mensaje) end;
      ok := visto = esperado;
    end;
    return next;
  end loop;
end $$;

-- @test motor: los 84 casos del juego dan el resultado entero de evaluar(), igual hasta el último bit
do $$
declare v_malos text[]; v_n int; v_nombres text[]; v_del_juego text[];
begin
  select array_agg(format('%s: esperado %s, visto %s', p.nombre, p.esperado, p.visto))
    into v_malos
    from pg_temp.paridad_motor((select doc -> 'juego' from _corpus_del_motor), (select doc -> 'formulas' from _corpus_del_motor)) p
   where not p.ok;
  v_n := jsonb_array_length((select doc -> 'juego' from _corpus_del_motor));
  if v_n <> 84 then raise exception 'el juego tiene % casos, no 84', v_n; end if;
  -- Son los de casos-del-motor.json, con sus nombres y en su orden.
  select array_agg(c ->> 'nombre') into v_nombres from jsonb_array_elements((select doc -> 'juego' from _corpus_del_motor)) c;
  select array_agg(c ->> 'nombre') into v_del_juego from jsonb_array_elements((select doc -> 'casos' from _juego_del_motor)) c;
  if v_nombres is distinct from v_del_juego then raise exception 'los casos del corpus no son los de casos-del-motor.json'; end if;
  if v_malos is not null then
    raise exception '% de % casos no dan lo de evaluar():%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos, E'\n  ');
  end if;
end $$;

-- @test motor: el corpus diferencial da lo mismo que evaluar() (resultados, faltantes, descartados y errores de llamada)
-- Lo genera `supabase/tests/corpus-del-motor.ts` con una semilla fija; el esperado lo calculó `evaluar()` sobre las mismas
-- llamadas. Una diferencia es un hallazgo: se arregla el lado equivocado.
do $$
declare v_malos text[]; v_n int; v_errores int; v_resultados int;
begin
  create temp table _paridad_del_motor on commit drop as
    select * from pg_temp.paridad_motor((select doc -> 'casos' from _corpus_del_motor), (select doc -> 'formulas' from _corpus_del_motor));
  v_n := (select jsonb_array_length(doc -> 'casos') from _corpus_del_motor);
  if v_n < 400 then raise exception 'el corpus tiene % casos y se esperaban al menos 400', v_n; end if;
  select count(*) filter (where esperado = 'resultado'), count(*) filter (where esperado <> 'resultado') into v_resultados, v_errores
    from _paridad_del_motor;
  -- Que mezcle resultados y errores de llamada: un corpus que sólo rechaza, o sólo evalúa, no compara nada.
  if v_resultados < 250 or v_errores < 60 then
    raise exception 'el corpus tiene % resultados y % errores de llamada', v_resultados, v_errores;
  end if;
  select array_agg(format('%s: esperado %s, visto %s', nombre, esperado, visto)) into v_malos from _paridad_del_motor where not ok;
  if v_malos is not null then
    raise exception '% de % casos del corpus no dan lo de evaluar():%', cardinality(v_malos), v_n,
      E'\n  ' || array_to_string(v_malos[1:40], E'\n  ');
  end if;
end $$;

-- @test motor: los ayudantes aritméticos dan el mismo doble que JS, con los signos de ±∞ y de ±0 (suma, resta, producto y cociente)
-- Postgres lanza 22003 donde IEEE da ±∞ o ±0; los ayudantes lo atrapan en el borde. Se compara el texto del float8 (el más corto que
-- vuelve al mismo doble): igualdad de bits, también de NaN, de los infinitos y del cero negativo.
do $$
declare v_malos text[]; v_n int;
begin
  set local extra_float_digits = 3;
  select count(*), array_agg(format('%s %s %s: esperado %s, visto %s', c.v ->> 1, c.v ->> 0, c.v ->> 2, c.esperado, c.visto))
         filter (where c.esperado is distinct from c.visto)
    into v_n, v_malos
    from (select c.value as v,
                 ((c.value ->> 3)::float8)::text as esperado,
                 (case c.value ->> 0
                    when '+' then public._motor_mas((c.value ->> 1)::float8, (c.value ->> 2)::float8)
                    when '-' then public._motor_menos((c.value ->> 1)::float8, (c.value ->> 2)::float8)
                    when '*' then public._motor_por((c.value ->> 1)::float8, (c.value ->> 2)::float8)
                    else public._motor_entre((c.value ->> 1)::float8, (c.value ->> 2)::float8) end)::text as visto
            from jsonb_array_elements((select doc -> 'aritmetica' from _corpus_del_motor)) c) c;
  if v_n < 3000 then raise exception 'la aritmética tiene % casos y se esperaban al menos 3000', v_n; end if;
  if v_malos is not null then
    raise exception '% de % operaciones no dan lo de JS:%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos[1:30], E'\n  ');
  end if;
  -- La suma y el producto son conmutativos, bit a bit (el orden de los argumentos de un ayudante no cambia nada): lo que deja a
  -- «sumar con el acumulador al revés» como una mutación equivalente.
  select array_agg(format('%s %s %s', c.value ->> 1, c.value ->> 0, c.value ->> 2)) into v_malos
    from jsonb_array_elements((select doc -> 'aritmetica' from _corpus_del_motor)) c
   where c.value ->> 0 in ('+', '*')
     and (case c.value ->> 0 when '+' then public._motor_mas((c.value ->> 1)::float8, (c.value ->> 2)::float8)
                             else public._motor_por((c.value ->> 1)::float8, (c.value ->> 2)::float8) end)::text
         is distinct from
         (case c.value ->> 0 when '+' then public._motor_mas((c.value ->> 2)::float8, (c.value ->> 1)::float8)
                             else public._motor_por((c.value ->> 2)::float8, (c.value ->> 1)::float8) end)::text;
  if v_malos is not null then raise exception 'no conmutan: %', v_malos[1:10]; end if;
end $$;

-- @test motor: _motor_redondear da el mismo doble que redondeo.ts (exacto, con BigInt), también en los empates y fuera de rango
do $$
declare v_malos text[]; v_n int;
begin
  set local extra_float_digits = 3;
  select count(*), array_agg(format('redondear(%s, %s): esperado %s, visto %s', c.v ->> 0, c.v ->> 1, c.esperado, c.visto))
         filter (where c.esperado is distinct from c.visto)
    into v_n, v_malos
    from (select c.value as v, ((c.value ->> 2)::float8)::text as esperado,
                 public._motor_redondear((c.value ->> 0)::float8, (c.value ->> 1)::int)::text as visto
            from jsonb_array_elements((select doc -> 'redondeo' from _corpus_del_motor)) c) c;
  if v_n < 700 then raise exception 'el redondeo tiene % casos y se esperaban al menos 700', v_n; end if;
  if v_malos is not null then
    raise exception '% de % redondeos no dan lo de TS:%', cardinality(v_malos), v_n, E'\n  ' || array_to_string(v_malos[1:30], E'\n  ');
  end if;
end $$;

-- @test motor: con extra_float_digits = 0 en la sesión (15 cifras) el resultado es el mismo, bit a bit
-- La función fija 3 en su definición: sin eso, float8out daría 15 cifras y jsonb perdería el último bit de 0,1 + 0,2.
do $$
declare v_malos text[];
begin
  set local extra_float_digits = 0;
  if (select to_jsonb(0.1::float8 + 0.2::float8)) <> '0.3'::jsonb then
    raise exception 'la sesión en 0 no corta a 15 cifras: no sirve de prueba';
  end if;
  select array_agg(p.nombre) into v_malos
    from pg_temp.paridad_motor((select doc -> 'juego' from _corpus_del_motor), (select doc -> 'formulas' from _corpus_del_motor)) p
   where not p.ok;
  if v_malos is not null then raise exception 'con la sesión en 0, no coinciden: %', v_malos; end if;
  if current_setting('extra_float_digits') <> '0' then raise exception 'la función cambió la sesión'; end if;
end $$;

-- @test motor: los errores de llamada son 22023 con el código en DETAIL, donde en HINT y el texto de motor-errores.ts
do $$
declare
  v_def jsonb := '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC"},
                              {"id": "a", "tipo": "input", "etiqueta": "A"},
                              {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a"], "etiqueta": "T", "salida": "total", "bucket": "b"}],
                   "buckets": {"b": "tc"}}';
  v_ent jsonb := '{"inputs": {}, "banderas": {}, "tipos_cambio": {"oficial": 1}, "vehiculo": {}, "tablas": {}, "overrides": {}}';
  v_estado text; v_detalle text; v_pista text; v_mensaje text;
begin
  -- Una clave de inputs que no es un input.
  begin
    perform public.evaluar_formula(v_def, '{}', jsonb_set(v_ent, '{inputs}', '{"tc": 1}'));
    raise exception 'aceptó un input que no es un input';
  exception when invalid_parameter_value then
    get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail, v_pista = pg_exception_hint, v_mensaje = message_text;
  end;
  if v_detalle is distinct from 'entrada_invalida' or v_pista is distinct from 'tc'
     or v_mensaje is distinct from 'La entrada nombra «tc», que no es un input de la fórmula.' then
    raise exception 'rechazo inesperado: detail %, hint %, mensaje %', v_detalle, v_pista, v_mensaje;
  end if;
  -- Sin donde, sin hint: una entrada que no es un objeto.
  begin
    perform public.evaluar_formula(v_def, '{}', '[]');
    raise exception 'aceptó una entrada que no es un objeto';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'entrada_invalida' or v_pista <> '' then raise exception 'entrada lista: detail %, hint «%»', v_detalle, v_pista; end if;
  -- Un NULL de SQL es una entrada que no es un objeto, no «nada que revisar»; un modo NULL es «sin modo» y un modo `null`, no.
  begin
    perform public.evaluar_formula(v_def, '{}', null);
    raise exception 'aceptó una entrada nula';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail;
  end;
  if v_detalle is distinct from 'entrada_invalida' then raise exception 'la entrada nula da %', v_detalle; end if;
  perform public.evaluar_formula(v_def, '{}', v_ent, null);
  begin
    perform public.evaluar_formula(v_def, '{}', v_ent, 'null'::jsonb);
    raise exception 'aceptó un modo null';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'modo_invalido' or v_pista <> '' then raise exception 'modo null: detail %, hint «%»', v_detalle, v_pista; end if;
  -- Una definición sin lista de nodos no pasó por la forma: es un error de la fórmula, sin donde.
  begin
    perform public.evaluar_formula('{}', '{}', v_ent);
    raise exception 'aceptó una definición sin nodos';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'formula_sin_validar' or v_pista <> '' then raise exception 'sin nodos: detail %, hint «%»', v_detalle, v_pista; end if;
  begin
    perform public.evaluar_formula('{"nodos": 5}', '{}', v_ent);
    raise exception 'aceptó una lista de nodos que no es una lista';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'formula_sin_validar' or v_pista <> '' then raise exception 'nodos no es una lista: detail %, hint «%»', v_detalle, v_pista; end if;
  -- Una fórmula sin total es un error de la fórmula, sin donde.
  begin
    perform public.evaluar_formula('{"nodos": [{"id": "a", "tipo": "input", "etiqueta": "A"}]}', '{}', v_ent);
    raise exception 'aceptó una fórmula sin total';
  exception when invalid_parameter_value then
    get stacked diagnostics v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  if v_detalle is distinct from 'formula_sin_validar' or v_pista <> '' then raise exception 'sin total: detail %, hint «%»', v_detalle, v_pista; end if;
end $$;

-- @test motor: −0 no se guarda, y un doble sin cifras de más pasa por jsonb y vuelve igual
do $$
declare v_r jsonb;
begin
  if to_jsonb('-0'::float8) <> '0'::jsonb then raise exception 'jsonb guarda el −0 como %', to_jsonb('-0'::float8); end if;
  -- 0,1 + 0,2 no es 0,3: lo que la base devuelve es el doble de TS (0.30000000000000004).
  v_r := public.evaluar_formula(
    '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC"},
                {"id": "a", "tipo": "input", "etiqueta": "A"}, {"id": "b", "tipo": "input", "etiqueta": "B"},
                {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a", "b"], "etiqueta": "T", "salida": "total", "bucket": "x"}],
      "buckets": {"x": "tc"}}', '{}',
    '{"inputs": {"a": 0.1, "b": 0.2}, "banderas": {}, "tipos_cambio": {"oficial": 1}, "vehiculo": {}, "tablas": {}, "overrides": {}}');
  if (v_r -> 'valores' -> 'total')::float8 <> 0.1::float8 + 0.2::float8 then raise exception 'la suma no es de dobles: %', v_r -> 'valores' -> 'total'; end if;
  if (v_r -> 'valores' ->> 'total') <> '0.30000000000000004' then raise exception 'perdió cifras: %', v_r -> 'valores' ->> 'total'; end if;
end $$;

-- @test motor: los ayudantes aritméticos se inlinean (sin set, sin strict, STABLE) y la función es de quien llama, STABLE
do $$
declare f text; r record;
begin
  foreach f in array array['_motor_mas(double precision,double precision)', '_motor_menos(double precision,double precision)',
                           '_motor_por(double precision,double precision)', '_motor_entre(double precision,double precision)',
                           '_motor_numero(jsonb)'] loop
    select p.provolatile, p.proisstrict, p.proconfig, p.prosecdef, p.prolang into r from pg_proc p where p.oid = ('public.' || f)::regprocedure;
    if r.provolatile <> 's' or r.proisstrict or r.proconfig is not null or r.prosecdef
       or r.prolang <> (select oid from pg_language where lanname = 'sql') then
      raise exception '% no se inlinea: volatil %, strict %, config %, definer %', f, r.provolatile, r.proisstrict, r.proconfig, r.prosecdef;
    end if;
  end loop;
  -- Todo el motor es STABLE (IMMUTABLE era falso en validar_formula) y ninguno es definer.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and (p.proname like '\_motor\_%' or p.proname = 'evaluar_formula')
                and (p.provolatile <> 's' or p.prosecdef)) then
    raise exception 'un ayudante del motor no es STABLE o es definer';
  end if;
  select p.proconfig into r from pg_proc p where p.oid = 'public.evaluar_formula(jsonb,jsonb,jsonb,jsonb)'::regprocedure;
  if not ('extra_float_digits=3' = any (r.proconfig)) or not ('search_path=""' = any (r.proconfig)) then
    raise exception 'evaluar_formula no fija extra_float_digits y search_path: %', r.proconfig;
  end if;
end $$;

-- @test motor: los argumentos se desarman una sola vez al entrar: la pasada y los totales no vuelven a nombrarlos
-- Un jsonb que llega de una columna comprimida (TOAST) se descomprime entero en cada `->`: leer `p_def`, `p_params` o `p_entrada` dentro
-- de la pasada cuesta cientos de veces lo que cuesta con literales (86 ms contra 0,7 con 1.000 filas congeladas). Es una guarda
-- de texto, como las de escala.sql: `medir-evaluar-formula.sql` mide lo mismo con datos, pero con las búsquedas de tabla encima.
do $$
declare v_fuente text; v_pasada text;
begin
  select p.prosrc into v_fuente from pg_proc p where p.oid = 'public.evaluar_formula(jsonb,jsonb,jsonb,jsonb)'::regprocedure;
  if position('-- La pasada: un nodo por vez' in v_fuente) = 0 then raise exception 'ya no está la marca de la pasada'; end if;
  v_pasada := substring(v_fuente from position('-- La pasada: un nodo por vez' in v_fuente));
  if v_pasada ~ '\mp_(def|params|entrada|modo)\M' then
    raise exception 'la pasada nombra un argumento (%): se desarma una vez, al entrar',
      (regexp_match(v_pasada, '([^\n]*\mp_(?:def|params|entrada|modo)\M[^\n]*)'))[1];
  end if;
  -- Y lo desarmado es lo que se lee: los argumentos se desarman antes de la pasada.
  if v_fuente !~ 'v_nodos := p_def -> ''nodos''' or v_fuente !~ 'v_congeladas := coalesce\(p_params -> ''tablas''' then
    raise exception 'ya no se desarman p_def y p_params al entrar';
  end if;
end $$;

-- @test motor: authenticated ejecuta evaluar_formula y sus ayudantes; anon y PUBLIC no
do $$
declare f text;
begin
  foreach f in array array[
    'public.evaluar_formula(jsonb,jsonb,jsonb,jsonb)', 'public._motor_fallar(text,text,text)', 'public._motor_sin_validar(text,text)',
    'public._motor_sin_leer(text,text)', 'public._motor_borde_mas(double precision,double precision)',
    'public._motor_borde_menos(double precision,double precision)', 'public._motor_borde_por(double precision,double precision)',
    'public._motor_borde_entre(double precision,double precision)', 'public._motor_borde_numero(jsonb)',
    'public._motor_mas(double precision,double precision)', 'public._motor_menos(double precision,double precision)',
    'public._motor_por(double precision,double precision)', 'public._motor_entre(double precision,double precision)',
    'public._motor_numero(jsonb)', 'public._motor_redondear(double precision,integer)', 'public._motor_forma_entrada(jsonb)',
    'public._motor_forma_modo(jsonb)'
  ] loop
    if not has_function_privilege('authenticated', f, 'execute') then raise exception 'authenticated no ejecuta %', f; end if;
    if has_function_privilege('anon', f, 'execute') then raise exception 'anon ejecuta %', f; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC ejecuta %', f;
    end if;
  end loop;
end $$;
