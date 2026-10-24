-- validar_diseno(): el candado del diseño de la hoja, espejo exacto de `validarDiseno()` de TS
-- (src/modules/cotizaciones/entities/validar-diseno.ts; docs/COTIZADOR.md › «El diseño de la hoja»). Paso 4.08, prompt 1.
--
-- El contrato con TS y con `casos-de-diseno.json`:
--   - el PRIMER rechazo, en el mismo orden fijo: primero la forma (el Zod de diseno.ts), después 27 reglas que cruzan el diseño con la
--     fórmula (modos, secciones, tarjeta, atajos, cobertura, tonos);
--   - errcode 22023, el código de la regla en DETAIL (PostgREST: `details`) y `donde` en HINT (sin donde, sin hint): el mismo
--     `_formula_rechazar()` de validar_formula();
--   - el texto es de cada lado (el de acá es el de motivos-de-diseno.ts).
-- El diseño no tiene registros: toda colección es un arreglo con su clave adentro, así que el orden de las claves de jsonb no cambia
-- nada, y una clave `__proto__` sólo puede ser una clave desconocida de un objeto estricto (`forma`, igual que Zod).
--
-- La definición llega ya validada por validar_formula() (el publicar llama a las dos, en ese orden). El contexto entra como arreglos:
-- los niveles que existen, los retirados y las claves de tono. «todos» siempre existe y nunca se retira.
--
-- Lineal en nodos e ítems: la fórmula y el diseño se desarman una vez; los mapas (id → posición, quién condiciona, el contexto) se arman
-- por conjuntos y se buscan con `?` (búsqueda binaria de jsonb); el estado por nodo va en arreglos de plpgsql (expandidos: O(1) por
-- elemento). Ningún `||` sobre jsonb ni `= any` dentro de un bucle. Cada rechazo es `perform public._formula_rechazar('<regla>', …)`,
-- y cada comprobación de forma lleva su `/*Dnn*/`: así una prueba de mutación apaga una de a una.

