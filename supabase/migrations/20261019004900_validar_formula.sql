-- validar_formula(): el candado de la fórmula, espejo exacto de `validarFormula()` de TS
-- (src/modules/cotizaciones/entities/validar.ts; docs/COTIZADOR.md › «Las reglas»). Paso 4.05, prompt 4.
--
-- El contrato con TS y con `casos-de-formula.json`:
--   - el PRIMER rechazo, en el mismo orden fijo: primero la forma (el Zod de nodos.ts y formula.ts), después 29 reglas cruzadas;
--   - errcode 22023, el código de la regla en DETAIL (PostgREST: `details`) y `donde` en HINT (sin donde, sin hint);
--   - el texto es de cada lado (el de acá es el de motivos-de-formula.ts).
-- Las claves de un objeto se recorren en el orden de jsonb (largo en bytes y después bytes): es lo único que la base ve y lo que se
-- guarda. Con dos errores en el mismo `params`, `buckets` o `match`, el editor (orden de inserción) puede nombrar otro.
--
-- Lineal en nodos y aristas: `p_def` se desarma una vez; los mapas (id → posición, grupo → lugar, clave → nodo) se arman por
-- conjuntos; buscar es la búsqueda binaria de jsonb; el estado por nodo va en arreglos de plpgsql (expandidos: O(1) por elemento).
-- Ningún `||` sobre jsonb ni `= any` dentro de un bucle.
--
-- Cada rechazo es `perform public._formula_rechazar('<regla literal>', …)`: así una prueba de mutación apaga una regla reemplazando
-- ese texto (como `if (0) return fallo('x'` en TS). Los `/*Fnn*/` marcan cada comprobación de la forma para mutarla de a una.
-- Una posición nula (una referencia o un total que no existe) se trata como el `undefined` de TS.

