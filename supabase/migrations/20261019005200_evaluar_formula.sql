-- evaluar_formula(): el motor del cotizador en la base, espejo exacto de `evaluar()` de TS
-- (src/modules/cotizaciones/entities/motor*.ts; docs/COTIZADOR.md › «El motor»). Paso 4.06, prompt 1.
--
-- El contrato con TS y con `casos-del-motor.json`:
--   - `evaluar_formula(definicion, params, entrada, modo)` devuelve `{valores, estados, fuentes, totales, faltantes,
--     overrides_descartados}`: los mismos valores (float8 idénticos), estados, fuentes, totales, faltantes (códigos y orden) y
--     overrides descartados que el `Resultado` de TS. jsonb no guarda el orden de las claves: `valores`, `estados`, `fuentes` y los
--     grupos son objetos (su orden es el de `definicion.nodos` y `definicion.grupos`); `faltantes` y `overrides_descartados` son
--     arreglos, porque su orden es contrato;
--   - es pura: no lee tablas. Las tablas vivas llegan en `entrada.tablas`, ya en su orden; la congelada de `params.tablas` manda;
--   - los errores de llamada son 22023 con el código (`modo_invalido`, `entrada_invalida`, `formula_sin_validar`) en DETAIL y `donde`
--     en HINT (sin donde, sin hint), como `validar_formula`. La forma de la entrada y del modo se revisa como `esquemaEntrada` y
--     `esquemaModoDeCambio` de TS (el HINT es el primer campo que falla, en el orden del Zod).
-- No revalida la fórmula: la precondición es la de TS (la salida de `validarFormula`), y lanza `formula_sin_validar` en los mismos
-- puntos. No se copian cuatro puntos que un chequeo anterior vuelve inalcanzables: el estado que falta, la variante sin clave
-- elegida, el bucket sin tipo de cambio en los totales y `leer(total_en)`.
--
-- La aritmética es la de TS: dobles, de izquierda a derecha. Postgres lanza 22003 donde IEEE da ±∞ o ±0 (1e200 * 1e200), y TS no: el
-- camino común usa la cuenta de Postgres sin más; sólo en el borde (un operando fuera de [1e-150, 1e150] o 0 para `*` y `/`, o de
-- 1e307 para `+` y `-`) la hace un ayudante plpgsql que atrapa el 22003 y devuelve lo de IEEE. Lo no finito se asienta como null con
-- `fuera_de_rango`, y −0 como 0.
--
-- Escala: lineal en nodos, aristas, grupos y filas de tabla. Los argumentos se desarman UNA vez al entrar (un jsonb leído de una
-- columna comprimida se descomprime entero en cada `->`), el estado por nodo va en arreglos de plpgsql, una búsqueda de tabla
-- recorre sus filas una vez y ningún `||` toca un jsonb en un bucle. Nada de leer una lista dentro de otra.
--
-- Los `/*Pnn*/` marcan cada punto de «Lo que el 4.06 tiene que copiar» (docs/COTIZADOR.md), para mutarlos de a uno por texto. Los
-- códigos de faltante y de error van literales en su sitio por lo mismo.

-- ---------------------------------------------------------------------------------------------------------------------------
-- Los errores de llamada.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._motor_fallar(p_codigo text, p_donde text, p_mensaje text)
returns void language plpgsql stable set search_path = '' as $$
begin
  -- RAISE no admite una opción nula: sin `donde`, va sin hint.
  if p_donde is null then
    raise exception using errcode = '22023', message = p_mensaje, detail = p_codigo;
  end if;
  raise exception using errcode = '22023', message = p_mensaje, detail = p_codigo, hint = p_donde;
end;
$$;

create or replace function public._motor_sin_validar(p_donde text, p_detalle text)
returns void language plpgsql stable set search_path = '' as $$
begin
  perform public._motor_fallar('formula_sin_validar', p_donde, format('La fórmula no pasó por validarFormula: %s.', p_detalle));
end;
$$;

-- Un nodo que lee algo que no está antes en la lista, o la variante como un número.
create or replace function public._motor_sin_leer(p_quien text, p_ref text)
returns void language plpgsql stable set search_path = '' as $$
begin
  perform public._motor_sin_validar(p_quien, format('«%s» lee «%s», que no está antes en la lista o no es un número', p_quien, p_ref));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- La aritmética. Los cuatro ayudantes SQL se inlinean en quien los llama (`language sql`, `stable`, sin `set`, sin `strict`: con un
-- `set` o un `strict` Postgres los llama de verdad, 6 µs en vez de 0,5) y sólo van al borde plpgsql cuando un operando podría
-- desbordar o desbordar por abajo. Se llaman con variables, nunca con otra llamada como argumento: así se inlinean. Splinter avisa
-- `function_search_path_mutable` (WARN, no falla): son de quien invoca y nombran todo con su esquema, como `leads_vista_por_ids`.
-- ---------------------------------------------------------------------------------------------------------------------------
-- La cuenta de IEEE para a + b cuando Postgres no puede: sólo se desborda (el signo es el de los dos operandos).
create or replace function public._motor_borde_mas(a float8, b float8)
returns float8 language plpgsql stable set search_path = '' as $$
begin
  return a + b;
exception when numeric_value_out_of_range then
  return case when a > 0 then 'Infinity'::float8 else '-Infinity'::float8 end;
end;
$$;

create or replace function public._motor_borde_menos(a float8, b float8)
returns float8 language plpgsql stable set search_path = '' as $$
begin
  return a - b;
exception when numeric_value_out_of_range then
  return case when a > 0 then 'Infinity'::float8 else '-Infinity'::float8 end;
end;
$$;

-- Con los dos finitos y distintos de 0, si falla: |a| >= 1 sólo puede desbordar (b no baja de 2^-1074), y |a| < 1, sólo desbordar por
-- abajo (b no pasa de 2^1024).
create or replace function public._motor_borde_por(a float8, b float8)
returns float8 language plpgsql stable set search_path = '' as $$
begin
  return a * b;
