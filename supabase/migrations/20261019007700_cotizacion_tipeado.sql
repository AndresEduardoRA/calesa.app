-- Lo que la persona tipea se revisa en un solo lugar, y la variante oculta deja de delatarse (paso 4.10, prompt 2; 4-18).
--
-- `cotizacion_evaluar()` (…007200) revisaba lo tipeado por su cuenta: la forma de la entrada y del modo, la fórmula inválida, y que los inputs, las banderas y los overrides sólo
-- nombren nodos que quien llama ve. `cotizacion_crear()` (migración siguiente) tiene que hacer exactamente lo mismo antes de guardar: dos copias del mismo chequeo acaban
-- respondiendo distinto a la misma entrada, y la diferencia entre dos RPC es un oráculo. Se saca a `_cotizacion_tipeado()`; `cotizacion_evaluar()` la llama y, salvo 4-18,
-- responde igual que antes (los casos de `cotizacion-evaluar.sql` y `cotizaciones-visibilidad.sql` lo guardan).
--
-- 4-18: `cotizacion_evaluar()` no miraba la `variante` contra lo visible. El motor responde ««x» no es una opción de la variante «<id>»» con el id del nodo `opcion` en el texto y
-- en el `hint`, y sin variante responde «la fórmula no tiene variante»: con la opción oculta (un nivel que quien llama no tiene), un `variante` inventado delataba que el nodo
-- existe y cómo se llama, y uno válido manejaba un nodo que no ve. Ahora, con la opción oculta, elegir una variante da exactamente el error de una fórmula sin variante, y no
-- elegir ninguna cuando la opción no trae `por_defecto` da `variante_sin_eleccion`, que no nombra el nodo.
--
-- Además `_cotizacion_respuesta()`: la fila de una cotización con su snapshot recortado por nivel, que `cotizacion_leer()` arma y `cotizacion_crear()` devuelve (el mismo punto
-- de recorte para quien crea, quien repite el intento y quien lee).

create function public._cotizacion_tipeado(p_def jsonb, p_entrada jsonb, p_modo jsonb, p_ok jsonb)
returns text[] language plpgsql stable set search_path = '' as $$
declare
  v_hint text;
  v_tipos jsonb;
  v_k text;
  v_opc2 text;
  v_opc text;
  v_opc_por_defecto text;
  v_ov_ocultos text[] := '{}'::text[];
begin
  -- La forma de lo que llega, antes que cualquier otra cosa y con el texto del motor (así lo que es de forma da el mismo error aunque el nodo no se vea). Sólo lo que tipea la
  -- persona: las tablas las arma la base y el motor las revisa después (revisar las 4.000 filas de cuatro tablas costaba 11 ms, el doble de lo que cuesta el recorte entero).
  v_hint := public._motor_forma_entrada(p_entrada || jsonb_build_object('tablas', '{}'::jsonb));
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

  if jsonb_typeof(p_def -> 'nodos') <> 'array' then
    return v_ov_ocultos;
  end if;
  -- Una fórmula que el motor rechaza antes de mirar lo tipeado (dos variantes, o sin total) lo dice primero, como en el motor.
  v_opc2 := (array(select n ->> 'id' from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'tipo' = 'opcion'))[2];
  if v_opc2 is not null then perform public._motor_sin_validar(v_opc2, 'tiene dos variantes'); end if;
  if not exists (select 1 from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'salida' = 'total') then
    perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
  end if;

  -- Lo tipeado sólo nombra lo que se ve: un input o una bandera que no se ve da el error del que no existe (el orden y el texto son los de `evaluar_formula()`).
  if p_entrada -> 'inputs' <> '{}'::jsonb or p_entrada -> 'banderas' <> '{}'::jsonb or p_entrada -> 'overrides' <> '{}'::jsonb then
    select coalesce(jsonb_object_agg(n ->> 'id', n ->> 'tipo'), '{}'::jsonb) into v_tipos from jsonb_array_elements(p_def -> 'nodos') n;
    for v_k in select jsonb_object_keys(p_entrada -> 'inputs') loop
      if v_tipos ->> v_k is distinct from 'input' or not p_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
      end if;
    end loop;
    for v_k in select jsonb_object_keys(p_entrada -> 'banderas') loop
      if v_tipos ->> v_k is distinct from 'bandera' or not p_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
      end if;
    end loop;
  end if;

  -- 4-18: la variante que no se ve es, para quien llama, una fórmula sin variante. El motor la nombraría (en el texto y en el `hint`).
  select n ->> 'id', n ->> 'por_defecto' into v_opc, v_opc_por_defecto
    from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
  if v_opc is not null and not p_ok ? v_opc then
    if p_entrada ? 'variante' then
      perform public._motor_fallar('entrada_invalida', null,
        format('La entrada elige la variante «%s», y la fórmula no tiene variante.', p_entrada ->> 'variante'));
    elsif v_opc_por_defecto is null then
      perform public._motor_fallar('variante_sin_eleccion', null,
        'La hoja necesita una variante que no puedes ver: avisa a quien configura el cotizador.');
    end if;
  end if;

  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (lo hace quien llama, después de recortar).
  if p_entrada -> 'overrides' <> '{}'::jsonb then
    v_ov_ocultos := coalesce(array(select k from jsonb_object_keys(p_entrada -> 'overrides') k where v_tipos ? k and not p_ok ? k), '{}');
  end if;
  return v_ov_ocultos;