-- ---------------------------------------------------------------------------------------------------------------------------
-- El rechazo.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._formula_rechazar(p_regla text, p_donde text, p_mensaje text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  -- RAISE no admite una opción nula: sin `donde`, va sin hint.
  if p_donde is null then
    raise exception using errcode = '22023', message = p_mensaje, detail = p_regla;
  end if;
  raise exception using errcode = '22023', message = p_mensaje, detail = p_regla, hint = p_donde;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §0 la forma de un nodo (el Zod de nodos.ts, estricto por `tipo` y por `op`). Devuelve dónde está el primer problema (relativo al
-- nodo, para el mensaje) o null. Dentro de un nodo el orden no importa: `donde` es siempre su id.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._formula_forma_nodo(p_n jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  c_base constant text[] := array['id', 'etiqueta', 'formato', 'descripcion', 'seccion', 'color', 'salida', 'bucket', 'grupo', 'tipo'];
  v_tipo text;
  v_op text;
  v_permitidas text[];
  v_x jsonb;
  v_o jsonb;
  v_min int;
  v_max int;
  v_num numeric;
  v_f float8;
  k int;
begin
  if jsonb_typeof(p_n) is distinct from 'object' then /*F01*/ return ''; end if;
  v_tipo := case when jsonb_typeof(p_n -> 'tipo') = 'string' then p_n ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'input' then c_base || array['solo_en', 'condicion', 'sugerido_de', 'requerido_si']
    when 'constante' then c_base || array['solo_en', 'condicion']
    when 'tipo_cambio' then c_base || array['clave']
    when 'campo_vehiculo' then c_base || array['solo_en', 'campo']
    when 'bandera' then c_base || array['solo_en']
    when 'opcion' then c_base || array['opciones', 'por_defecto']
    when 'tabla' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'match', 'columna']
    when 'tramo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'sobre', 'columna']
    when 'calculo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'op', 'de']
  end;
  if v_permitidas is null then /*F02*/ return '.tipo'; end if;
  if v_tipo = 'calculo' then
    v_op := case when jsonb_typeof(p_n -> 'op') = 'string' then p_n ->> 'op' end;
    if (v_op in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear')) is not true then
      /*F03*/ return '.op';
    end if;
    v_permitidas := v_permitidas || case v_op
      when 'porcentaje_de' then array['pct']
      when 'depreciar' then array['tabla', 'sobre', 'columna']
      when 'redondear' then array['n']
      else '{}'::text[]
    end;
  end if;
  -- Una clave que el tipo no lleva (también una mal escrita) es un error, no se ignora.
  if (p_n - v_permitidas) <> '{}'::jsonb then /*F04*/ return ''; end if;

  -- Lo común a todo nodo.
  if (jsonb_typeof(p_n -> 'id') = 'string' and (p_n ->> 'id') ~ c_id) is not true then /*F05*/ return '.id'; end if;
  -- `tablas` es la clave de params donde van las filas congeladas (D5): ninguna constante se llama así.
  if v_tipo = 'constante' and p_n ->> 'id' = 'tablas' then /*F06*/ return '.id'; end if;
  if (jsonb_typeof(p_n -> 'etiqueta') = 'string' and char_length(p_n ->> 'etiqueta') between 1 and 80) is not true then
    /*F07*/ return '.etiqueta';
  end if;
  if p_n ? 'formato' and (jsonb_typeof(p_n -> 'formato') = 'string' and (p_n ->> 'formato') in ('usd', 'pct', 'raw', 'moneda')) is not true then
    /*F08*/ return '.formato';
  end if;
  if p_n ? 'descripcion' and (jsonb_typeof(p_n -> 'descripcion') = 'string' and char_length(p_n ->> 'descripcion') <= 300) is not true then
    /*F09*/ return '.descripcion';
  end if;
  if p_n ? 'seccion' and (jsonb_typeof(p_n -> 'seccion') = 'string' and char_length(p_n ->> 'seccion') between 1 and 60) is not true then
    /*F10*/ return '.seccion';
  end if;
  if p_n ? 'color' and (jsonb_typeof(p_n -> 'color') = 'string' and (p_n ->> 'color') in ('amarillo', 'verde', 'naranja')) is not true then
    /*F11*/ return '.color';
  end if;
  if p_n ? 'salida' and (jsonb_typeof(p_n -> 'salida') = 'string' and (p_n ->> 'salida') in ('total', 'base_imponible', 'aparte')) is not true then
    /*F12*/ return '.salida';
  end if;
  if p_n ? 'bucket' and (jsonb_typeof(p_n -> 'bucket') = 'string' and (p_n ->> 'bucket') ~ c_id) is not true then /*F13*/ return '.bucket'; end if;
  if p_n ? 'grupo' and (jsonb_typeof(p_n -> 'grupo') = 'string' and (p_n ->> 'grupo') ~ c_id) is not true then /*F14*/ return '.grupo'; end if;
  -- Lo que un nodo de valor suma (el tipo ya dijo si lo admite).
  if p_n ? 'solo_en' then
    v_x := p_n -> 'solo_en';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 1) is not true then /*F15*/ return '.solo_en'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F16*/ return '.solo_en.' || k; end if;
    end loop;
  end if;
  if (p_n ? 'condicion' or v_op = 'si')
     and (jsonb_typeof(p_n -> 'condicion') = 'string' and (p_n ->> 'condicion') ~ c_id) is not true then
    /*F17*/ return '.condicion';
  end if;
  if p_n ? 'sobrescribible' and jsonb_typeof(p_n -> 'sobrescribible') is distinct from 'boolean' then /*F18*/ return '.sobrescribible'; end if;

  -- Lo propio de cada tipo.
  if v_tipo = 'input' then
    if p_n ? 'sugerido_de' and (jsonb_typeof(p_n -> 'sugerido_de') = 'string' and (p_n ->> 'sugerido_de') ~ c_id) is not true then
      /*F19*/ return '.sugerido_de';
    end if;
    if p_n ? 'requerido_si' and (jsonb_typeof(p_n -> 'requerido_si') = 'string' and (p_n ->> 'requerido_si') ~ c_id) is not true then
      /*F20*/ return '.requerido_si';
    end if;
  elsif v_tipo = 'tipo_cambio' then
    if (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then /*F21*/ return '.clave'; end if;
  elsif v_tipo = 'campo_vehiculo' then
    if (jsonb_typeof(p_n -> 'campo') = 'string' and char_length(p_n ->> 'campo') <= 80 and (p_n ->> 'campo') ~ c_campo) is not true then
      /*F22*/ return '.campo';
    end if;
  elsif v_tipo = 'opcion' then
    v_x := p_n -> 'opciones';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 2) is not true then /*F23*/ return '.opciones'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      v_o := v_x -> k;
      if (jsonb_typeof(v_o) = 'object' and (v_o - array['clave', 'etiqueta', 'titulo']) = '{}'::jsonb
          and jsonb_typeof(v_o -> 'clave') = 'string' and (v_o ->> 'clave') ~ c_id
          and jsonb_typeof(v_o -> 'etiqueta') = 'string' and char_length(v_o ->> 'etiqueta') between 1 and 60
          and jsonb_typeof(v_o -> 'titulo') = 'string' and char_length(v_o ->> 'titulo') between 1 and 120) is not true then
        /*F24*/ return '.opciones.' || k;
      end if;
    end loop;
    if p_n ? 'por_defecto' and (jsonb_typeof(p_n -> 'por_defecto') = 'string' and (p_n ->> 'por_defecto') ~ c_id) is not true then
      /*F25*/ return '.por_defecto';
    end if;
  elsif v_tipo = 'tabla' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F26*/ return '.tabla'; end if;
    if jsonb_typeof(p_n -> 'match') is distinct from 'object' then /*F27*/ return '.match'; end if;
    -- columna de la tabla → un nodo anterior o un campo del vehículo.
    if exists (
      select 1 from jsonb_each(p_n -> 'match') m
       where (m.key ~ c_id and jsonb_typeof(m.value) = 'string' and char_length(m.value #>> '{}') <= 80
              and (m.value #>> '{}') ~ c_campo) is not true
    ) then
      /*F28*/ return '.match';
    end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F29*/ return '.columna'; end if;
  elsif v_tipo = 'tramo' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F30*/ return '.tabla'; end if;
    if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F31*/ return '.sobre'; end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F32*/ return '.columna'; end if;
  elsif v_tipo = 'calculo' then
    -- La aridad de cada operación, cerrada.
    v_min := case v_op when 'multiplicar' then 2 when 'restar' then 2 when 'dividir' then 2
                       when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 else 1 end;
    v_max := case v_op when 'dividir' then 2 when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 end;
    v_x := p_n -> 'de';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= v_min
        and (v_max is null or jsonb_array_length(v_x) <= v_max)) is not true then
      /*F33*/ return '.de';
    end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F34*/ return '.de.' || k; end if;
    end loop;
    if v_op = 'porcentaje_de' and (jsonb_typeof(p_n -> 'pct') = 'string' and (p_n ->> 'pct') ~ c_id) is not true then
      /*F35*/ return '.pct';
    end if;
    if v_op = 'depreciar' then
      if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F36*/ return '.tabla'; end if;
      if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F37*/ return '.sobre'; end if;
      if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F38*/ return '.columna'; end if;
    end if;
    if v_op = 'redondear' then
      -- `z.int().min(0).max(6)` sobre el número como lo lee JS: 2.0 y 6.0000000000000001 valen; lo que JS redondea a 0, también.
      if jsonb_typeof(p_n -> 'n') is distinct from 'number' then /*F39*/ return '.n'; end if;
      v_num := (p_n -> 'n')::numeric;
      if abs(v_num) < 1e-300 then
        if abs(v_num) > 2.4703282292062327e-324 then /*F40*/ return '.n'; end if;
      elsif abs(v_num) >= 7 then
        /*F41*/ return '.n';
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 0 or v_f > 6 then /*F42*/ return '.n'; end if;
      end if;
    end if;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §0 la forma de la fórmula (esquemaFormula + datosDeForma). El primer problema en el orden en que Zod 4 da `issues[0]`:
-- `definicion` (nodos → buckets → total_en → grupos → sus claves desconocidas) y después `params` (`tablas` primero, después las
-- demás claves). `donde` = el id crudo del nodo o del grupo si es texto, o la clave de params; si no, nada.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._formula_forma(p_def jsonb, p_params jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_forma constant text := 'La fórmula no tiene la forma esperada en «%s».';
  -- Donde JS lee un número como Infinity (y Zod lo rechaza): 2^1024 − 2^970, con el empate hacia Infinity.
  c_infinito constant numeric := power(2::numeric, 1024) - power(2::numeric, 970);
  v_nodos jsonb;
  v_buckets jsonb;
  v_grupos jsonb;
  v_tablas jsonb;
  v_x jsonb;
  v_campo text;
  v_clave text;
  v_donde text;
  i int;
begin
  if jsonb_typeof(p_def) is distinct from 'object' then
    /*F50*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion'));
  end if;
  v_nodos := p_def -> 'nodos';
  if jsonb_typeof(v_nodos) is distinct from 'array' then
    /*F51*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion.nodos'));
  end if;
  for i in 0 .. jsonb_array_length(v_nodos) - 1 loop
    v_x := v_nodos -> i;
    v_campo := public._formula_forma_nodo(v_x);
    if v_campo is not null then
      /*F52*/ perform public._formula_rechazar('forma', case when jsonb_typeof(v_x -> 'id') = 'string' then v_x ->> 'id' end,
                                               format(c_forma, 'definicion.nodos.' || i || v_campo));
    end if;
  end loop;

  -- bucket → id de un nodo `tipo_cambio`. `ninguno` quiere decir «sin bucket»: no puede ser el nombre de uno.
  if p_def ? 'buckets' then
    v_buckets := p_def -> 'buckets';
    if jsonb_typeof(v_buckets) is distinct from 'object' then
      /*F53*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion.buckets'));
    end if;
    for v_clave, v_x in select b.key, b.value from jsonb_each(v_buckets) b loop
      if (v_clave ~ c_id and v_clave <> 'ninguno' and jsonb_typeof(v_x) = 'string' and (v_x #>> '{}') ~ c_id) is not true then
        /*F54*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion.buckets.' || v_clave));
      end if;
    end loop;
  end if;
  if p_def ? 'total_en' and (jsonb_typeof(p_def -> 'total_en') = 'string' and (p_def ->> 'total_en') ~ c_id) is not true then
    /*F55*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion.total_en'));
  end if;

  -- Los grupos de la hoja: estrictos, con su plazo, su tono y su bucket.
  if p_def ? 'grupos' then
    v_grupos := p_def -> 'grupos';
    if jsonb_typeof(v_grupos) is distinct from 'array' then
      /*F56*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion.grupos'));
    end if;
    for i in 0 .. jsonb_array_length(v_grupos) - 1 loop
      v_x := v_grupos -> i;
      v_donde := case when jsonb_typeof(v_x -> 'id') = 'string' then v_x ->> 'id' end;
      if jsonb_typeof(v_x) is distinct from 'object' or (v_x - array['id', 'etiqueta', 'plazo', 'tono', 'bucket']) <> '{}'::jsonb then
        /*F57*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i));
      end if;
      if (jsonb_typeof(v_x -> 'id') = 'string' and (v_x ->> 'id') ~ c_id) is not true then
        /*F58*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i || '.id'));
      end if;
      if (jsonb_typeof(v_x -> 'etiqueta') = 'string' and char_length(v_x ->> 'etiqueta') between 1 and 60) is not true then
        /*F59*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i || '.etiqueta'));
      end if;
      if v_x ? 'plazo' and (jsonb_typeof(v_x -> 'plazo') = 'string' and char_length(v_x ->> 'plazo') between 1 and 40) is not true then
        /*F60*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i || '.plazo'));
      end if;
      if (jsonb_typeof(v_x -> 'tono') = 'string' and (v_x ->> 'tono') ~ c_id) is not true then
        /*F61*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i || '.tono'));
      end if;
      if (jsonb_typeof(v_x -> 'bucket') = 'string' and (v_x ->> 'bucket') ~ c_id) is not true then
        /*F62*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'definicion.grupos.' || i || '.bucket'));
      end if;
    end loop;
  end if;
  if (p_def - array['nodos', 'buckets', 'total_en', 'grupos']) <> '{}'::jsonb then
    /*F63*/ perform public._formula_rechazar('forma', null, format(c_forma, 'definicion'));
  end if;

  -- params: `{constante: número, …, tablas?: {clave: [filas]}}`. `tablas` va primero (es la clave declarada del Zod).
  if jsonb_typeof(p_params) is distinct from 'object' then
    /*F64*/ perform public._formula_rechazar('forma', null, format(c_forma, 'params'));
  end if;
  if p_params ? 'tablas' then
    v_tablas := p_params -> 'tablas';
    if jsonb_typeof(v_tablas) is distinct from 'object' then
      /*F65*/ perform public._formula_rechazar('forma', 'tablas', format(c_forma, 'params.tablas'));
    end if;
    if exists (select 1 from jsonb_each(v_tablas) t where (t.key ~ c_id and jsonb_typeof(t.value) = 'array') is not true) then
      /*F66*/ perform public._formula_rechazar('forma', 'tablas', format(c_forma, 'params.tablas'));
    end if;
    if exists (
      select 1 from jsonb_each(v_tablas) t cross join lateral jsonb_array_elements(t.value) f(fila)
       where jsonb_typeof(f.fila) is distinct from 'object'
    ) then
      /*F67*/ perform public._formula_rechazar('forma', 'tablas', format(c_forma, 'params.tablas'));
    end if;
    -- Una celda es un número, un texto de hasta 200 o null.
    if exists (
      select 1 from jsonb_each(v_tablas) t cross join lateral jsonb_array_elements(t.value) f(fila)
       cross join lateral jsonb_each(f.fila) c
       where (c.key ~ c_id
              and (jsonb_typeof(c.value) = 'null'
                   or (jsonb_typeof(c.value) = 'string' and char_length(c.value #>> '{}') <= 200)
                   or (jsonb_typeof(c.value) = 'number' and abs(c.value::numeric) < c_infinito))) is not true
    ) then
      /*F68*/ perform public._formula_rechazar('forma', 'tablas', format(c_forma, 'params.tablas'));
    end if;
  end if;
  for v_clave, v_x in select p.key, p.value from jsonb_each(p_params) p loop
    continue when v_clave = 'tablas';
    if (jsonb_typeof(v_x) = 'number' and abs(v_x::numeric) < c_infinito) is not true then
      /*F69*/ perform public._formula_rechazar('forma', v_clave, format(c_forma, 'params.' || v_clave));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- validar_formula(): la forma (§0) y §1 a §5; §6 y §7 en sus funciones (como validar-grupos.ts y validar-variante.ts).
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public.validar_formula(p_def jsonb, p_params jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare
  v_nodos jsonb;
  v_n int;
  v_pos jsonb;            -- id → posición (1..n); con un id repetido, la última, como el `pos.set` de TS
  v_ids text[];
  v_tipos text[];
  v_formatos text[];      -- `formato`, o `usd` si no lo trae
  v_sobres boolean[];     -- `sobrescribible: true`
  v_constantes jsonb;     -- el conjunto de ids de los nodos `constante`
  v_total int;            -- el primer nodo con `salida: total`
  v_totales int;
  v_nodo jsonb;
  v_x jsonb;
  v_id text;
  v_tipo text;
  v_ref text;
  v_papel text;
  v_otro text;
  v_refs text[];
  v_papeles text[];
  v_lectores_ref text[] := '{}';   -- cada arista (quien lee → qué lee), en el orden de los nodos y de sus referencias
  v_lectores_de text[] := '{}';
  v_lectores jsonb;                -- id leído → [primer lector, otro lector distinto]
  v_mal boolean;
  i int;
  j int;
  k int;
begin
  -- §0 la forma.
  perform public._formula_forma(p_def, p_params);
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);

  -- §1 el índice (indexar): un id, un solo nodo.
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(coalesce(x.value ->> 'formato', 'usd') order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'id', true) filter (where x.value ->> 'tipo' = 'constante'), '{}'::jsonb),
         coalesce(sum(case when x.value ->> 'salida' = 'total' then 1 else 0 end), 0),
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_pos, v_ids, v_tipos, v_formatos, v_sobres, v_constantes, v_totales, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  select d.id into v_id
    from (select x.value ->> 'id' as id, x.pos, min(x.pos) over (partition by x.value ->> 'id') as primera
            from jsonb_array_elements(v_nodos) with ordinality as x(value, pos)) d
   where d.pos > d.primera
   order by d.pos
   limit 1;
  if v_id is not null then
    perform public._formula_rechazar('nodo_duplicado', v_id, format('Hay dos nodos con el id «%s».', v_id));
  end if;

  -- §2 las referencias (revisarReferencias): existen, van hacia atrás y nombran el tipo que corresponde. En el orden de
  -- `referenciasDe()`. De paso se anotan las aristas, que §5 usa para saber quién lee cada nodo.
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_refs := '{}';
    v_papeles := '{}';
    if v_tipo = 'input' then
      if v_nodo ? 'sugerido_de' then v_refs := array_append(v_refs, v_nodo ->> 'sugerido_de'); v_papeles := array_append(v_papeles, 'sugerido_de'); end if;
      if v_nodo ? 'requerido_si' then v_refs := array_append(v_refs, v_nodo ->> 'requerido_si'); v_papeles := array_append(v_papeles, 'requerido_si'); end if;
    elsif v_tipo = 'tabla' then
      -- Los valores de `match`, en el orden de sus claves en jsonb.
      for v_ref in select m.value from jsonb_each_text(v_nodo -> 'match') m loop
        v_refs := array_append(v_refs, v_ref);
        v_papeles := array_append(v_papeles, 'match');
      end loop;
    elsif v_tipo = 'tramo' then
      v_refs := array_append(v_refs, v_nodo ->> 'sobre');
      v_papeles := array_append(v_papeles, 'sobre');
    elsif v_tipo = 'calculo' then
      v_x := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_x) - 1 loop
        v_refs := array_append(v_refs, v_x ->> k);
        v_papeles := array_append(v_papeles, 'de');
      end loop;
      if v_nodo ->> 'op' = 'porcentaje_de' then v_refs := array_append(v_refs, v_nodo ->> 'pct'); v_papeles := array_append(v_papeles, 'pct'); end if;
      if v_nodo ->> 'op' = 'depreciar' then v_refs := array_append(v_refs, v_nodo ->> 'sobre'); v_papeles := array_append(v_papeles, 'sobre'); end if;
    end if;
    -- `condicion` va al final en los tipos que la admiten (la forma ya sacó a los demás).
    if v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      v_refs := array_append(v_refs, v_nodo ->> 'condicion');
      v_papeles := array_append(v_papeles, 'condicion');
    end if;

    for k in 1 .. coalesce(array_length(v_refs, 1), 0) loop
      v_ref := v_refs[k];
      v_papel := v_papeles[k];
      v_lectores_ref := array_append(v_lectores_ref, v_ref);
      v_lectores_de := array_append(v_lectores_de, v_id);
      j := (v_pos ->> v_ref)::int;
      if j is null then
        -- Un `match` que no nombra un nodo nombra un campo del vehículo.
        continue when v_papel = 'match';
        perform public._formula_rechazar('referencia_inexistente', v_id,
          format('«%s» usa «%s», que no es un nodo de la fórmula.', v_id, v_ref));
        continue;
      end if;
      if j = i then
        perform public._formula_rechazar('ciclo', v_id, format('«%s» se usa a sí mismo: sería un ciclo.', v_id));
      end if;
      if j > i then
        perform public._formula_rechazar('referencia_hacia_adelante', v_id,
          format('«%s» usa «%s», que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.', v_id, v_ref));
      end if;
      if v_papel in ('condicion', 'requerido_si') and v_tipos[j] <> 'bandera' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel, 'una bandera'));
      end if;
      if v_tipos[j] = 'opcion' and v_papel <> 'match' then
        perform public._formula_rechazar('referencia_de_tipo', v_id,
          format('«%s» usa «%s» como %s, y tiene que ser %s.', v_id, v_ref, v_papel,
                 'un número (la variante se nombra en «solo_en» o en un «match»)'));
      end if;
    end loop;
  end loop;

  -- §3 el total (revisarTotal).
  if v_totales <> 1 then
    perform public._formula_rechazar('total_unico', null,
      format('La fórmula necesita exactamente un nodo con salida «total» (hay %s).', v_totales));
  end if;
  if v_total is not null then
    v_nodo := v_nodos -> (v_total - 1);
    v_tipo := v_tipos[v_total];
    -- soloEnDe, condicionDe y sobrescribibleDe: cada uno sólo en los tipos que lo admiten.
    if (v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en')
       or (v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion')
       or (v_tipo in ('tabla', 'tramo', 'calculo') and v_sobres[v_total]) then
      perform public._formula_rechazar('total_fijo', v_ids[v_total],
        format('El total «%s» no puede depender de una variante ni de un interruptor, ni sobrescribirse.', v_ids[v_total]));
    end if;
    -- El total es lo que se paga: un tipo de cambio, un campo, una bandera o la variante no lo son.
    if v_tipos[v_total] in ('tipo_cambio', 'campo_vehiculo', 'bandera', 'opcion') then
      perform public._formula_rechazar('total_no_es_monto', v_ids[v_total],
        format('El total «%s» tiene que dar un monto: un input, una constante, una tabla, un tramo o un cálculo.', v_ids[v_total]));
    end if;
  end if;

  -- §4 params (revisarParams): cada constante tiene su valor, y cada clave es una constante.
  for i in 1 .. v_n loop
    if v_tipos[i] = 'constante' and (v_ids[i] = 'tablas' or not p_params ? v_ids[i]) then
      perform public._formula_rechazar('constante_sin_valor', v_ids[i], format('La constante «%s» no tiene valor en params.', v_ids[i]));
    end if;
  end loop;
  for v_ref in select p.key from jsonb_each(p_params) p loop
    continue when v_ref = 'tablas';
    if not v_constantes ? v_ref then
      perform public._formula_rechazar('param_sin_constante', v_ref, format('params.%s no corresponde a ninguna constante.', v_ref));
    end if;
  end loop;

  -- §5 el par porcentaje-monto (revisarPares, decisión d). Quién lee cada nodo: el primero y, si hay, otro distinto.
  select coalesce(jsonb_object_agg(l.ref, jsonb_build_array(l.primero, l.otro)), '{}'::jsonb) into v_lectores
    from (select a.ref, a.primero, (array_agg(a.lector order by a.k) filter (where a.lector <> a.primero))[1] as otro
            from (select u.ref, u.lector, u.k, first_value(u.lector) over (partition by u.ref order by u.k) as primero
                    from unnest(v_lectores_ref, v_lectores_de) with ordinality as u(ref, lector, k)) a
           group by a.ref, a.primero) l;
  for i in 1 .. v_n loop
    continue when v_tipos[i] <> 'calculo';
    v_nodo := v_nodos -> (i - 1);
    continue when v_nodo ->> 'op' <> 'porcentaje_de';
    v_ref := v_nodo ->> 'pct';
    j := (v_pos ->> v_ref)::int;
    -- Un `porcentaje_de` es un monto y su porcentaje tiene formato pct; si se sobrescribe, su porcentaje da un monto y acepta un valor.
    v_mal := v_formatos[i] not in ('usd', 'moneda')
             or (j is not null and (v_formatos[j] <> 'pct'
                                    or (v_sobres[i] and not (v_tipos[j] in ('input', 'constante', 'tabla', 'tramo', 'calculo')
                                                             and (v_tipos[j] in ('input', 'constante', 'tipo_cambio') or v_sobres[j])))));
    if v_mal then
      perform public._formula_rechazar('par_mal_tipado', v_ids[i],
        format('«%s» es un porcentaje de otro monto: tiene que ser un monto y su porcentaje «%s», tener formato pct.', v_ids[i], v_ref));
    end if;
    if v_sobres[i] then
      v_x := v_lectores -> v_ref;
      v_otro := case when v_x ->> 0 = v_ids[i] then v_x ->> 1 else v_x ->> 0 end;
      if v_otro is not null then
        perform public._formula_rechazar('pct_compartido', v_ids[i],
          format('«%s» es el porcentaje de «%s», que se puede sobrescribir: ningún otro nodo lo puede leer (lo lee «%s»).', v_ref, v_ids[i], v_otro));
      end if;
    end if;
  end loop;

  -- §6 los tipos de cambio, los buckets y los grupos; §7 la variante.
  perform public._formula_cambio_y_grupos(v_nodos, v_pos, v_ids, v_tipos, v_formatos, v_total,
                                          p_def -> 'buckets', p_def -> 'total_en', p_def -> 'grupos');
  perform public._formula_variante(v_nodos, v_ids, v_tipos);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §6 los tipos de cambio, los buckets y los grupos (validar-grupos.ts, decisiones a y b del paso 4.05).
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._formula_cambio_y_grupos(
  p_nodos jsonb, p_pos jsonb, p_ids text[], p_tipos text[], p_formatos text[], p_total int,
  p_buckets jsonb, p_total_en jsonb, p_grupos jsonb
)
returns void language plpgsql immutable set search_path = '' as $$
declare
  v_n int := jsonb_array_length(p_nodos);
  v_nodo jsonb;
  v_x jsonb;
  v_id text;
  v_otro text;
  v_clave text;
  v_bucket text;
  v_ref text;
  v_grupo text;
  v_leido text;
  v_reparte boolean;
  v_lugar jsonb;            -- id de grupo → su lugar (1..g): uno por id, en el orden de su primera aparición (el Map de TS)
  v_grupo_ids text[];
  v_visto boolean[] := '{}';
  v_miembros int[];
  v_marcado boolean[] := '{}';  -- por la posición canónica de cada id (la de `p_pos`): un conjunto de ids, como el Set de TS
  i int;
  j int;
  k int;
  g int;
begin
  -- Una clave de tipo de cambio, un solo nodo.
  select t.id, t.primero, t.clave into v_id, v_otro, v_clave
    from (select x.value ->> 'id' as id, x.value ->> 'clave' as clave, x.pos,
                 first_value(x.value ->> 'id') over (partition by x.value ->> 'clave' order by x.pos) as primero,
                 min(x.pos) over (partition by x.value ->> 'clave') as primera
            from jsonb_array_elements(p_nodos) with ordinality as x(value, pos)
           where x.value ->> 'tipo' = 'tipo_cambio') t
   where t.pos > t.primera
   order by t.pos
   limit 1;
  if v_id is not null then
    perform public._formula_rechazar('tipo_de_cambio_repetido', v_id,
      format('«%s» y «%s» son el mismo tipo de cambio («%s»).', v_otro, v_id, v_clave));
  end if;
  -- `buckets` (en el orden de jsonb) y `total_en` nombran nodos `tipo_cambio`.
  for v_bucket, v_ref in select b.key, b.value from jsonb_each_text(coalesce(p_buckets, '{}'::jsonb)) b loop
    j := (p_pos ->> v_ref)::int;
    if j is null or p_tipos[j] <> 'tipo_cambio' then
      perform public._formula_rechazar('tipo_de_cambio_inexistente', 'buckets.' || v_bucket,
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'buckets.' || v_bucket, v_ref));
    end if;
  end loop;
  if p_total_en is not null then
    v_ref := p_total_en #>> '{}';
    j := (p_pos ->> v_ref)::int;
    if j is null or p_tipos[j] <> 'tipo_cambio' then
      perform public._formula_rechazar('tipo_de_cambio_inexistente', 'total_en',
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'total_en', v_ref));
    end if;
  end if;

  if jsonb_array_length(coalesce(p_grupos, '[]'::jsonb)) > 0 then
    -- Con grupos (revisarGrupos).
    if p_total_en is null then
      perform public._formula_rechazar('grupos_sin_total_en', null,
        'Con grupos, la fórmula necesita «total_en»: el tipo de cambio que divide el total en Bs.');
    end if;
    select coalesce(jsonb_object_agg(u.id, u.lugar), '{}'::jsonb), array_agg(u.id order by u.lugar)
      into v_lugar, v_grupo_ids
      from (select f.id, row_number() over (order by f.primera) as lugar
              from (select x.value ->> 'id' as id, min(x.pos) as primera
                      from jsonb_array_elements(p_grupos) with ordinality as x(value, pos)
                     group by x.value ->> 'id') f) u;
    v_miembros := array_fill(0, array[coalesce(array_length(v_grupo_ids, 1), 0)]);
    for k in 0 .. jsonb_array_length(p_grupos) - 1 loop
      v_x := p_grupos -> k;
      v_grupo := v_x ->> 'id';
      g := (v_lugar ->> v_grupo)::int;
      if v_visto[g] then
        perform public._formula_rechazar('grupo_duplicado', v_grupo, format('Hay dos grupos con el id «%s».', v_grupo));
      end if;
      v_visto[g] := true;
      if not coalesce(p_buckets ? (v_x ->> 'bucket'), false) then
        perform public._formula_rechazar('bucket_inexistente', v_grupo,
          format('«%s» usa el bucket «%s», que no está en buckets.', v_grupo, v_x ->> 'bucket'));
      end if;
    end loop;
    -- Los miembros (revisarMiembros).
    for i in 1 .. v_n loop
      v_nodo := p_nodos -> (i - 1);
      v_bucket := v_nodo ->> 'bucket';
      if v_bucket is not null and v_bucket <> 'ninguno' then
        perform public._formula_rechazar('bucket_con_grupos', p_ids[i],
          format('«%s» declara su bucket, y con grupos el tipo de cambio es del grupo.', p_ids[i]));
      end if;
      continue when not v_nodo ? 'grupo';
      v_grupo := v_nodo ->> 'grupo';
      g := (v_lugar ->> v_grupo)::int;
      if g is null then
        perform public._formula_rechazar('grupo_inexistente', p_ids[i],
          format('«%s» está en el grupo «%s», que no existe.', p_ids[i], v_grupo));
      else
        v_miembros[g] := v_miembros[g] + 1;
      end if;
      -- Sólo lo que da un monto, con formato usd o moneda, es miembro de un grupo.
      if p_tipos[i] not in ('input', 'constante', 'tabla', 'tramo', 'calculo') or p_formatos[i] not in ('usd', 'moneda') then
        perform public._formula_rechazar('miembro_no_es_monto', p_ids[i],
          format('«%s» está en el grupo «%s» y no es un monto: un miembro es un input, una constante, una tabla, un tramo o un cálculo, con formato usd o moneda.', p_ids[i], v_grupo));
      end if;
      if v_nodo ? 'salida' then
        perform public._formula_rechazar('miembro_con_salida', p_ids[i],
          format('«%s» es una salida y no puede sumar al grupo «%s».', p_ids[i], v_grupo));
      end if;
    end loop;
    -- Doble conteo (revisarDobleConteo): una pasada hacia adelante marca lo que acumula un miembro (el miembro, un cálculo que no
    -- es `porcentaje_de` y lee algo marcado, un `sugerido_de` de algo marcado).
    for i in 1 .. v_n loop
      v_nodo := p_nodos -> (i - 1);
      v_leido := null;
      if p_tipos[i] = 'calculo' and v_nodo ->> 'op' <> 'porcentaje_de' then
        v_x := v_nodo -> 'de';
        for k in 0 .. jsonb_array_length(v_x) - 1 loop
          j := (p_pos ->> (v_x ->> k))::int;
          if j is not null and v_marcado[j] then
            v_leido := v_x ->> k;
            exit;
          end if;
        end loop;
      elsif p_tipos[i] = 'input' and v_nodo ? 'sugerido_de' then
        j := (p_pos ->> (v_nodo ->> 'sugerido_de'))::int;
        if j is not null and v_marcado[j] then
          v_leido := v_nodo ->> 'sugerido_de';
        end if;
      end if;
      if v_nodo ? 'grupo' and v_leido is not null then
        perform public._formula_rechazar('doble_conteo', p_ids[i],
          format('«%s» está en el grupo «%s» y suma «%s», que ya cuenta en un grupo: se contaría dos veces.', p_ids[i], v_nodo ->> 'grupo', v_leido));
      end if;
      if v_nodo ? 'grupo' or v_leido is not null then
        v_marcado[(p_pos ->> p_ids[i])::int] := true;
      end if;
    end loop;
    for g in 1 .. coalesce(array_length(v_grupo_ids, 1), 0) loop
      if v_miembros[g] = 0 then
        perform public._formula_rechazar('grupo_vacio', v_grupo_ids[g], format('El grupo «%s» no tiene nodos.', v_grupo_ids[g]));
      end if;
    end loop;
  else
    -- La forma de la Fase 0 (revisarSinGrupos): el bucket va en el nodo y el total se reparte.
    for i in 1 .. v_n loop
      v_bucket := p_nodos -> (i - 1) ->> 'bucket';
      if v_bucket is not null and v_bucket <> 'ninguno' and not coalesce(p_buckets ? v_bucket, false) then
        perform public._formula_rechazar('bucket_inexistente', p_ids[i],
          format('«%s» usa el bucket «%s», que no está en buckets.', p_ids[i], v_bucket));
      end if;
    end loop;
    -- El total tiene bucket, o es una suma y cada término directo tiene el suyo.
    if p_total is not null then
      v_nodo := p_nodos -> (p_total - 1);
      v_bucket := v_nodo ->> 'bucket';
      if v_bucket is null or v_bucket = 'ninguno' then
        v_reparte := p_tipos[p_total] = 'calculo' and v_nodo ->> 'op' = 'suma';
        if v_reparte then
          v_x := v_nodo -> 'de';
          for k in 0 .. jsonb_array_length(v_x) - 1 loop
            j := (p_pos ->> (v_x ->> k))::int;
            v_bucket := case when j is not null then p_nodos -> (j - 1) ->> 'bucket' end;
            if v_bucket is null or v_bucket = 'ninguno' then
              v_reparte := false;
              exit;
            end if;
          end loop;
        end if;
        if not v_reparte then
          perform public._formula_rechazar('total_sin_tipo_de_cambio', p_ids[p_total],
            format('Sin grupos, el total «%s» necesita un bucket, o ser una suma de nodos que lo tengan.', p_ids[p_total]));
        end if;
      end if;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §7 la variante (validar-variante.ts, decisión e): a lo sumo un nodo `opcion`, sus claves sin repetir, y `solo_en` después de él
-- y con claves que existen. Las claves de la primera `opcion` se revisan al llegar a ella, antes de ver una segunda.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._formula_variante(p_nodos jsonb, p_ids text[], p_tipos text[])
returns void language plpgsql immutable set search_path = '' as $$
declare
  v_n int := jsonb_array_length(p_nodos);
  v_variante int;       -- la posición de la variante (la última `opcion` vista, como TS)
  v_variante_id text;
  v_claves jsonb;       -- sus claves → true
  v_nodo jsonb;
  v_x jsonb;
  v_clave text;
  i int;
  k int;
begin
  for i in 1 .. v_n loop
    continue when p_tipos[i] <> 'opcion';
    if v_variante is not null then
      perform public._formula_rechazar('opcion_repetida', p_ids[i],
        format('La fórmula tiene dos variantes («%s» y «%s»): va una sola.', v_variante_id, p_ids[i]));
    end if;
    v_nodo := p_nodos -> (i - 1);
    select o.clave into v_clave
      from (select x.value ->> 'clave' as clave, x.pos, min(x.pos) over (partition by x.value ->> 'clave') as primera
              from jsonb_array_elements(v_nodo -> 'opciones') with ordinality as x(value, pos)) o
     where o.pos > o.primera
     order by o.pos
     limit 1;
    if v_clave is not null then
      perform public._formula_rechazar('opcion_clave_repetida', p_ids[i],
        format('La variante «%s» repite la opción «%s».', p_ids[i], v_clave));
    end if;
    select coalesce(jsonb_object_agg(x.value ->> 'clave', true), '{}'::jsonb) into v_claves
      from jsonb_array_elements(v_nodo -> 'opciones') as x(value);
    if v_nodo ? 'por_defecto' and not v_claves ? (v_nodo ->> 'por_defecto') then
      perform public._formula_rechazar('opcion_por_defecto_inexistente', p_ids[i],
        format('La opción por defecto «%s» no es una opción de «%s».', v_nodo ->> 'por_defecto', p_ids[i]));
    end if;
    v_variante := i;
    v_variante_id := p_ids[i];
  end loop;
  -- `solo_en` lee la variante: va después de ella, como toda referencia, y nombra opciones que tiene.
  for i in 1 .. v_n loop
    continue when p_tipos[i] in ('tipo_cambio', 'opcion');
    v_x := p_nodos -> (i - 1) -> 'solo_en';
    continue when v_x is null;
    if v_variante is null then
      perform public._formula_rechazar('solo_en_sin_opcion', p_ids[i],
        format('«%s» dice en qué variantes vale, y la fórmula no tiene variante.', p_ids[i]));
    end if;
    if v_variante > i then
      perform public._formula_rechazar('referencia_hacia_adelante', p_ids[i],
        format('«%s» usa «%s», que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.', p_ids[i], v_variante_id));
    end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if not coalesce(v_claves ? (v_x ->> k), false) then
        perform public._formula_rechazar('solo_en_opcion_inexistente', p_ids[i],
          format('«%s» nombra la opción «%s», que la variante no tiene.', p_ids[i], v_x ->> k));
      end if;
    end loop;
  end loop;
end;
$$;

comment on function public.validar_formula(jsonb, jsonb) is
  'El candado de la fórmula, espejo de validarFormula() de TS: lanza 22023 con la regla en DETAIL y donde en HINT. docs/COTIZADOR.md › «Las reglas».';

-- Los ayudantes los ejecuta quien llama a validar_formula (no es definer): authenticated sí, anon no.
do $$
declare f text;
begin
  foreach f in array array[
    '_formula_rechazar(text,text,text)',
    '_formula_forma_nodo(jsonb)',
    '_formula_forma(jsonb,jsonb)',
    '_formula_cambio_y_grupos(jsonb,jsonb,text[],text[],text[],integer,jsonb,jsonb,jsonb)',
    '_formula_variante(jsonb,text[],text[])',
    'validar_formula(jsonb,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
