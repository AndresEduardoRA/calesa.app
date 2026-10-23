-- cotizacion_evaluar(): arma lo que `evaluar_formula()` necesita (fórmula, tablas vivas, tipos de cambio, campos del vehículo) a partir
-- de una cotización o de un origen y de lo que la persona tipeó, y devuelve su resultado. Paso 4.06, prompt 2
-- (docs/COTIZADOR.md › «En la base (4.06-2)»). `evaluar_formula()` no se toca: sigue siendo pura.
--
-- Dos funciones:
--   _cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo) → (definicion, params, entrada): todas las comprobaciones y todas
--     las lecturas. Existe aparte para medir por separado ARMAR y EVALUAR y para que las guardas de escala apunten a ella.
--   cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo) → jsonb: `evaluar_formula()` sobre lo armado.
-- Las dos son `security definer`: leen tablas que quien llama no lee (`formulas`, `tablas_referencia_filas`), así que comprueban a mano lo
-- que la policy comprobaría (`puede_cotizacion`, `puede_vehiculo`, `cotizaciones.crear`).
--
-- Exactamente uno de `p_cotizacion` y `p_origen`:
--   - con cotización se usa SU `formula_id` (nunca la vigente), SU vehículo y SUS tipos de cambio congelados;
--   - con origen se usa la fórmula publicada, los tipos de cambio vigentes y el vehículo `p_vehiculo` (opcional, del mismo origen).
-- Lo que pone la base y no quien llama: `p_entradas` sólo lleva `inputs`, `banderas`, `overrides` y `variante`; `tipos_cambio`, `vehiculo`
-- y `tablas` los pone esta función. Su forma la revisa `evaluar_formula()`.
--
-- Qué se lee (cada consulta nombra el índice que la sostiene; `docs/RENDIMIENTO.md`):
--   - la fórmula: `formulas_pkey` (cotización) o `formulas_publicada_unica` (origen);
--   - las tablas: sólo las que un nodo nombra (`tabla` de un nodo `tabla`, `tramo` o del cálculo `depreciar`) y la fórmula no congeló
--     (la congelada de `params.tablas` manda aunque esté vacía): `tablas_referencia_origen_id_clave_key` y, de sus filas activas,
--     `tablas_referencia_filas_tabla_orden_idx` (tabla_id, orden, id). La del origen gana a la compartida (`origen_id is null`); una
--     inactiva no existe; `orden` admite repetidos y el `id` desempata, así que «la primera fila» es siempre la misma;
--   - los tipos de cambio: sólo los que un nodo `tipo_cambio` nombra (`tipos_cambio_clave_key`);
--   - el vehículo: `vehiculos_pkey`. Un campo que la fórmula nombra (`campo_vehiculo.campo` y los valores de un `match` que no son un nodo)
--     es una columna de `anio`, `marca`, `modelo`, `kilometraje`, `precio` o, si no, la clave de un campo activo del origen del vehículo
--     (`atributos -> clave`; la clave de un campo no lleva puntos: `atributos.x` no es el nombre de nada). Un número finito o un texto de hasta 200 letras; todo lo demás (un booleano, una lista, un texto largo, un
--     campo que no existe) no llega, y la fórmula anota `campo_sin_valor`.
-- Nada de esto crece con las cotizaciones, ni con las filas de otros orígenes, ni con las tablas que la fórmula no nombra.
--
-- Hasta el 4.10 nadie la llama desde la interfaz: devuelve el resultado entero (todavía no hay `formulas.visibilidad` ni niveles que lo
-- recorten), así que `execute` no es de `authenticated`. Las pruebas se lo dan dentro de una transacción que se revierte.