exception when numeric_value_out_of_range then
  if abs(a) >= 1 then
    return case when (a > 0) = (b > 0) then 'Infinity'::float8 else '-Infinity'::float8 end;
  end if;
  return case when (a > 0) = (b > 0) then 0::float8 else '-0'::float8 end;
end;
$$;

-- Nunca recibe un divisor 0. Si falla: |a| > |b| sólo puede desbordar y |a| < |b|, desbordar por abajo (|a| = |b| da ±1).
create or replace function public._motor_borde_entre(a float8, b float8)
returns float8 language plpgsql stable set search_path = '' as $$
begin
  return a / b;
exception when numeric_value_out_of_range then
  if abs(a) > abs(b) then
    return case when (a > 0) = (b > 0) then 'Infinity'::float8 else '-Infinity'::float8 end;
  end if;
  return case when (a > 0) = (b > 0) then 0::float8 else '-0'::float8 end;
end;
$$;

create or replace function public._motor_mas(a float8, b float8)
returns float8 language sql stable as $$
  select case when abs(a) < 1e307::float8 and abs(b) < 1e307::float8 then a + b else public._motor_borde_mas(a, b) end
$$;

create or replace function public._motor_menos(a float8, b float8)
returns float8 language sql stable as $$
  select case when abs(a) < 1e307::float8 and abs(b) < 1e307::float8 then a - b else public._motor_borde_menos(a, b) end
$$;

create or replace function public._motor_por(a float8, b float8)
returns float8 language sql stable as $$
  select case when (a = 0 or abs(a) between 1e-150::float8 and 1e150::float8)
               and (b = 0 or abs(b) between 1e-150::float8 and 1e150::float8) then a * b
              else public._motor_borde_por(a, b) end
$$;

create or replace function public._motor_entre(a float8, b float8)
returns float8 language sql stable as $$
  select case when (a = 0 or abs(a) between 1e-150::float8 and 1e150::float8) and abs(b) between 1e-150::float8 and 1e150::float8
              then a / b
              else public._motor_borde_entre(a, b) end
$$;

-- Un número de jsonb como lo lee `JSON.parse`: el cast a float8 lanza 22003 exactamente donde JS da 0 (|x| <= 2^-1075, no cero) o
-- ±∞. Los que llegan son finitos (la forma de la entrada y `validarFormula` lo aseguran), así que el borde sólo vale 0.
create or replace function public._motor_borde_numero(j jsonb)
returns float8 language plpgsql stable set search_path = '' as $$
begin
  return j::float8;
exception when numeric_value_out_of_range then
  return 0::float8;
end;
$$;

create or replace function public._motor_numero(j jsonb)
returns float8 language sql stable as $$
  select case when j::numeric = 0 then 0::float8
              when abs(j::numeric) < 1e-300 then public._motor_borde_numero(j)
              else j::float8 end
$$;

-- P2: `redondear(x, n)` es `round(x::float8::numeric, n)::float8`: 15 cifras y mitad lejos de cero, como ROUND del Excel. Si el
-- numeric redondeado ya no cabe en un doble (>= 2^1024 − 2^970, donde JS lee Infinity) el cast lanzaría 22003: es ±∞.
create or replace function public._motor_redondear(x float8, n int)
returns float8 language plpgsql stable set search_path = '' as $$
declare
  c_infinito constant numeric := power(2::numeric, 1024) - power(2::numeric, 970);
  v numeric;
begin
  /*P2*/ v := round(x::numeric, n);
  if abs(v) >= c_infinito then
    return case when v > 0 then 'Infinity'::float8 else '-Infinity'::float8 end;
  end if;
  return v::float8;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- La forma de la entrada (`esquemaEntrada` de motor-entrada.ts, estricto). Devuelve null si está bien; si no, el primer campo que
-- falla en el orden del Zod (inputs, banderas, tipos_cambio, vehiculo, tablas, variante, overrides), o '' si el problema no es de un
-- campo (la entrada no es un objeto, o trae una clave de más: Zod la avisa al final). Una clave `__proto__` no cumple el patrón de
-- un id: Zod la descarta y la base la rechaza (docs/PLAN.md, 4-2).
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._motor_forma_entrada(p_e jsonb)
returns text language plpgsql stable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  -- Donde JS lee un número como Infinity (y Zod lo rechaza): 2^1024 − 2^970, con el empate hacia Infinity.
  c_infinito constant numeric := power(2::numeric, 1024) - power(2::numeric, 970);
  v jsonb;