end $$;
revoke all on function public._cotizacion_tipeado(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_tipeado(jsonb, jsonb, jsonb, jsonb) is
  'Revisa lo que tipeó la persona (forma, fórmula inválida, inputs, banderas y variante sólo de nodos que ve) con el texto y el orden del motor, y devuelve los overrides de nodos que no ve. De nadie; la llaman cotizacion_evaluar y cotizacion_crear. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)».';

-- La respuesta de una cotización: las columnas que lee `authenticated` y el snapshot recortado por el nivel de quien llama (con SU versión de la fórmula). Con el contexto ya armado
-- (`_cotizacion_contexto`) no vuelve a pedir `_nodos_visibles()`.
create function public._cotizacion_respuesta(c public.cotizaciones, p_ctx jsonb default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_ctx jsonb := p_ctx; v_def jsonb; v_vis jsonb; v_cols jsonb;
begin
  if v_ctx is null then
    select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = c.formula_id;
    v_ctx := public._cotizacion_contexto(coalesce(array(select n.nodo from public._nodos_visibles(c.formula_id) n), '{}'), v_def, v_vis);
  end if;
  -- Las columnas que se devuelven son las que `authenticated` lee: el grant de columnas es la única fuente (una columna nueva sin grant no viaja).
  select coalesce(jsonb_object_agg(a.attname, to_jsonb(c) -> a.attname), '{}'::jsonb) into v_cols
    from pg_attribute a
   where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select');
  return jsonb_build_object('cotizacion', v_cols)
      || public._cotizacion_recorte(jsonb_build_object('valores', c.valores, 'fuentes', c.fuentes, 'totales', c.totales, 'tipos_cambio', c.tipos_cambio), v_ctx);
end $$;
revoke all on function public._cotizacion_respuesta(public.cotizaciones, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_respuesta(public.cotizaciones, jsonb) is
  'La fila de una cotización (las columnas que lee authenticated) con su snapshot recortado por nivel. De nadie; la llaman cotizacion_leer y cotizacion_crear. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)».';

create or replace function public.cotizacion_leer(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c public.cotizaciones;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  return public._cotizacion_respuesta(c);
end $$;

create or replace function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  v_visibles text[]; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_res jsonb;
begin
  select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(a.formula_id) n), '{}');
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, p_modo, v_ok);
  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
  if cardinality(v_ov_ocultos) > 0 then
    v_ent := jsonb_set(a.entrada, '{overrides}', (a.entrada -> 'overrides') - v_ov_ocultos);
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if p_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = p_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, p_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;
-- Misma firma y mismos grants que `…007200` (`create or replace` los conserva).