create or replace function public._cotizacion_armar(p_entradas jsonb, p_cotizacion uuid, p_origen uuid, p_vehiculo uuid)
returns table (definicion jsonb, params jsonb, entrada jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_origen uuid;
  v_formula uuid;
  v_vehiculo uuid;
  v_tc_cot jsonb;
  v_def jsonb;
  v_par jsonb;
  v_cong jsonb;
  v_ids text[];
  v_tablas text[];
  v_tcs text[];
  v_campos text[];
  v_match text[];
  v_vivas text[];
  v_extra text;
  v_tc jsonb;
  v_tab jsonb;
  v_veh jsonb := '{}'::jsonb;
  v_v_origen uuid;
  v_anio smallint; v_marca text; v_modelo text; v_km int; v_precio numeric; v_attr jsonb;
begin
  perform public.assert_activo();

  -- La llamada: uno de los dos, y el vehículo sólo con un origen (la cotización trae el suyo).
  if (p_cotizacion is null) = (p_origen is null) then
    perform public._motor_fallar('llamada_invalida', null, 'Evaluar pide una cotización o un origen, y no los dos ni ninguno.');
  end if;
  if p_cotizacion is not null and p_vehiculo is not null then
    perform public._motor_fallar('llamada_invalida', 'p_vehiculo', 'Una cotización ya trae su vehículo: no se pasa otro.');
  end if;
  -- Las entradas: un objeto y sólo lo que la persona puede tipear. Lo demás lo pone la base.
  if p_entradas is null or jsonb_typeof(p_entradas) <> 'object' then
    perform public._motor_fallar('entradas_invalidas', null, 'Las entradas son un objeto con inputs, banderas, overrides y variante.');
  end if;
  select min(k collate "C") into v_extra from jsonb_object_keys(p_entradas) k where k not in ('inputs', 'banderas', 'overrides', 'variante');
  if v_extra is not null then
    perform public._motor_fallar('entradas_invalidas', v_extra, 'Las entradas no llevan «' || v_extra || '»: la base lo pone.');
  end if;

  -- Quién puede, y de dónde sale la fórmula.
  if p_cotizacion is not null then
    -- Una cotización que no existe y una que no se ve dan el mismo error.
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select c.origen_id, c.formula_id, c.vehiculo_id, c.tipos_cambio into v_origen, v_formula, v_vehiculo, v_tc_cot
      from public.cotizaciones c where c.id = p_cotizacion;                                    -- cotizaciones_pkey
    select f.definicion, f.params into v_def, v_par from public.formulas f where f.id = v_formula;  -- formulas_pkey
  else
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    v_origen := p_origen;
    v_vehiculo := p_vehiculo;
    select f.definicion, f.params into v_def, v_par
      from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';          -- formulas_publicada_unica
    if not found then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
  end if;

  -- El vehículo: sólo si quien llama lo ve (esto corre con los derechos de la base y no puede devolver lo que él no vería).
  if v_vehiculo is not null then
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    select v.origen_id, v.anio, v.marca, v.modelo, v.kilometraje, v.precio, v.atributos
      into v_v_origen, v_anio, v_marca, v_modelo, v_km, v_precio, v_attr
      from public.vehiculos v where v.id = v_vehiculo;                                         -- vehiculos_pkey
    if p_vehiculo is not null and v_v_origen <> v_origen then
      perform public._motor_fallar('vehiculo_de_otro_origen', 'p_vehiculo', 'El vehículo no es de este origen.');
    end if;
  end if;

  -- Lo que la fórmula nombra, en una sola pasada por sus nodos (`definicion` se desarma una vez: un jsonb que llega de una columna
  -- comprimida se descomprime entero en cada `->`). Los campos del vehículo son los de `campo_vehiculo` y los valores de un `match` que
  -- no son el id de un nodo.
  select array_agg(distinct n ->> 'id'),
         coalesce(array_agg(distinct n ->> 'tabla') filter (where n ->> 'tabla' is not null), '{}'),
         coalesce(array_agg(distinct n ->> 'clave') filter (where n ->> 'tipo' = 'tipo_cambio'), '{}'),
         coalesce(array_agg(distinct n ->> 'campo') filter (where n ->> 'tipo' = 'campo_vehiculo'), '{}'),
         coalesce(array_agg(distinct m.value) filter (where m.value is not null), '{}')
    into v_ids, v_tablas, v_tcs, v_campos, v_match
    from jsonb_array_elements(v_def -> 'nodos') n
    left join lateral jsonb_each_text(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' end) m on true;
  v_campos := array(select distinct c from unnest(v_campos || array(select r from unnest(v_match) r where r <> all (coalesce(v_ids, '{}')))) c);

  -- Las tablas vivas: las que un nodo nombra y la fórmula no congeló.
  v_cong := v_par -> 'tablas';
  v_vivas := array(select t from unnest(v_tablas) t where jsonb_typeof(v_cong) is distinct from 'object' or not (v_cong ? t));
  select coalesce(jsonb_object_agg(x.clave, x.filas), '{}'::jsonb) into v_tab
    from (
      select c.clave,
             -- tablas_referencia_filas_tabla_orden_idx: sus filas activas, en su orden.
             (select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb)
                from public.tablas_referencia_filas f where f.tabla_id = t.id and f.activa) as filas
        from unnest(v_vivas) c (clave)
        -- tablas_referencia_origen_id_clave_key: la del origen y, si no hay una activa, la compartida.
        cross join lateral (
          select coalesce(
                   (select r.id from public.tablas_referencia r where r.origen_id = v_origen and r.clave = c.clave and r.activa),
                   (select r.id from public.tablas_referencia r where r.origen_id is null and r.clave = c.clave and r.activa)
                 ) as id
        ) t
       where t.id is not null
    ) x;

  -- Los tipos de cambio: los congelados de la cotización o los vigentes de la empresa, sólo los que un nodo nombra.
  if p_cotizacion is not null then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_tc
      from jsonb_each(case when jsonb_typeof(v_tc_cot) = 'object' then v_tc_cot else '{}'::jsonb end) e
     where e.key = any (v_tcs) and jsonb_typeof(e.value) = 'number' and (e.value)::numeric > 0;
  else
    select coalesce(jsonb_object_agg(t.clave, t.valor), '{}'::jsonb) into v_tc
      from public.tipos_cambio t where t.clave = any (v_tcs) and t.activo;                     -- tipos_cambio_clave_key
  end if;

  -- Los campos del vehículo.
  if v_vehiculo is not null then
    select coalesce(jsonb_object_agg(n.campo, n.valor) filter (where n.valor is not null), '{}'::jsonb) into v_veh
      from (
        select s.campo,
               case when jsonb_typeof(s.x) = 'number' and abs((s.x #>> '{}')::numeric) < 1e308 then s.x
                    when jsonb_typeof(s.x) = 'string' and char_length(s.x #>> '{}') <= 200 then s.x end as valor
          from (
            select k.campo,
                   case k.campo
                     when 'anio' then to_jsonb(v_anio)
                     when 'marca' then to_jsonb(v_marca)
                     when 'modelo' then to_jsonb(v_modelo)
                     when 'kilometraje' then to_jsonb(v_km)
                     when 'precio' then to_jsonb(v_precio)
                     -- origenes_campos_origen_id_clave_key: sólo un campo activo del origen del vehículo.
                     else case when exists (select 1 from public.origenes_campos oc
                                             where oc.origen_id = v_v_origen and oc.clave = k.campo and oc.activo)
                               then v_attr -> k.campo end
                   end as x
              from unnest(v_campos) k (campo)
          ) s
      ) n;
  end if;

  return query select
    v_def,
    v_par,
    jsonb_build_object(
      'inputs', case when p_entradas ? 'inputs' then p_entradas -> 'inputs' else '{}'::jsonb end,
      'banderas', case when p_entradas ? 'banderas' then p_entradas -> 'banderas' else '{}'::jsonb end,
      'tipos_cambio', v_tc,
      'vehiculo', v_veh,
      'tablas', v_tab,
      'overrides', case when p_entradas ? 'overrides' then p_entradas -> 'overrides' else '{}'::jsonb end)
    || case when p_entradas ? 'variante' then jsonb_build_object('variante', p_entradas -> 'variante') else '{}'::jsonb end;
end $$;
comment on function public._cotizacion_armar(jsonb, uuid, uuid, uuid) is
  'Arma la fórmula, las tablas vivas que ella nombra y no congeló, los tipos de cambio y los campos del vehículo para evaluar_formula(). Comprueba los permisos como la policy. Sólo la llama cotizacion_evaluar(); docs/COTIZADOR.md › «En la base (4.06-2)».';

create or replace function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.evaluar_formula(a.definicion, a.params, a.entrada, p_modo)
    from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo) a;
$$;
comment on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) is
  'Evalúa una cotización (con SU fórmula, SUS tipos de cambio y SU vehículo) o un origen (con su fórmula publicada) con lo que la persona tipeó. Devuelve el resultado entero de evaluar_formula(): sin execute para authenticated hasta que el 4.10 recorte por nivel. docs/COTIZADOR.md › «En la base (4.06-2)».';

revoke all on function public._cotizacion_armar(jsonb, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