begin
  if jsonb_typeof(p_e) is distinct from 'object' then return ''; end if;

  v := p_e -> 'inputs';
  if jsonb_typeof(v) is distinct from 'object' then return 'inputs'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value) when 'number' then abs(e.value::numeric) < c_infinito else false end) is not true) then
    return 'inputs';
  end if;

  v := p_e -> 'banderas';
  if jsonb_typeof(v) is distinct from 'object' then return 'banderas'; end if;
  if exists (select 1 from jsonb_each(v) e where (e.key ~ c_id and jsonb_typeof(e.value) = 'boolean') is not true) then
    return 'banderas';
  end if;

  -- Mayores que 0 como los lee JS: un decimal por debajo de 2^-1075 es 0.
  v := p_e -> 'tipos_cambio';
  if jsonb_typeof(v) is distinct from 'object' then return 'tipos_cambio'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value)
                       when 'number' then case when abs(e.value::numeric) < c_infinito then public._motor_numero(e.value) > 0 else false end
                       else false end) is not true) then
    return 'tipos_cambio';
  end if;

  v := p_e -> 'vehiculo';
  if jsonb_typeof(v) is distinct from 'object' then return 'vehiculo'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (char_length(e.key) <= 80 and e.key ~ c_campo
                     and case jsonb_typeof(e.value) when 'null' then true
                                                    when 'string' then char_length(e.value #>> '{}') <= 200
                                                    when 'number' then abs(e.value::numeric) < c_infinito
                                                    else false end) is not true) then
    return 'vehiculo';
  end if;

  -- Las tablas vivas: {clave: [fila]}, y una fila es {columna: número | texto de hasta 200 | null}.
  v := p_e -> 'tablas';
  if jsonb_typeof(v) is distinct from 'object' then return 'tablas'; end if;
  if exists (select 1 from jsonb_each(v) t where (t.key ~ c_id and jsonb_typeof(t.value) = 'array') is not true) then
    return 'tablas';
  end if;
  if exists (select 1 from jsonb_each(v) t cross join lateral jsonb_array_elements(t.value) f(fila)
              where jsonb_typeof(f.fila) is distinct from 'object') then
    return 'tablas';
  end if;
  if exists (select 1 from jsonb_each(v) t cross join lateral jsonb_array_elements(t.value) f(fila)
                    cross join lateral jsonb_each(f.fila) c
              where (c.key ~ c_id
                     and case jsonb_typeof(c.value) when 'null' then true
                                                    when 'string' then char_length(c.value #>> '{}') <= 200
                                                    when 'number' then abs(c.value::numeric) < c_infinito
                                                    else false end) is not true) then
    return 'tablas';
  end if;

  if p_e ? 'variante' and (jsonb_typeof(p_e -> 'variante') = 'string' and (p_e ->> 'variante') ~ c_id) is not true then
    return 'variante';
  end if;

  v := p_e -> 'overrides';
  if jsonb_typeof(v) is distinct from 'object' then return 'overrides'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value) when 'number' then abs(e.value::numeric) < c_infinito else false end) is not true) then
    return 'overrides';
  end if;

  if (p_e - array['inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'variante', 'overrides']) <> '{}'::jsonb then return ''; end if;
  return null;
end;
$$;

-- La forma de un modo (`esquemaModoDeCambio`): {buckets: {bucket: id de un nodo}, total_en: id}. «ninguno» no es el nombre de un bucket.
create or replace function public._motor_forma_modo(p_m jsonb)
returns text language plpgsql stable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v jsonb;
begin
  if jsonb_typeof(p_m) is distinct from 'object' then return ''; end if;
  v := p_m -> 'buckets';
  if jsonb_typeof(v) is distinct from 'object' then return 'buckets'; end if;
  if exists (select 1 from jsonb_each(v) b
              where (b.key ~ c_id and b.key <> 'ninguno' and jsonb_typeof(b.value) = 'string' and (b.value #>> '{}') ~ c_id) is not true) then
    return 'buckets';
  end if;
  if (jsonb_typeof(p_m -> 'total_en') = 'string' and (p_m ->> 'total_en') ~ c_id) is not true then return 'total_en'; end if;
  if (p_m - array['buckets', 'total_en']) <> '{}'::jsonb then return ''; end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- evaluar_formula(). `p_def` y `p_params` son las dos columnas de `formulas` tal cual (`params` plano, con `tablas` entre las
-- constantes); `p_entrada`, la entrada del motor; `p_modo` (null = sin modo), `{buckets, total_en}` completo.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public.evaluar_formula(p_def jsonb, p_params jsonb, p_entrada jsonb, p_modo jsonb default null)
returns jsonb language plpgsql stable set search_path = '' set extra_float_digits = 3 as $$
declare
  v_hint text;
  -- La fórmula y la entrada, desarmadas una vez.
  v_nodos jsonb;
  v_n int;
  v_grupos jsonb;
  v_ng int;
  v_constantes jsonb;
  v_congeladas jsonb;
  v_vivas jsonb;
  v_inputs jsonb;
  v_banderas jsonb;
  v_tc jsonb;
  v_veh jsonb;
  v_ov jsonb;
  v_ids text[];
  v_tipos text[];
  v_pos jsonb;                -- id → posición (1..n); con un id repetido, la última, como el `nodos.set` de TS
  v_opc int;                  -- el nodo `opcion`
  v_segunda text;
  v_total int;                -- el nodo `salida: total`
  v_variante text;
  -- El cambio que se usa (cambioDe).
  v_cb jsonb;
  v_total_en text;
  v_cod text;
  v_rep_id text[] := '{}';
  v_rep_bucket text[] := '{}';
  -- El estado de cada nodo y de cada grupo.
  v_estado text[];
  v_enc boolean[];
  v_pisado boolean[];
  v_lugar jsonb;              -- id de grupo → su lugar (1..g)
  v_grupo_ids text[];
  v_dib boolean[];
  v_sub float8[];             -- el USD de cada grupo mientras se suma
  v_sub_set boolean[];
  v_g_usd float8[];
  v_g_bs float8[];
  -- Lo ya evaluado, en el orden de la lista.
  v_val float8[];
  v_hecho boolean[];          -- está en `valores` (el `opcion` también)
  v_leible boolean[];         -- está en `valores` y es un número (no la variante)
  v_fuente text[];
  v_falt text[] := '{}';      -- 'codigo|donde|ref', en el orden en que nacen
  v_desc text[] := '{}';      -- 'id|motivo'
  -- Por nodo.
  v_nodo jsonb;
  v_id text;
  v_tipo text;
  v_op text;
  v_est text;
  v_x float8;
  v_y float8;
  v_z float8;
  v_xov float8;
  v_t float8;
  v_tiene_ov boolean;
  v_acepta boolean;
  v_resuelto boolean;
  v_leer_de boolean;
  v_de jsonb;
  v_base float8;
  v_nulo boolean;
  v_sug text;
  v_req text;
  v_tabla text;
  v_columna text;
  v_campo text;
  v_filas jsonb;
  v_cols text[];
  v_kinds text[];
  v_nums float8[];
  v_txts text[];
  v_col text;
  v_falta text;
  v_f jsonb;
  v_celda jsonb;
  v_hay boolean;
  v_sobre float8;
  v_bs float8;
  v_suma_usd float8;
  v_usd float8;
  v_tcv float8;
  v_b text;
  v_k text;
  v_r text;
  v_s text;
  r text;
  g int;
  i int;
  j int;
  k int;
  jp int;
begin
  -- §0 la forma de lo que llega: la entrada y el modo, como los Zod de TS.
  v_hint := public._motor_forma_entrada(p_entrada);
  if v_hint is not null then
    perform public._motor_fallar('entrada_invalida', nullif(v_hint, ''),
      case when v_hint = '' then 'La entrada no tiene la forma esperada.' else format('La entrada no tiene la forma esperada en «%s».', v_hint) end);
  end if;
  if p_modo is not null then
    v_hint := public._motor_forma_modo(p_modo);
    if v_hint is not null then
      perform public._motor_fallar('modo_invalido', nullif(v_hint, ''),
        case when v_hint = '' then 'El modo no tiene la forma esperada.' else format('El modo no tiene la forma esperada en «%s».', v_hint) end);
    end if;
  end if;
  if jsonb_typeof(p_def -> 'nodos') is distinct from 'array' then
    perform public._motor_sin_validar(null, 'la definición no tiene la lista de nodos');
  end if;

  -- Los argumentos, una sola vez.
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  v_ng := jsonb_array_length(v_grupos);
  v_constantes := coalesce(p_params, '{}'::jsonb) - 'tablas';
  v_congeladas := coalesce(p_params -> 'tablas', '{}'::jsonb);
  v_vivas := p_entrada -> 'tablas';
  v_inputs := p_entrada -> 'inputs';
  v_banderas := p_entrada -> 'banderas';
  v_tc := p_entrada -> 'tipos_cambio';
  v_veh := p_entrada -> 'vehiculo';
  v_ov := p_entrada -> 'overrides';

  -- prepararEvaluacion: el índice de nodos, a lo sumo un `opcion` y exactamente un total (el primero con `salida: total`).
  select coalesce(array_agg(x.value ->> 'id' order by x.pos), '{}'::text[]),
         coalesce(array_agg(x.value ->> 'tipo' order by x.pos), '{}'::text[]),
         coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         min(x.pos) filter (where x.value ->> 'tipo' = 'opcion'),
         (array_agg(x.value ->> 'id' order by x.pos) filter (where x.value ->> 'tipo' = 'opcion'))[2],
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_ids, v_tipos, v_pos, v_opc, v_segunda, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  if v_segunda is not null then
    perform public._motor_sin_validar(v_segunda, 'tiene dos variantes');
  end if;
  if v_total is null then
    perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
  end if;

  -- revisarEntrada: lo tipeado sólo nombra inputs, y las banderas sólo banderas.
  for v_k in select jsonb_object_keys(v_inputs) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'input' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
    end if;
  end loop;
  for v_k in select jsonb_object_keys(v_banderas) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'bandera' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
    end if;
  end loop;

  -- P6 resolverVariante: la de la entrada o, sin clave, la `por_defecto`; elegir otra cosa es un error de llamada.
  if v_opc is null then
    if p_entrada ? 'variante' then
      perform public._motor_fallar('entrada_invalida', null,
        format('La entrada elige la variante «%s», y la fórmula no tiene variante.', p_entrada ->> 'variante'));
    end if;
  else
    v_nodo := v_nodos -> (v_opc - 1);
    v_variante := coalesce(p_entrada ->> 'variante', v_nodo ->> 'por_defecto');
    if v_variante is null then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('La variante «%s» no tiene opción por defecto, y la entrada no elige una.', v_ids[v_opc]));
    end if;
    if not exists (select 1 from jsonb_array_elements(v_nodo -> 'opciones') o where o ->> 'clave' = v_variante) then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('«%s» no es una opción de la variante «%s».', v_variante, v_ids[v_opc]));
    end if;
  end if;

  -- P6 decidirEstados: una pasada previa y lineal. Primero la variante, después la condición (la bandera de otra variante está
  -- apagada); de paso, los grupos que se dibujan y el pct de cada par cuyo monto trae override.
  select coalesce(jsonb_object_agg(u.id, u.lugar), '{}'::jsonb), coalesce(array_agg(u.id order by u.lugar), '{}'::text[])
    into v_lugar, v_grupo_ids
    from (select f.id, row_number() over (order by f.primera) as lugar
            from (select x.value ->> 'id' as id, min(x.pos) as primera
                    from jsonb_array_elements(v_grupos) with ordinality as x(value, pos)
                   group by x.value ->> 'id') f) u;
  v_estado := array_fill(null::text, array[v_n]);
  v_enc := array_fill(false, array[v_n]);
  v_pisado := array_fill(false, array[v_n]);
  v_dib := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_tipo := v_tipos[i];
    v_est := 'activo';
    if v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en' then
      if v_variante is null then
        perform public._motor_sin_validar(v_ids[i], 'un nodo dice en qué variantes vale y no hay variante');
      end if;
      if not (v_nodo -> 'solo_en') ? v_variante then
        /*P6a*/ v_est := 'fuera_de_variante';
      end if;
    end if;
    if v_est = 'activo' and v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      if v_enc[(v_pos ->> (v_nodo ->> 'condicion'))::int] is not true then
        /*P6b*/ v_est := 'condicion_apagada';
      end if;
    end if;
    v_estado[i] := v_est;
    if v_tipo = 'bandera' and v_est = 'activo' and (v_banderas -> v_ids[i]) = 'true'::jsonb then
      v_enc[i] := true;
    end if;
    if v_nodo ? 'grupo' and v_est <> 'fuera_de_variante' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then /*P6c*/ v_dib[g] := true; end if;
    end if;
    if v_est = 'activo' and v_tipo = 'calculo' and v_nodo ->> 'op' = 'porcentaje_de'
       and (v_nodo -> 'sobrescribible') = 'true'::jsonb and v_ov ? v_ids[i] then
      j := (v_pos ->> (v_nodo ->> 'pct'))::int;
      if v_estado[j] = 'activo' then /*P6d*/ v_pisado[j] := true; end if;
    end if;
  end loop;

  -- cambioDe: el modo, si llega, reemplaza `buckets` y `total_en` completos. Tiene que nombrar tipos de cambio de la fórmula y
  -- cubrir cada bucket que se usa. Sin modo, un fallo es de la fórmula.
  if p_modo is null then
    v_cb := coalesce(p_def -> 'buckets', '{}'::jsonb);
    v_total_en := p_def ->> 'total_en';
    v_cod := 'formula_sin_validar';
  else
    v_cb := p_modo -> 'buckets';
    v_total_en := p_modo ->> 'total_en';
    v_cod := 'modo_invalido';
  end if;
  for v_b, v_r in select b.key, b.value #>> '{}' from jsonb_each(v_cb) b loop
    if v_tipos[(v_pos ->> v_r)::int] is distinct from 'tipo_cambio' then
      perform public._motor_fallar(v_cod, 'buckets.' || v_b,
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'buckets.' || v_b, v_r));
    end if;
  end loop;
  if v_total_en is not null and v_tipos[(v_pos ->> v_total_en)::int] is distinct from 'tipo_cambio' then
    perform public._motor_fallar(v_cod, 'total_en', format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'total_en', v_total_en));
  end if;
  v_nodo := v_nodos -> (v_total - 1);
  if v_ng = 0 then
    -- Sin grupos, el total se reparte: tiene bucket o es una suma de nodos que lo tienen (`ninguno` es «sin bucket»).
    v_b := v_nodo ->> 'bucket';
    if v_b is not null and v_b <> 'ninguno' then
      v_rep_id := array[v_ids[v_total]];
      v_rep_bucket := array[v_b];
    else
      if v_tipos[v_total] <> 'calculo' or v_nodo ->> 'op' <> 'suma' then
        perform public._motor_sin_validar(v_ids[v_total], 'sin grupos, el total no tiene bucket ni es una suma');
      end if;
      v_de := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        v_b := case when j is not null then v_nodos -> (j - 1) ->> 'bucket' end;
        if v_b is null or v_b = 'ninguno' then
          perform public._motor_sin_validar(v_ids[v_total], format('sin grupos, «%s» suma al total sin bucket', r));
        end if;
        v_rep_id := array_append(v_rep_id, r);
        v_rep_bucket := array_append(v_rep_bucket, v_b);
      end loop;
    end if;
    for k in 1 .. cardinality(v_rep_bucket) loop
      if not v_cb ? v_rep_bucket[k] then
        perform public._motor_fallar(v_cod, v_rep_bucket[k], format('no dice qué tipo de cambio usa el bucket «%s»', v_rep_bucket[k]));
      end if;
    end loop;
  else
    for g in 1 .. v_ng loop
      v_b := v_grupos -> (g - 1) ->> 'bucket';
      if not v_cb ? v_b then
        perform public._motor_fallar(v_cod, v_b, format('no dice qué tipo de cambio usa el bucket «%s»', v_b));
      end if;
    end loop;
  end if;

  -- La pasada: un nodo por vez, en el orden de la lista, sólo mirando hacia atrás.
  v_val := array_fill(null::float8, array[v_n]);
  v_hecho := array_fill(false, array[v_n]);
  v_leible := array_fill(false, array[v_n]);
  v_fuente := array_fill(null::text, array[v_n]);
  v_sub := array_fill(null::float8, array[v_ng]);
  v_sub_set := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_tiene_ov := v_ov ? v_id;
    if v_tipo = 'opcion' then
      -- La variante vale su clave, no se sobrescribe, no tiene fuente y no suma a ningún grupo.
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      v_hecho[i] := true;
      continue;
    end if;
    v_est := v_estado[i];
    v_op := case when v_tipo = 'calculo' then v_nodo ->> 'op' end;
    v_x := null;
    v_resuelto := false;
    v_leer_de := false;
    v_xov := null;
    if v_est <> 'activo' then
      -- P7: un nodo inactivo vale 0 sin leer nada, y su override se descarta con su estado.
      v_x := 0;
      v_resuelto := true;
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|' || v_est); end if;
    else
      -- P8 sobrescrito: el override antes del cálculo, por tipo. P10: la fuente, sólo de los activos que aceptan un valor.
      v_acepta := v_tipo in ('input', 'constante', 'tipo_cambio')
                  or (v_tipo in ('tabla', 'tramo', 'calculo') and coalesce((v_nodo -> 'sobrescribible') = 'true'::jsonb, false));
      if v_pisado[i] then
        -- El pct de un par cuyo monto manda no se calcula: vale null hasta que llega el par.
        /*P8a*/ v_fuente[i] := 'override';
        v_x := null;
        v_resuelto := true;
      elsif v_tipo = 'input' or not v_acepta then
        if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      else
        /*P10*/ v_fuente[i] := case when v_tiene_ov then 'override'
                                    when v_tipo in ('constante', 'tipo_cambio') then 'default'
                                    else 'sugerido' end;
        if v_tiene_ov then
          v_xov := public._motor_numero(v_ov -> v_id);
          v_resuelto := true;
          if v_op = 'porcentaje_de' then
            -- Si manda el monto y el pct está pisado, el par lo reescribe más abajo (monto ÷ base).
            v_leer_de := v_pisado[(v_pos ->> (v_nodo ->> 'pct'))::int] is true;
          end if;
          if v_tipo = 'tipo_cambio' and not (v_xov > 0) then
            -- Un tipo de cambio de la persona pasa la misma revisión que el de la empresa.
            v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || (v_nodo ->> 'clave'));
          else
            v_x := v_xov;
          end if;
        end if;
      end if;
    end if;

    -- P1 sumar: ((d0 + d1) + d2)… en el orden de `de`; se leen todos los términos aunque uno sea null. Lo piden `suma`,
    -- `porcentaje_de` y el par cuyo monto manda (que lee su base sólo si su pct está pisado).
    if v_leer_de or (not v_resuelto and v_op in ('suma', 'porcentaje_de')) then
      v_de := v_nodo -> 'de';
      v_base := 0;
      v_nulo := false;
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_t is null then v_nulo := true;
        else /*P1*/ v_base := public._motor_mas(v_base, v_t); end if;
      end loop;
    end if;

    -- El par: si manda el monto, el pct vale monto ÷ base (null si la base es 0, con su faltante en el pct, o si es null).
    if v_leer_de then
      jp := (v_pos ->> (v_nodo ->> 'pct'))::int;
      v_y := null;
      if not v_nulo then
        if v_base = 0 then
          /*P8b*/ v_falt := array_append(v_falt, 'division_por_cero|' || v_ids[jp] || '|');
        else
          v_y := public._motor_entre(v_xov, v_base);
        end if;
      end if;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_ids[jp] || '|');
        v_y := null;
      end if;
      v_val[jp] := case when v_y = 0 then 0::float8 else v_y end;
      v_hecho[jp] := true;
      v_leible[jp] := true;
    end if;

    if not v_resuelto then
      -- valorCalculado: el default, lo tipeado o el sugerido.
      if v_tipo = 'input' then
        v_sug := v_nodo ->> 'sugerido_de';
        v_req := v_nodo ->> 'requerido_si';
        if v_inputs ? v_id then
          -- «Tipeado» es que la clave está, aunque valga 0: había un sugerido si el nodo lo nombra, y ↺ vuelve a él.
          v_fuente[i] := case when v_sug is null then 'input' else 'override' end;
          v_x := public._motor_numero(v_inputs -> v_id);
        else
          v_nulo := false;
          if v_req is not null then
            j := (v_pos ->> v_req)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_req); end if;
            v_nulo := v_val[j] = 1;
          end if;
          v_fuente[i] := case when v_sug is null or v_nulo then 'input' else 'sugerido' end;
          if v_nulo then
            -- «Requerido» es que la persona lo escriba: un sugerido no lo cumple.
            v_falt := array_append(v_falt, 'requerido_sin_valor|' || v_id || '|' || v_req);
          elsif v_sug is null then
            v_x := 0;
          else
            j := (v_pos ->> v_sug)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_sug); end if;
            v_x := v_val[j];
          end if;
        end if;

      elsif v_tipo = 'constante' then
        v_f := v_constantes -> v_id;
        if v_f is null then
          perform public._motor_sin_validar(v_id, format('la constante «%s» no tiene valor en params', v_id));
        end if;
        v_x := public._motor_numero(v_f);

      elsif v_tipo = 'tipo_cambio' then
        -- Un tipo de cambio que no llega, o que no es mayor que 0, no tiene valor.
        v_campo := v_nodo ->> 'clave';
        v_f := v_tc -> v_campo;
        if v_f is not null then v_t := public._motor_numero(v_f); end if;
        if v_f is not null and v_t > 0 then
          v_x := v_t;
        else
          v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'campo_vehiculo' then
        v_campo := v_nodo ->> 'campo';
        v_f := v_veh -> v_campo;
        if jsonb_typeof(v_f) = 'number' then
          v_x := public._motor_numero(v_f);
        else
          v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'bandera' then
        v_x := case when (v_banderas -> v_id) = 'true'::jsonb then 1 else 0 end;

      elsif v_tipo = 'tabla' then
        -- Cada nodo anota a lo sumo un faltante, el primero: tabla sin filas, campo sin valor, fila sin coincidencia, celda sin
        -- valor. P3: gana la PRIMERA fila (en el orden de la tabla) cuyo `match` coincide; la congelada manda, aunque esté vacía.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        else
          v_cols := '{}'; v_kinds := '{}'; v_nums := '{}'; v_txts := '{}';
          v_nulo := false;
          v_falta := null;
          for v_col, v_r in select m.key, m.value #>> '{}' from jsonb_each(v_nodo -> 'match') m loop
            j := (v_pos ->> v_r)::int;
            if j is not null then
              -- Un nodo anterior (la variante, su clave; un null no coincide con nada).
              if v_hecho[j] is not true then perform public._motor_sin_leer(v_id, v_r); end if;
              if v_tipos[j] = 'opcion' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_variante);
              elsif v_val[j] is null then
                v_nulo := true;
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, v_val[j]); v_txts := array_append(v_txts, null::text);
              end if;
            else
              -- Un campo del vehículo. Si faltan varios, el faltante nombra el menor en orden de código: no depende del orden de
              -- las claves, que jsonb no guarda.
              v_f := v_veh -> v_r;
              if v_f is null or jsonb_typeof(v_f) = 'null' then
                v_nulo := true;
                /*P4*/ if v_falta is null or (v_r collate "C") < (v_falta collate "C") then v_falta := v_r; end if;
              elsif jsonb_typeof(v_f) = 'number' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, public._motor_numero(v_f)); v_txts := array_append(v_txts, null::text);
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_f #>> '{}');
              end if;
            end if;
          end loop;
          if v_falta is not null then
            v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_falta);
          end if;
          if not v_nulo then
            -- La igualdad es estricta y sin conversión: un número con un número (como dobles), un texto con un texto.
            v_hay := null;
            select true, f.fila -> v_columna into v_hay, v_celda
              from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
             where not exists (
                     select 1 from unnest(v_cols, v_kinds, v_nums, v_txts) as m(col, kind, num, txt)
                      where case when m.kind = 'n'
                                 then case when jsonb_typeof(f.fila -> m.col) = 'number' then public._motor_numero(f.fila -> m.col) <> m.num else true end
                                 else case when jsonb_typeof(f.fila -> m.col) = 'string' then (f.fila ->> m.col) <> m.txt else true end
                            end)
             order by f.orden
             limit 1;
            if v_hay is not true then
              v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
            elsif jsonb_typeof(v_celda) = 'number' then
              v_x := public._motor_numero(v_celda);
            else
              v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
            end if;
          end if;
        end if;

      elsif v_tipo = 'tramo' or v_op = 'depreciar' then
        -- La primera fila con desde ≤ sobre ≤ hasta, los dos extremos incluidos. Una fila sin `desde` o sin `hasta` numérico no
        -- coincide nunca. `depreciar` es d0 × el tramo de esa tabla, y lo busca aunque d0 sea null.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        r := v_nodo ->> 'sobre';
        j := (v_pos ->> r)::int;
        if v_op = 'depreciar' then
          v_s := (v_nodo -> 'de') ->> 0;
          jp := (v_pos ->> v_s)::int;
          if v_leible[jp] is not true then perform public._motor_sin_leer(v_id, v_s); end if;
        end if;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_sobre := v_val[j];
        v_t := null;
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        elsif v_sobre is not null then
          v_hay := null;
          select true, f.fila -> v_columna into v_hay, v_celda
            from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
           where jsonb_typeof(f.fila -> 'desde') = 'number' and jsonb_typeof(f.fila -> 'hasta') = 'number'
             and public._motor_numero(f.fila -> 'desde') <= v_sobre and v_sobre <= public._motor_numero(f.fila -> 'hasta')
           order by f.orden
           limit 1;
          if v_hay is not true then
            v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
          elsif jsonb_typeof(v_celda) = 'number' then
            v_t := public._motor_numero(v_celda);
          else
            v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
          end if;
        end if;
        if v_op = 'depreciar' then
          v_x := case when v_val[jp] is null or v_t is null then null else public._motor_por(v_val[jp], v_t) end;
        else
          v_x := v_t;
        end if;

      elsif v_op = 'suma' then
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'porcentaje_de' then
        r := v_nodo ->> 'pct';
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        v_x := case when v_nulo or v_t is null then null else public._motor_por(v_base, v_t) end;

      elsif v_op in ('multiplicar', 'restar') then
        -- ((d0 × d1) × d2)… y ((d0 − d1) − d2)…, nunca d0 − (d1 + d2): en dobles no es lo mismo. Se leen todos los términos.
        v_de := v_nodo -> 'de';
        v_base := case v_op when 'multiplicar' then 1 else 0 end;
        v_nulo := false;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_op = 'multiplicar' then v_base := public._motor_por(v_base, v_t);
          elsif k = 0 then v_base := v_t;
          else v_base := public._motor_menos(v_base, v_t); end if;
        end loop;
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'dividir' then
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        r := v_de ->> 1;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_z := v_val[j];
        if v_y is null or v_z is null then
          v_x := null;
        elsif v_z = 0 then
          v_falt := array_append(v_falt, 'division_por_cero|' || v_id || '|');
        else
          v_x := public._motor_entre(v_y, v_z);
        end if;

      elsif v_op = 'si' or v_op = 'redondear' then
        -- La condición apagada ya la resolvió el estado: acá llega encendida.
        r := (v_nodo -> 'de') ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_op = 'si' then v_x := v_t;
        elsif v_t is not null then v_x := public._motor_redondear(v_t, ((v_nodo -> 'n')::numeric)::int); end if;
      end if;
    end if;

    -- asentar: lo que no es finito queda null con `fuera_de_rango`, y −0 vale 0 (JSON y jsonb no lo distinguen).
    if v_x is not null and not (abs(v_x) < 'Infinity'::float8) then
      v_falt := array_append(v_falt, 'fuera_de_rango|' || v_id || '|');
      v_x := null;
    end if;
    /*P5*/ v_val[i] := case when v_x = 0 then 0::float8 else v_x end;
    v_hecho[i] := true;
    v_leible[i] := true;
    -- acumular: el USD de un grupo es la suma de sus miembros en el orden de la lista; un miembro null lo deja null.
    if v_nodo ? 'grupo' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then
        if not v_sub_set[g] then
          v_sub[g] := v_val[i];
          v_sub_set[g] := true;
        elsif v_sub[g] is not null and v_val[i] is not null then
          /*P1b*/ v_sub[g] := public._motor_mas(v_sub[g], v_val[i]);
        else
          v_sub[g] := null;
        end if;
      end if;
    end if;
  end loop;

  -- P9 descartarInexistentes: al final, los overrides de ids que no son nodos, ordenados por id (bytes, como `collate "C"`).
  for v_k in select o.id from (select jsonb_object_keys(v_ov) as id) o where not v_pos ? o.id order by o.id collate "C" loop
    v_desc := array_append(v_desc, v_k || '|nodo_inexistente');
  end loop;

  -- totalesDe.
  if v_leible[v_total] is not true then perform public._motor_sin_leer(v_ids[v_total], v_ids[v_total]); end if;
  v_suma_usd := v_val[v_total];
  v_g_usd := array_fill(null::float8, array[v_ng]);
  v_g_bs := array_fill(null::float8, array[v_ng]);
  v_bs := 0;
  if v_ng > 0 then
    for g in 1 .. v_ng loop
      -- P11: el USD de un grupo es null si lo es un miembro; uno sin miembros vale 0.
      v_y := case when v_sub_set[g] then v_sub[g] else 0 end;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
        v_y := null;
      end if;
      v_g_usd[g] := case when v_y = 0 then 0::float8 else v_y end;
      -- P7: un grupo que no se dibuja vale 0 y no lee su tipo de cambio.
      if v_dib[g] then
        v_t := v_val[(v_pos ->> (v_cb ->> (v_grupos -> (g - 1) ->> 'bucket')))::int];
        v_z := case when v_y is null or v_t is null then null else public._motor_por(v_y, v_t) end;
        if v_z is not null and not (abs(v_z) < 'Infinity'::float8) then
          v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
          v_z := null;
        end if;
      else
        v_z := 0;
      end if;
      v_g_bs[g] := case when v_z = 0 then 0::float8 else v_z end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  else
    -- Sin grupos: Bs = Σ término × tc(su bucket), en el orden de `total.de` (o el total por el tc de su bucket).
    for k in 1 .. cardinality(v_rep_id) loop
      j := (v_pos ->> v_rep_id[k])::int;
      -- Un término fuera de la variante aporta 0 sin leer su tipo de cambio; uno apagado aporta 0 × tc. No hay un `leer` que pueda
      -- fallar acá: el total ya se leyó arriba, y los demás términos son los `de` del total, que su suma ya leyó.
      continue when v_estado[j] = 'fuera_de_variante';
      v_t := v_val[j];
      v_tcv := v_val[(v_pos ->> (v_cb ->> v_rep_bucket[k]))::int];
      v_z := case when v_t is null or v_tcv is null then null else public._motor_por(v_t, v_tcv) end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  end if;
  if v_bs is not null and not (abs(v_bs) < 'Infinity'::float8) then
    v_falt := array_append(v_falt, 'fuera_de_rango|total|');
    v_bs := null;
  end if;
  v_bs := case when v_bs = 0 then 0::float8 else v_bs end;
  -- El «TOTAL DÓLARES»: Bs ÷ tc(`total_en`). Sin `total_en` (y sin modo), la suma de los dólares.
  if v_total_en is null then
    v_usd := v_suma_usd;
  else
    v_tcv := v_val[(v_pos ->> v_total_en)::int];
    if v_bs is null or v_tcv is null then
      v_usd := null;
    else
      v_usd := public._motor_entre(v_bs, v_tcv);
      if not (abs(v_usd) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|total|');
        v_usd := null;
      end if;
      v_usd := case when v_usd = 0 then 0::float8 else v_usd end;
    end if;
  end if;

  return jsonb_build_object(
    'valores', (select coalesce(jsonb_object_agg(u.id, case when u.tipo = 'opcion' then to_jsonb(v_variante) else coalesce(to_jsonb(u.val), 'null'::jsonb) end), '{}'::jsonb)
                  from unnest(v_ids, v_tipos, v_val) as u(id, tipo, val)),
    'estados', (select coalesce(jsonb_object_agg(u.id, coalesce(u.estado, 'activo')), '{}'::jsonb)
                  from unnest(v_ids, v_estado) as u(id, estado)),
    'fuentes', (select coalesce(jsonb_object_agg(u.id, u.fuente), '{}'::jsonb)
                  from unnest(v_ids, v_fuente) as u(id, fuente) where u.fuente is not null),
    'totales', jsonb_build_object(
      'grupos', (select coalesce(jsonb_object_agg(u.id, jsonb_build_object('usd', coalesce(to_jsonb(u.usd), 'null'::jsonb),
                                                                           'bs', coalesce(to_jsonb(u.bs), 'null'::jsonb),
                                                                           'se_dibuja', u.dib)), '{}'::jsonb)
                   from unnest(v_grupo_ids, v_g_usd, v_g_bs, v_dib) as u(id, usd, bs, dib)),
      'bs', coalesce(to_jsonb(v_bs), 'null'::jsonb),
      'usd', coalesce(to_jsonb(v_usd), 'null'::jsonb),
      'suma_usd', coalesce(to_jsonb(v_suma_usd), 'null'::jsonb)),
    'faltantes', (select coalesce(jsonb_agg(case when split_part(f.dato, '|', 3) = ''
                                                 then jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2))
                                                 else jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2),
                                                                         'ref', split_part(f.dato, '|', 3)) end
                                                 order by f.orden), '[]'::jsonb)
                    from unnest(v_falt) with ordinality as f(dato, orden)),
    'overrides_descartados', (select coalesce(jsonb_agg(jsonb_build_object('id', split_part(d.dato, '|', 1), 'motivo', split_part(d.dato, '|', 2))
                                                        order by d.orden), '[]'::jsonb)
                                from unnest(v_desc) with ordinality as d(dato, orden)));
