-- Motor común de campos configurables. Escrito a mano.
--
-- Los orígenes ya tenían un layout de campos (`origenes_campos`) con sus reglas: nombre, opciones,
-- valor por defecto, cuánto impacta un cambio, orden relativo y validación de lo que se guarda en
-- `vehiculos.atributos`. Los leads van a tener el suyo (`leads_campos`) con las mismas reglas, así
-- que acá se separa lo que no depende de qué se configura: funciones `_campo_*`, `_campos_*` y
-- `_atributos_*` que no leen ninguna tabla (reciben lo que tienen que mirar).
--
-- Sin cambios de comportamiento: las `_origen_*`, `origen_campo_impacto`, `origen_campo_mover`,
-- `_vehiculo_aplicar` y `vehiculo_validar_atributos` conservan firma, resultados y mensajes. El humo
-- existente es la prueba. Todo es `create or replace`: se aplica igual sobre la base viva.

-- ---------------------------------------------------------------------------
-- Lo que no depende de qué se configura
-- ---------------------------------------------------------------------------
create or replace function public._campo_nombre_valido(p_texto text, p_que text, p_largo int)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v = '' then raise exception 'Falta %.', p_que; end if;
  if length(v) > p_largo then raise exception 'Máximo % caracteres para %.', p_largo, p_que; end if;
  return v;
end;
$$;
revoke all on function public._campo_nombre_valido(text, text, int) from public, anon, authenticated;