-- ---------------------------------------------------------------------------------------------------------------------------
-- §0 la forma de un ítem (esquemaItem de diseno.ts, estricto por `tipo`). Devuelve false en el primer problema. Dentro de un ítem el
-- orden no importa: `donde` es siempre el id de su sección.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_forma_item(p_i jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_tipo text;
  v_permitidas text[];
  v_a jsonb;
  v_num numeric;
  v_f float8;
begin
  if jsonb_typeof(p_i) is distinct from 'object' then /*D40*/ return false; end if;
  v_tipo := case when jsonb_typeof(p_i -> 'tipo') = 'string' then p_i ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'celda' then array['tipo', 'nodo', 'ancho', 'secundario', 'ayuda', 'nivel_ver', 'nivel_editar']
    when 'atajos' then array['tipo', 'nodo', 'columna', 'filas']
    when 'variante' then array['tipo', 'nodo']
    when 'interruptor' then array['tipo', 'nodo', 'efecto']
    when 'subtotal' then array['tipo', 'nodo']
  end;
  if v_permitidas is null then /*D41*/ return false; end if;
  -- Una clave que el tipo no lleva (también «__proto__», «clase» o «color») es un error, no se ignora.
  if (p_i - v_permitidas) <> '{}'::jsonb then /*D42*/ return false; end if;
  if (jsonb_typeof(p_i -> 'nodo') = 'string' and (p_i ->> 'nodo') ~ c_id) is not true then /*D43*/ return false; end if;

  if v_tipo = 'celda' then
    if (jsonb_typeof(p_i -> 'ancho') = 'string' and (p_i ->> 'ancho') in ('completo', 'mitad', 'tercio')) is not true then
      /*D44*/ return false;
    end if;
    if p_i ? 'secundario'
       and (jsonb_typeof(p_i -> 'secundario') = 'string' and (p_i ->> 'secundario') in ('porcentaje', 'monto')) is not true then
      /*D45*/ return false;
    end if;
    if p_i ? 'nivel_ver' and (jsonb_typeof(p_i -> 'nivel_ver') = 'string' and (p_i ->> 'nivel_ver') ~ c_id) is not true then
      /*D46*/ return false;
    end if;
    if p_i ? 'nivel_editar' and (jsonb_typeof(p_i -> 'nivel_editar') = 'string' and (p_i ->> 'nivel_editar') ~ c_id) is not true then
      /*D47*/ return false;
    end if;
    -- La ayuda es la tabla que se abre o un texto, no las dos.
    if p_i ? 'ayuda' then
      v_a := p_i -> 'ayuda';
      if jsonb_typeof(v_a) is distinct from 'object' then /*D48*/ return false; end if;
      if v_a ? 'tabla' then
        if (v_a - 'tabla') <> '{}'::jsonb then /*D49*/ return false; end if;
        if (jsonb_typeof(v_a -> 'tabla') = 'string' and (v_a ->> 'tabla') ~ c_id) is not true then /*D50*/ return false; end if;
      elsif v_a ? 'texto' then
        if (v_a - 'texto') <> '{}'::jsonb then /*D51*/ return false; end if;
        if (jsonb_typeof(v_a -> 'texto') = 'string' and char_length(v_a ->> 'texto') between 1 and 300) is not true then
          /*D52*/ return false;
        end if;
      else
        /*D53*/ return false;
      end if;
    end if;
  elsif v_tipo = 'atajos' then
    if (jsonb_typeof(p_i -> 'columna') = 'string' and (p_i ->> 'columna') ~ c_id) is not true then /*D54*/ return false; end if;
    -- `z.int().min(1).max(12)` sobre el número como lo lee JS: 1.0 y 0.99999999999999999 valen 1; lo que JS redondea a 0, no. Un
    -- entero menor que 1 sólo puede ser 0 (D56), y uno de 13 o más lo corta D57: sólo queda lo que el doble redondea a 13.
    if jsonb_typeof(p_i -> 'filas') is distinct from 'number' then /*D55*/ return false; end if;
    v_num := (p_i -> 'filas')::numeric;
    if abs(v_num) < 1e-300 then
      /*D56*/ return false;
    elsif abs(v_num) >= 13 then
      /*D57*/ return false;
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f > 12 then /*D58*/ return false; end if;
    end if;
  elsif v_tipo = 'interruptor' then
    if (jsonb_typeof(p_i -> 'efecto') = 'string' and (p_i ->> 'efecto') in ('habilita', 'muestra')) is not true then
      /*D59*/ return false;
    end if;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §0 la forma del diseño (esquemaDiseno). El primer problema en el orden en que Zod 4 da `issues[0]`: la cabecera (sus modos), las
-- secciones en orden, la tarjeta y, al final, las claves desconocidas de la raíz. `donde` = el id crudo de la sección si el error está
-- bajo ella y su id es un texto; en la cabecera, la tarjeta o la raíz, nada.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_forma(p_diseno jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_forma constant text := 'El diseño no tiene la forma esperada en «%s».';
  v_cab jsonb;
  v_modos jsonb;
  v_m jsonb;
  v_bs jsonb;
  v_b jsonb;
  v_secs jsonb;
  v_s jsonb;
  v_its jsonb;
  v_t jsonb;
  v_donde text;
begin
  if jsonb_typeof(p_diseno) is distinct from 'object' then
    /*D01*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;

  -- La cabecera: los modos y si se ofrece «Ver total Bs».
  v_cab := p_diseno -> 'cabecera';
  if jsonb_typeof(v_cab) is distinct from 'object' then
    /*D02*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if (v_cab - array['modos', 'ver_total_bs']) <> '{}'::jsonb then
    /*D03*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if jsonb_typeof(v_cab -> 'ver_total_bs') is distinct from 'boolean' then
    /*D04*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.ver_total_bs'));
  end if;
  v_modos := v_cab -> 'modos';
  if jsonb_typeof(v_modos) is distinct from 'array' then
    /*D05*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos'));
  end if;
  for i in 0 .. jsonb_array_length(v_modos) - 1 loop
    v_m := v_modos -> i;
    if jsonb_typeof(v_m) is distinct from 'object' then
      /*D06*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (v_m - array['clave', 'nombre', 'buckets', 'total_en']) <> '{}'::jsonb then
      /*D07*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (jsonb_typeof(v_m -> 'clave') = 'string' and (v_m ->> 'clave') ~ c_id) is not true then
      /*D08*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.clave'));
    end if;
    if (jsonb_typeof(v_m -> 'nombre') = 'string' and char_length(v_m ->> 'nombre') between 1 and 40) is not true then
      /*D09*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.nombre'));
    end if;
    if (jsonb_typeof(v_m -> 'total_en') = 'string' and (v_m ->> 'total_en') ~ c_id) is not true then
      /*D10*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.total_en'));
    end if;
    v_bs := v_m -> 'buckets';
    if jsonb_typeof(v_bs) is distinct from 'array' then
      /*D11*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    if jsonb_array_length(v_bs) < 1 then
      /*D32*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    for k in 0 .. jsonb_array_length(v_bs) - 1 loop
      v_b := v_bs -> k;
      if jsonb_typeof(v_b) is distinct from 'object' then
        /*D12*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (v_b - array['bucket', 'nodo']) <> '{}'::jsonb then
        /*D13*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (jsonb_typeof(v_b -> 'bucket') = 'string' and (v_b ->> 'bucket') ~ c_id) is not true then
        /*D14*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.bucket'));
      end if;
      if (jsonb_typeof(v_b -> 'nodo') = 'string' and (v_b ->> 'nodo') ~ c_id) is not true then
        /*D15*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.nodo'));
      end if;
    end loop;
  end loop;

  -- Las secciones, en orden. Cualquier problema bajo una sección se nombra con su id.
  v_secs := p_diseno -> 'secciones';
  if jsonb_typeof(v_secs) is distinct from 'array' then
    /*D16*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  if jsonb_array_length(v_secs) < 1 then
    /*D33*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_s := v_secs -> i;
    v_donde := case when jsonb_typeof(v_s -> 'id') = 'string' then v_s ->> 'id' end;
    if jsonb_typeof(v_s) is distinct from 'object' then
      /*D17*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (v_s - array['id', 'titulo', 'presentacion', 'nivel_ver', 'nivel_editar', 'items']) <> '{}'::jsonb then
      /*D18*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (jsonb_typeof(v_s -> 'id') = 'string' and (v_s ->> 'id') ~ c_id) is not true then
      /*D19*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.id'));
    end if;
    if v_s ? 'titulo' and (jsonb_typeof(v_s -> 'titulo') = 'string' and char_length(v_s ->> 'titulo') between 1 and 80) is not true then
      /*D20*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.titulo'));
    end if;
    if (jsonb_typeof(v_s -> 'presentacion') = 'string' and (v_s ->> 'presentacion') in ('principal', 'avanzado')) is not true then
      /*D21*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.presentacion'));
    end if;
    if v_s ? 'nivel_ver' and (jsonb_typeof(v_s -> 'nivel_ver') = 'string' and (v_s ->> 'nivel_ver') ~ c_id) is not true then
      /*D22*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_ver'));
    end if;
    if v_s ? 'nivel_editar' and (jsonb_typeof(v_s -> 'nivel_editar') = 'string' and (v_s ->> 'nivel_editar') ~ c_id) is not true then
      /*D23*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_editar'));
    end if;
    v_its := v_s -> 'items';
    if jsonb_typeof(v_its) is distinct from 'array' then
      /*D24*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    if jsonb_array_length(v_its) < 1 then
      /*D34*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      if not public._diseno_forma_item(v_its -> k) then
        /*D25*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items.' || k));
      end if;
    end loop;
  end loop;

  -- La tarjeta del total: el nodo y sus secundarios.
  v_t := p_diseno -> 'tarjeta_total';
  if jsonb_typeof(v_t) is distinct from 'object' then
    /*D26*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (v_t - array['nodo', 'secundarios']) <> '{}'::jsonb then
    /*D27*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (jsonb_typeof(v_t -> 'nodo') = 'string' and (v_t ->> 'nodo') ~ c_id) is not true then
    /*D28*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.nodo'));
  end if;
  v_its := v_t -> 'secundarios';
  if jsonb_typeof(v_its) is distinct from 'array' then
    /*D29*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios'));
  end if;
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    if (jsonb_typeof(v_its -> k) = 'string' and (v_its ->> k) ~ c_id) is not true then
      /*D30*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios.' || k));
    end if;
  end loop;

  if (p_diseno - array['cabecera', 'secciones', 'tarjeta_total']) <> '{}'::jsonb then
    /*D31*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- Un nivel existe y no está retirado. «todos» siempre existe y nunca se retira; sin nivel no hay nada que revisar.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_nivel(p_nivel text, p_donde text, p_niveles jsonb, p_retirados jsonb)
returns void language plpgsql stable set search_path = '' as $$
begin
  if p_nivel is null or p_nivel = 'todos' then return; end if;
  if not coalesce(p_niveles ? p_nivel, false) then
    perform public._formula_rechazar('nivel_inexistente', p_donde,
      format('«%s» usa el nivel «%s», que no existe.', p_donde, p_nivel));
  end if;
  if coalesce(p_retirados ? p_nivel, false) then
    perform public._formula_rechazar('nivel_retirado', p_donde,
      format('«%s» usa el nivel «%s», que está retirado: elige otro para esta celda o sección.', p_donde, p_nivel));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §1 los modos de tipo de cambio (validar-diseno-modos.ts). Un modo es otro `buckets` y otro `total_en`: nombra nodos `tipo_cambio`,
-- llena exactamente los buckets de la fórmula y sólo existe donde la fórmula ya divide el total en Bs. Por modo, en orden: duplicado,
-- sin total_en y, por entrada, bucket inexistente, repetido y tipo de cambio; después el total_en y lo incompleto.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_modos(p_modos jsonb, p_buckets jsonb, p_nb int, p_total_en text, p_pos jsonb, p_tipos text[])
returns void language plpgsql stable set search_path = '' as $$
declare
  v_dup boolean[];
  v_m jsonb;
  v_clave text;
  v_regla text;
  v_ref text;
  v_total text;
begin
  -- Un modo repite la clave de uno anterior.
  select coalesce(array_agg(d.rn > 1 order by d.ord), '{}')
    into v_dup
    from (select x.ord, row_number() over (partition by x.value ->> 'clave' order by x.ord) as rn
            from jsonb_array_elements(p_modos) with ordinality as x(value, ord)) d;
  for i in 1 .. coalesce(array_length(v_dup, 1), 0) loop
    v_m := p_modos -> (i - 1);
    v_clave := v_m ->> 'clave';
    if v_dup[i] then
      perform public._formula_rechazar('modo_duplicado', v_clave,
        format('Hay dos modos de tipo de cambio con la clave «%s».', v_clave));
    end if;
    if p_total_en is null then
      perform public._formula_rechazar('modo_sin_total_en', v_clave,
        format('El modo «%s» trae su propio «total_en», y la fórmula no tiene uno: con un modo el total cambiaría de cuenta.', v_clave));
    end if;
    -- La primera entrada que falla, y qué le pasa: bucket inexistente, repetido o un nodo que no es un tipo de cambio.
    select q.regla, q.ref
      into v_regla, v_ref
      from (select case when not coalesce(p_buckets ? e.bucket, false) then 'modo_bucket_inexistente'
                        when e.rep then 'modo_bucket_repetido'
                        when p_tipos[(p_pos ->> e.nodo)::int] is distinct from 'tipo_cambio' then 'modo_tipo_de_cambio_inexistente'
                   end as regla,
                   case when not coalesce(p_buckets ? e.bucket, false) or e.rep then e.bucket else e.nodo end as ref,
                   e.ord
              from (select x.ord, x.value ->> 'bucket' as bucket, x.value ->> 'nodo' as nodo,
                           row_number() over (partition by x.value ->> 'bucket' order by x.ord) > 1 as rep
                      from jsonb_array_elements(v_m -> 'buckets') with ordinality as x(value, ord)) e) q
     where q.regla is not null
     order by q.ord
     limit 1;
    if v_regla = 'modo_bucket_inexistente' then
      perform public._formula_rechazar('modo_bucket_inexistente', v_clave,
        format('El modo «%s» usa el bucket «%s», que la fórmula no tiene.', v_clave, v_ref));
    elsif v_regla = 'modo_bucket_repetido' then
      perform public._formula_rechazar('modo_bucket_repetido', v_clave,
        format('El modo «%s» llena dos veces el bucket «%s».', v_clave, v_ref));
    elsif v_regla = 'modo_tipo_de_cambio_inexistente' then
      perform public._formula_rechazar('modo_tipo_de_cambio_inexistente', v_clave,
        format('El modo «%s» nombra «%s», que no es un tipo de cambio de la fórmula.', v_clave, v_ref));
    end if;
    v_total := v_m ->> 'total_en';
    if p_tipos[(p_pos ->> v_total)::int] is distinct from 'tipo_cambio' then
      perform public._formula_rechazar('modo_tipo_de_cambio_inexistente', v_clave,
        format('El modo «%s» nombra «%s», que no es un tipo de cambio de la fórmula.', v_clave, v_total));
    end if;
    -- Cada bucket del modo existe en la fórmula y no se repite: llena todos si tiene tantos como ella.
    if jsonb_array_length(v_m -> 'buckets') < p_nb then
      perform public._formula_rechazar('modo_incompleto', v_clave,
        format('El modo «%s» tiene que llenar todos los buckets de la fórmula y le falta alguno.', v_clave));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura (validar-diseno-secciones.ts y validar-diseno-cobertura.ts). El estado
-- por nodo —cómo y con qué niveles se dibuja— va en arreglos indexados por la posición del nodo en la fórmula.
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public._diseno_secciones(
  p_secs jsonb, p_tarjeta jsonb, p_ids text[], p_tipos text[], p_ops text[], p_salidas text[], p_sobres boolean[], p_pcts text[],
  p_pos jsonb, p_cond jsonb, p_req jsonb, p_niveles jsonb, p_retirados jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare
  v_n int := coalesce(array_length(p_ids, 1), 0);
  v_aver text[] := array_fill(null::text, array[v_n]);     -- con qué nivel de ver se dibuja el nodo (nulo: no se dibuja)
  v_aedit text[] := array_fill(null::text, array[v_n]);    -- con qué nivel de editar
  v_atajo boolean[] := array_fill(false, array[v_n]);      -- ya tiene unos atajos
  v_visto boolean[] := array_fill(false, array[v_n]);      -- ya es un secundario de la tarjeta
  v_a_nodo int[] := '{}'::int[];                           -- los atajos, en el orden del diseño: nodo, niveles de su sección
  v_a_ver text[] := '{}'::text[];
  v_a_edit text[] := '{}'::text[];
  v_dup boolean[];
  v_s jsonb;
  v_its jsonb;
  v_it jsonb;
  v_sid text;
  v_hver text;
  v_hedit text;
  v_ver text;
  v_edit text;
  v_tipo text;
  v_nodo text;
  v_ntipo text;
  v_efecto text;
  v_pct text;
  v_esp boolean;
  j int;
  l int;
begin
  -- §2 las secciones, en orden. Una sección repite el id de una anterior.
  select coalesce(array_agg(d.rn > 1 order by d.ord), '{}')
    into v_dup
    from (select x.ord, row_number() over (partition by x.value ->> 'id' order by x.ord) as rn
            from jsonb_array_elements(p_secs) with ordinality as x(value, ord)) d;
  for i in 1 .. coalesce(array_length(v_dup, 1), 0) loop
    v_s := p_secs -> (i - 1);
    v_sid := v_s ->> 'id';
    if v_dup[i] then
      perform public._formula_rechazar('seccion_duplicada', v_sid, format('Hay dos secciones con el id «%s».', v_sid));
    end if;
    perform public._diseno_nivel(v_s ->> 'nivel_ver', v_sid, p_niveles, p_retirados);
    perform public._diseno_nivel(v_s ->> 'nivel_editar', v_sid, p_niveles, p_retirados);
    v_hver := coalesce(v_s ->> 'nivel_ver', 'todos');
    v_hedit := coalesce(v_s ->> 'nivel_editar', 'todos');
    v_its := v_s -> 'items';

    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      v_it := v_its -> k;
      v_tipo := v_it ->> 'tipo';
      v_nodo := v_it ->> 'nodo';
      j := (p_pos ->> v_nodo)::int;
      if j is null then
        perform public._formula_rechazar('nodo_inexistente', v_nodo,
          format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
      end if;
      v_ntipo := p_tipos[j];
      v_esp := v_ntipo = 'calculo' and p_ops[j] = 'porcentaje_de';
      v_ver := v_hver;
      v_edit := v_hedit;

      if v_tipo = 'celda' then
        if v_ntipo in ('opcion', 'bandera') then
          perform public._formula_rechazar('celda_no_es_valor', v_nodo,
            format('«%s» no se dibuja como celda: la variante va como chips y una bandera como interruptor.', v_nodo));
        end if;
        if v_it ? 'secundario' and not v_esp then
          perform public._formula_rechazar('secundario_sin_porcentaje', v_nodo,
            format('«%s» lleva un secundario y no es un porcentaje de otro monto.', v_nodo));
        end if;
        if v_esp and p_sobres[j] and not (v_it ? 'secundario') then
          perform public._formula_rechazar('par_sin_secundario', v_nodo,
            format('«%s» es un monto con su porcentaje y se sobrescribe: el par es una sola celda con su secundario.', v_nodo));
        end if;
        perform public._diseno_nivel(v_it ->> 'nivel_ver', v_nodo, p_niveles, p_retirados);
        perform public._diseno_nivel(v_it ->> 'nivel_editar', v_nodo, p_niveles, p_retirados);
        v_ver := coalesce(v_it ->> 'nivel_ver', v_hver);
        v_edit := coalesce(v_it ->> 'nivel_editar', v_hedit);
      elsif v_tipo = 'atajos' then
        if v_ntipo <> 'tabla' then
          perform public._formula_rechazar('atajos_no_es_tabla', v_nodo,
            format('Los atajos de «%s» van sobre un nodo de tabla, y ese nodo no lo es.', v_nodo));
        end if;
        if not p_sobres[j] then
          perform public._formula_rechazar('atajos_no_sobrescribible', v_nodo,
            format('Los atajos de «%s» eligen una fila y dejan su valor como sugerido: la tabla tiene que poder sobrescribirse.', v_nodo));
        end if;
      elsif v_tipo = 'variante' then
        if v_ntipo <> 'opcion' then
          perform public._formula_rechazar('variante_no_es_opcion', v_nodo,
            format('«%s» no es la variante de la fórmula.', v_nodo));
        end if;
      elsif v_tipo = 'interruptor' then
        if v_ntipo <> 'bandera' then
          perform public._formula_rechazar('interruptor_no_es_bandera', v_nodo,
            format('«%s» no es una bandera: un interruptor la enciende.', v_nodo));
        end if;
        -- «Habilita» apaga lo que la bandera condiciona o pide; «muestra», sólo lo que condiciona.
        v_efecto := v_it ->> 'efecto';
        if not (p_cond ? v_nodo) and not (v_efecto = 'habilita' and p_req ? v_nodo) then
          perform public._formula_rechazar('interruptor_sin_efecto', v_nodo,
            format('La bandera «%s» no condiciona ningún nodo: su interruptor no haría nada.', v_nodo));
        end if;
      elsif v_tipo = 'subtotal' then
        if v_ntipo <> 'calculo' then
          perform public._formula_rechazar('subtotal_no_es_calculo', v_nodo,
            format('«%s» no es un cálculo: un subtotal se dibuja desde uno.', v_nodo));
        end if;
      end if;

      -- El total, lo que va aparte y la variante los recibe todo el mundo (D7).
      if v_ver <> 'todos'
         and (v_tipo = 'variante' or (v_tipo in ('celda', 'subtotal') and p_salidas[j] in ('total', 'aparte'))) then
        perform public._formula_rechazar('nivel_no_admitido', v_nodo,
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', v_nodo));
      end if;

      -- Dónde se dibuja el valor del nodo (y el del porcentaje de un par); un segundo dibujo es `nodo_repetido`.
      if v_tipo = 'atajos' then
        if v_atajo[j] then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_atajo[j] := true;
        v_a_nodo := array_append(v_a_nodo, j);
        v_a_ver := array_append(v_a_ver, v_hver);
        v_a_edit := array_append(v_a_edit, v_hedit);
      else
        if v_aver[j] is not null then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_aver[j] := v_ver;
        v_aedit[j] := v_edit;
        if v_tipo = 'celda' and v_it ? 'secundario' then
          v_pct := p_pcts[j];
          l := (p_pos ->> v_pct)::int;
          if v_aver[l] is not null then
            perform public._formula_rechazar('nodo_repetido', v_pct, format('«%s» aparece dos veces en el diseño.', v_pct));
          end if;
          v_aver[l] := v_ver;
          v_aedit[l] := v_edit;
        end if;
      end if;
    end loop;
  end loop;

  -- §3 la tarjeta: el total y sus secundarios (la garantía), que repiten lo que la hoja ya dibuja.
  v_nodo := p_tarjeta ->> 'nodo';
  j := (p_pos ->> v_nodo)::int;
  if j is null then
    perform public._formula_rechazar('nodo_inexistente', v_nodo,
      format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
  end if;
  if p_salidas[j] is distinct from 'total' then
    perform public._formula_rechazar('tarjeta_no_es_el_total', v_nodo,
      format('La tarjeta nombra «%s», que no es el total de la fórmula.', v_nodo));
  end if;
  v_its := p_tarjeta -> 'secundarios';
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    v_nodo := v_its ->> k;
    j := (p_pos ->> v_nodo)::int;
    if j is null then
      perform public._formula_rechazar('nodo_inexistente', v_nodo,
        format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
    end if;
    if p_salidas[j] is distinct from 'aparte' then
      perform public._formula_rechazar('tarjeta_secundario_no_es_aparte', v_nodo,
        format('«%s» es un secundario de la tarjeta y no es una salida «aparte».', v_nodo));
    end if;
    if v_visto[j] then
      perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
    end if;
    v_visto[j] := true;
  end loop;

  -- §4 un atajos va sobre la celda de su nodo (o el porcentaje que ella muestra) y con sus mismos niveles.
  for i in 1 .. coalesce(array_length(v_a_nodo, 1), 0) loop
    j := v_a_nodo[i];
    if v_aver[j] is null then
      perform public._formula_rechazar('atajos_sin_celda', p_ids[j],
        format('Los atajos de «%s» necesitan la celda de ese nodo en el diseño.', p_ids[j]));
    end if;
    if v_aver[j] <> v_a_ver[i] or v_aedit[j] <> v_a_edit[i] then
      perform public._formula_rechazar('nodo_con_dos_niveles', p_ids[j],
        format('Los atajos de «%s» y su celda tienen niveles distintos: tienen que ser los mismos.', p_ids[j]));
    end if;
  end loop;

  -- §5 lo que la hoja tiene que dibujar sí o sí, en el orden de la fórmula: todo input y constante, la variante y las banderas que
  -- condicionan algo o piden un dato.
  for n in 1 .. v_n loop
    if v_aver[n] is null
       and (p_tipos[n] in ('input', 'constante', 'opcion')
            or (p_tipos[n] = 'bandera' and (p_cond ? p_ids[n] or p_req ? p_ids[n]))) then
      perform public._formula_rechazar('nodo_sin_seccion', p_ids[n],
        format('«%s» no está en ninguna sección del diseño.', p_ids[n]));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- validar_diseno(): la forma (§0), los modos (§1), las secciones, la tarjeta, los atajos y la cobertura (§2 a §5) y los tonos (§6).
-- ---------------------------------------------------------------------------------------------------------------------------
create or replace function public.validar_diseno(
  p_def jsonb, p_diseno jsonb, p_niveles text[], p_retirados text[], p_tonos text[])
returns void language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb;
  v_buckets jsonb;
  v_total_en text;
  v_grupos jsonb;
  v_pos jsonb;
  v_ids text[];
  v_tipos text[];
  v_ops text[];
  v_salidas text[];
  v_sobres boolean[];
  v_pcts text[];
  v_cond jsonb;
  v_req jsonb;
  v_niv jsonb;
  v_ret jsonb;
  v_ton jsonb;
  v_g jsonb;
  v_modos jsonb;
begin
  -- §0 la forma.
  perform public._diseno_forma(p_diseno);

  -- La fórmula, desarmada una vez: un id, una posición.
  v_nodos := p_def -> 'nodos';
  v_buckets := p_def -> 'buckets';
  v_total_en := p_def ->> 'total_en';
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(x.value ->> 'op' order by x.pos),
         array_agg(x.value ->> 'salida' order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         array_agg(x.value ->> 'pct' order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'condicion', true) filter (where x.value ->> 'condicion' is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(x.value ->> 'requerido_si', true) filter (where x.value ->> 'requerido_si' is not null), '{}'::jsonb)
    into v_pos, v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts, v_cond, v_req
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);

  -- El contexto, como conjuntos.
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_niv from unnest(p_niveles) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ret from unnest(p_retirados) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;

  -- §1 los modos.
  v_modos := p_diseno -> 'cabecera' -> 'modos';
  perform public._diseno_modos(v_modos, v_buckets, coalesce(cardinality(array(select jsonb_object_keys(v_buckets))), 0),
                               v_total_en, v_pos, v_tipos);

  -- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura.
  perform public._diseno_secciones(p_diseno -> 'secciones', p_diseno -> 'tarjeta_total', v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts,
                                   v_pos, v_cond, v_req, v_niv, v_ret);

  -- §6 el tono de cada grupo de la fórmula está en el catálogo de la empresa.
  for i in 0 .. jsonb_array_length(v_grupos) - 1 loop
    v_g := v_grupos -> i;
    if not coalesce(v_ton ? (v_g ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_g ->> 'id',
        format('El grupo «%s» usa un tono que no está en el catálogo.', v_g ->> 'id'));
    end if;
  end loop;
end;
$$;

-- Como validar_formula y sus ayudantes: los ejecuta quien llama (no son definer): authenticated sí, anon no.
do $$
declare f text;
begin
  foreach f in array array[
    '_diseno_forma_item(jsonb)',
    '_diseno_forma(jsonb)',
    '_diseno_nivel(text,text,jsonb,jsonb)',
    '_diseno_modos(jsonb,jsonb,integer,text,jsonb,text[])',
    '_diseno_secciones(jsonb,jsonb,text[],text[],text[],text[],boolean[],text[],jsonb,jsonb,jsonb,jsonb,jsonb)',
    'validar_diseno(jsonb,jsonb,text[],text[],text[])'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