end;
$$;

comment on function public.evaluar_formula(jsonb, jsonb, jsonb, jsonb) is
  'El motor del cotizador, espejo de evaluar() de TS: valores, estados, fuentes, totales, faltantes y overrides descartados. Pura: recibe las tablas vivas en la entrada. docs/COTIZADOR.md › «El motor».';

-- Los ayudantes los ejecuta quien llama a evaluar_formula (no es definer): authenticated sí, anon no.
do $$
declare f text;
begin
  foreach f in array array[
    '_motor_fallar(text,text,text)',
    '_motor_sin_validar(text,text)',
    '_motor_sin_leer(text,text)',
    '_motor_borde_mas(double precision,double precision)',
    '_motor_borde_menos(double precision,double precision)',
    '_motor_borde_por(double precision,double precision)',
    '_motor_borde_entre(double precision,double precision)',
    '_motor_borde_numero(jsonb)',
    '_motor_mas(double precision,double precision)',
    '_motor_menos(double precision,double precision)',
    '_motor_por(double precision,double precision)',
    '_motor_entre(double precision,double precision)',
    '_motor_numero(jsonb)',
    '_motor_redondear(double precision,integer)',
    '_motor_forma_entrada(jsonb)',
    '_motor_forma_modo(jsonb)',
    'evaluar_formula(jsonb,jsonb,jsonb,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