-- Opciones de un campo: [{clave, etiqueta}] con claves únicas y bien formadas.
create or replace function public._campo_opciones_validas(p_opciones jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_item jsonb; v_claves text[] := '{}'; v_clave text;
begin
  if p_opciones is null or jsonb_typeof(p_opciones) <> 'array' then
    raise exception 'Las opciones tienen que ser una lista.';
  end if;
  for v_item in select * from jsonb_array_elements(p_opciones) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Cada opción necesita una clave y una etiqueta.';
    end if;
    v_clave := v_item ->> 'clave';
    if v_clave is null or v_clave !~ '^[a-z0-9][a-z0-9_]{0,40}$' then
      raise exception 'La clave de una opción usa minúsculas, números y guion bajo.';
    end if;
    if nullif(btrim(v_item ->> 'etiqueta'), '') is null then
      raise exception 'Cada opción necesita una etiqueta.';
    end if;
    if v_clave = any (v_claves) then
      raise exception 'Hay dos opciones con la clave «%».', v_clave;
    end if;
    v_claves := v_claves || v_clave;
  end loop;
end;
$$;
revoke all on function public._campo_opciones_validas(jsonb) from public, anon, authenticated;

-- El valor por defecto tal como se guarda, o un rechazo si no sirve para ese tipo y esas opciones.
-- Vacío (nulo, texto vacío, lista vacía) = sin valor por defecto.
create or replace function public._campo_valor_defecto(p_tipo public.tipo_campo, p_opciones jsonb, p_valor jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v_claves text[];
begin
  if p_valor is null or p_valor in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then return null; end if;
  select coalesce(array_agg(o ->> 'clave'), '{}') into v_claves from jsonb_array_elements(coalesce(p_opciones, '[]'::jsonb)) o;
  case
    when p_tipo in ('texto', 'texto_largo') then
      if jsonb_typeof(p_valor) <> 'string' or char_length(p_valor #>> '{}') > 500 then
        raise exception 'El valor por defecto tiene que ser un texto de hasta 500 caracteres.' using errcode = '22023';
      end if;
    when p_tipo in ('numero', 'moneda') then
      if jsonb_typeof(p_valor) <> 'number' then
        raise exception 'El valor por defecto tiene que ser un número.' using errcode = '22023';
      end if;
    when p_tipo = 'booleano' then
      if jsonb_typeof(p_valor) <> 'boolean' then
        raise exception 'El valor por defecto tiene que ser sí o no.' using errcode = '22023';
      end if;
    when p_tipo = 'opcion' then
      if jsonb_typeof(p_valor) <> 'string' or not ((p_valor #>> '{}') = any (v_claves)) then
        raise exception 'El valor por defecto tiene que ser una de las opciones.' using errcode = '22023';
      end if;
    when p_tipo = 'multi_opcion' then
      if jsonb_typeof(p_valor) <> 'array'
         or exists (select 1 from jsonb_array_elements(p_valor) e where jsonb_typeof(e) <> 'string' or not ((e #>> '{}') = any (v_claves))) then
        raise exception 'El valor por defecto tiene que ser una lista de las opciones.' using errcode = '22023';
      end if;
    else
      raise exception 'Un campo de ese tipo no lleva valor por defecto.' using errcode = '22023';
  end case;
  return p_valor;
end;
$$;
revoke all on function public._campo_valor_defecto(public.tipo_campo, jsonb, jsonb) from public, anon, authenticated;

-- ¿Hay un dato? Ausente (nulo de SQL), `null`, `""` y `[]` son «sin dato».
create or replace function public._campo_tiene_valor(p_valor jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select p_valor is not null and p_valor not in ('null'::jsonb, '""'::jsonb, '[]'::jsonb);
$$;
revoke all on function public._campo_tiene_valor(jsonb) from public, anon, authenticated;

-- Lo que cambiaría una edición, contado sobre el valor de ese campo en cada registro del ámbito
-- (`array(select atributos -> clave from …)`: un nulo de SQL es «no lo tiene»). Para un campo de
-- opciones, cuántos registros tienen cada opción.
create or replace function public._campo_impacto(p_valores jsonb[], p_tipo public.tipo_campo)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v_total int := coalesce(cardinality(p_valores), 0); v_con int; v_por jsonb := '{}'::jsonb;
begin
  select count(*)::int into v_con from unnest(p_valores) v where public._campo_tiene_valor(v);
  if p_tipo = 'opcion' then
    select coalesce(jsonb_object_agg(t.valor, t.n), '{}'::jsonb) into v_por from (
      select v #>> '{}' as valor, count(*)::int as n from unnest(p_valores) v
      where v is not null and v not in ('null'::jsonb, '""'::jsonb) group by 1) t;
  elsif p_tipo = 'multi_opcion' then
    select coalesce(jsonb_object_agg(t.valor, t.n), '{}'::jsonb) into v_por from (
      select e.valor, count(*)::int as n from unnest(p_valores) v
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end) as e (valor)
      where v is not null group by 1) t;
  end if;
  return jsonb_build_object('total', v_total, 'con_valor', v_con, 'sin_valor', v_total - v_con, 'por_opcion', v_por);
end;
$$;
revoke all on function public._campo_impacto(jsonb[], public.tipo_campo) from public, anon, authenticated;

-- Orden relativo. `p_filas` es `[{id, clave, orden}]` del ámbito entero. Devuelve el orden nuevo de
-- cada uno (10, 20, 30…): quien llama sólo actualiza las filas que cambian de número, así editar un
-- campo no vuelve «conflictivos» a sus vecinos.
create or replace function public._campos_renumerar(p_filas jsonb)
returns table (campo_id uuid, orden_nuevo smallint) language sql immutable set search_path = '' as $$
  select (f ->> 'id')::uuid, (row_number() over (order by (f ->> 'orden')::numeric, f ->> 'clave') * 10)::smallint
  from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) f;
$$;
revoke all on function public._campos_renumerar(jsonb) from public, anon, authenticated;

-- «Ponlo después de X» (nulo = primero): el campo toma la posición del vecino más medio lugar y se
-- renumera todo. Relativo y no por posición: si alguien agregó un campo entre tanto, queda junto al
-- vecino que se eligió.
create or replace function public._campos_reordenar(p_filas jsonb, p_campo uuid, p_despues_de uuid)
returns table (campo_id uuid, orden_nuevo smallint) language sql immutable set search_path = '' as $$
  select q.id, (row_number() over (order by q.posicion, q.clave) * 10)::smallint
  from (
    select (f ->> 'id')::uuid as id, f ->> 'clave' as clave,
      case
        when (f ->> 'id')::uuid = p_campo then
          case when p_despues_de is null then -1.0
               else (select (g ->> 'orden')::numeric from jsonb_array_elements(p_filas) g where (g ->> 'id')::uuid = p_despues_de) + 0.5 end
        else (f ->> 'orden')::numeric
      end as posicion
    from jsonb_array_elements(p_filas) f
  ) q;
$$;
revoke all on function public._campos_reordenar(jsonb, uuid, uuid) from public, anon, authenticated;

-- Lo que se escribe en los atributos: se fusiona por clave (lo de un campo desactivado queda como
-- estaba) y nunca se guarda un nulo: vaciar quita la clave. Un `null` guardado entraría en todo
-- filtro «hasta N». `p_msg_clave` lleva `%s` donde va la clave.
create or replace function public._atributos_fusionar(p_actuales jsonb, p_cambios jsonb, p_activas text[], p_msg_objeto text, p_msg_clave text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare k text; x jsonb; v jsonb := p_actuales;
begin
  if jsonb_typeof(p_cambios) <> 'object' then
    raise exception '%', p_msg_objeto using errcode = '22023';
  end if;
  for k, x in select * from jsonb_each(p_cambios) loop
    if not (k = any (p_activas)) then
      raise exception '%', format(p_msg_clave, k) using errcode = '22023', hint = 'atributos.' || k;
    end if;
    if x in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then
      v := v - k;
    else
      v := v || jsonb_build_object(k, x);
    end if;
  end loop;
  return v;
end;
$$;
revoke all on function public._atributos_fusionar(jsonb, jsonb, text[], text, text) from public, anon, authenticated;

-- Los atributos contra los campos activos (`[{clave, etiqueta, tipo, requerido}]`): lo requerido y el
-- tipo del JSON de cada uno. El `hint` lleva `atributos.<clave>`: la app pinta el motivo junto al campo.
create or replace function public._atributos_validar(p_atributos jsonb, p_campos jsonb, p_msg_objeto text)
returns void language plpgsql immutable set search_path = '' as $$
declare c record; v jsonb;
begin
  if jsonb_typeof(p_atributos) <> 'object' then
    raise exception '%', p_msg_objeto using errcode = '22023';
  end if;
  for c in select x.clave, x.etiqueta, x.tipo, x.requerido
           from jsonb_to_recordset(coalesce(p_campos, '[]'::jsonb)) as x (clave text, etiqueta text, tipo text, requerido boolean) loop
    v := p_atributos -> c.clave;
    if c.requerido and (v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and v #>> '{}' = '') or v = '[]'::jsonb) then
      raise exception 'Falta «%».', c.etiqueta using errcode = '23502', hint = 'atributos.' || c.clave;
    end if;
    if v is not null and v <> 'null'::jsonb then
      case c.tipo
        when 'numero', 'moneda' then
          if jsonb_typeof(v) <> 'number' then raise exception '«%» tiene que ser un número.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave; end if;
        when 'booleano' then
          if jsonb_typeof(v) <> 'boolean' then raise exception '«%» tiene que ser sí o no.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave; end if;
        when 'multi_opcion' then
          if jsonb_typeof(v) <> 'array' then raise exception '«%» tiene que ser una lista.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave; end if;
        else
          if jsonb_typeof(v) not in ('string', 'number') then raise exception '«%» tiene que ser un texto.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave; end if;
      end case;
    end if;
  end loop;
end;
$$;
revoke all on function public._atributos_validar(jsonb, jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Orígenes: las mismas funciones, ahora sobre el motor
-- ---------------------------------------------------------------------------
create or replace function public._origen_nombre_valido(p_texto text, p_que text, p_largo int)
returns text language sql immutable set search_path = '' as $$
  select public._campo_nombre_valido(p_texto, p_que, p_largo);
$$;
revoke all on function public._origen_nombre_valido(text, text, int) from public, anon, authenticated;

create or replace function public._origen_opciones_validas(p_opciones jsonb)
returns void language sql immutable set search_path = '' as $$
  select public._campo_opciones_validas(p_opciones);
$$;
revoke all on function public._origen_opciones_validas(jsonb) from public, anon, authenticated;

create or replace function public._origen_valor_defecto(p_tipo public.tipo_campo, p_opciones jsonb, p_valor jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select public._campo_valor_defecto(p_tipo, p_opciones, p_valor);
$$;
revoke all on function public._origen_valor_defecto(public.tipo_campo, jsonb, jsonb) from public, anon, authenticated;

-- ¿Un vehículo tiene valor en este atributo? Cuenta también los de la papelera.
create or replace function public._origen_vehiculos_con_valor(p_origen uuid, p_clave text)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.vehiculos v
  where v.origen_id = p_origen and public._campo_tiene_valor(v.atributos -> p_clave);
$$;
revoke all on function public._origen_vehiculos_con_valor(uuid, text) from public, anon, authenticated;

create or replace function public._origen_campos_renumerar(p_origen uuid)
returns void language sql security definer set search_path = '' as $$
  update public.origenes_campos c set orden = n.orden_nuevo
  from public._campos_renumerar((
    select jsonb_agg(jsonb_build_object('id', x.id, 'clave', x.clave, 'orden', x.orden))
    from public.origenes_campos x where x.origen_id = p_origen)) n
  where c.id = n.campo_id and c.orden <> n.orden_nuevo;
$$;
revoke all on function public._origen_campos_renumerar(uuid) from public, anon, authenticated;

create or replace function public.origen_campo_impacto(p_campo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.origenes_campos;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  return public._campo_impacto(
    array(select v.atributos -> c.clave from public.vehiculos v where v.origen_id = c.origen_id), c.tipo);
end;
$$;
revoke all on function public.origen_campo_impacto(uuid) from public, anon;
grant execute on function public.origen_campo_impacto(uuid) to authenticated;

create or replace function public.origen_campo_mover(p_campo uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare c public.origenes_campos; v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  -- El orden es del origen entero: se bloquea el origen para que dos reordenamientos vayan en fila.
  perform 1 from public.origenes o where o.id = c.origen_id for update;
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_campo then raise exception 'Un campo no puede ir después de sí mismo.'; end if;
    if not exists (select 1 from public.origenes_campos x where x.id = p_despues_de and x.origen_id = c.origen_id) then
      raise exception 'Ese campo ya no está en este origen. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.origenes_campos x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden))
    from public.origenes_campos y where y.origen_id = c.origen_id), p_campo, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  select x.actualizado_en into v_nueva from public.origenes_campos x where x.id = p_campo;
  return v_nueva;
end;
$$;
revoke all on function public.origen_campo_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.origen_campo_mover(uuid, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Vehículos: sus atributos, sobre el motor
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_validar_atributos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._atributos_validar(
    new.atributos,
    (select coalesce(jsonb_agg(jsonb_build_object('clave', c.clave, 'etiqueta', c.etiqueta, 'tipo', c.tipo, 'requerido', c.requerido)), '[]'::jsonb)
     from public.origenes_campos c where c.origen_id = new.origen_id and c.activo),
    'Los atributos de un vehículo tienen que ser un objeto.');
  return new;
end;
$$;

-- Lo único que cambia de `_vehiculo_aplicar` es el bloque de atributos.
create or replace function public._vehiculo_aplicar(v public.vehiculos, p_datos jsonb)
returns public.vehiculos language plpgsql stable security definer set search_path = '' as $$
declare
  v_permitidas constant text[] := array['titulo', 'marca', 'modelo', 'anio', 'vin', 'lote', 'plataforma', 'url_origen', 'precio',
    'precio_negociable', 'acepta_permuta', 'placado', 'kilometraje', 'categoria_id', 'atributos'];
  k text; v_categoria uuid;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos del vehículo tienen que ser un objeto.' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_datos) loop
    if not (k = any (v_permitidas)) then
      raise exception 'El dato «%» no se escribe desde la ficha del vehículo.', k using errcode = '22023';
    end if;
  end loop;

  if p_datos ? 'titulo' then v.titulo := public._vehiculo_texto(p_datos, 'titulo', 'El título', 160); end if;
  if v.titulo is null then
    raise exception 'Falta el título.' using errcode = '23502', hint = 'titulo';
  end if;
  if p_datos ? 'marca' then v.marca := public._vehiculo_texto(p_datos, 'marca', 'La marca', 80); end if;
  if p_datos ? 'modelo' then v.modelo := public._vehiculo_texto(p_datos, 'modelo', 'El modelo', 80); end if;
  if p_datos ? 'lote' then v.lote := public._vehiculo_texto(p_datos, 'lote', 'El lote', 40); end if;
  if p_datos ? 'plataforma' then v.plataforma := lower(public._vehiculo_texto(p_datos, 'plataforma', 'La plataforma', 40)); end if;
  if p_datos ? 'url_origen' then
    v.url_origen := public._vehiculo_texto(p_datos, 'url_origen', 'El enlace', 500);
    if v.url_origen is not null and v.url_origen !~* '^https?://[^[:space:]]+$' then
      raise exception 'El enlace tiene que empezar con http:// o https://.' using errcode = '22023', hint = 'url_origen';
    end if;
  end if;
  if p_datos ? 'vin' then
    v.vin := upper(public._vehiculo_texto(p_datos, 'vin', 'El VIN', 17));
    if v.vin is not null and v.vin !~ '^[A-HJ-NPR-Z0-9]{11,17}$' then
      raise exception 'El VIN lleva entre 11 y 17 letras y números, sin I, O ni Q.' using errcode = '22023', hint = 'vin';
    end if;
  end if;
  if p_datos ? 'anio' then v.anio := public._vehiculo_numero(p_datos, 'anio', 'El año', 1900, 2100, true)::smallint; end if;
  if p_datos ? 'kilometraje' then v.kilometraje := public._vehiculo_numero(p_datos, 'kilometraje', 'El kilometraje', 0, 2000000000, true)::int; end if;
  if p_datos ? 'precio' then v.precio := round(public._vehiculo_numero(p_datos, 'precio', 'El precio', 0, 999999999999, false), 2); end if;
  if p_datos ? 'precio_negociable' then v.precio_negociable := public._vehiculo_si_no(p_datos, 'precio_negociable', 'El precio negociable'); end if;
  if p_datos ? 'acepta_permuta' then v.acepta_permuta := public._vehiculo_si_no(p_datos, 'acepta_permuta', 'Acepta permuta'); end if;
  if p_datos ? 'placado' then v.placado := public._vehiculo_si_no(p_datos, 'placado', 'Placado'); end if;

  if p_datos ? 'categoria_id' then
    if p_datos -> 'categoria_id' = 'null'::jsonb then
      v.categoria_id := null;
    else
      begin
        v_categoria := (p_datos ->> 'categoria_id')::uuid;
      exception when others then
        raise exception 'Esa categoría no existe.' using errcode = '22023', hint = 'categoria_id';
      end;
      if not exists (select 1 from public.categorias k2 where k2.id = v_categoria and k2.origen_id = v.origen_id) then
        raise exception 'Esa categoría no es de este origen.' using errcode = '22023', hint = 'categoria_id';
      end if;
      v.categoria_id := v_categoria;
    end if;
  end if;

  -- Atributos: la fusión y sus mensajes son del motor (`_atributos_fusionar`).
  if p_datos ? 'atributos' then
    v.atributos := public._atributos_fusionar(
      v.atributos, p_datos -> 'atributos',
      array(select c.clave from public.origenes_campos c where c.origen_id = v.origen_id and c.activo),
      'Los atributos de un vehículo tienen que ser un objeto.',
      'El campo «%s» no es de este origen o está desactivado.');
  end if;
  return v;
end;
$$;
revoke all on function public._vehiculo_aplicar(public.vehiculos, jsonb) from public, anon, authenticated;
