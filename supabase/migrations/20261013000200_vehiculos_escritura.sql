-- Vehículos: la única puerta de escritura de la ficha. Escrito a mano.
--
-- Hasta acá se escribía con INSERT y UPDATE directos bajo RLS. El grant por columna sólo cubría el
-- UPDATE: quien tenía `vehiculos.crear` podía insertar con `fase_id`, `publicado_web` o `precio_web`
-- puestos, saltando `cambiar_fase` y `vehiculo_vitrina`. Y editar no comparaba versión: nada
-- levantaba `PT409`. Ahora la tabla es de sólo lectura para `authenticated` y se escribe por:
--   vehiculo_crear()   — alta, con la entrada a la fase inicial del flujo
--   vehiculo_guardar() — edición, con la versión que tenía en pantalla quien edita (obligatoria)
-- Siguen igual `cambiar_fase`, `vehiculo_vitrina`, `papelera_*` y `cotizacion_marcar_final` (DEFINER).
-- Quedan sin escritor hasta su parte: `lead_id` (el vínculo) y `subasta_*`, `estado_subasta`,
-- `apibara_*` (apibara). Cada una trae su RPC.

-- ---------------------------------------------------------------------------
-- Conflictos de edición que dicen quién y cuándo
-- ---------------------------------------------------------------------------
create or replace function public._hace(p_cuando timestamptz)
returns text language sql stable set search_path = '' as $$
  select case
    when s < 60 then 'hace un momento'
    when s < 3600 then 'hace ' || floor(s / 60)::int || ' min'
    when s < 86400 then 'hace ' || floor(s / 3600)::int || ' h'
    when s < 172800 then 'hace 1 día'
    else 'hace ' || floor(s / 86400)::int || ' días'
  end
  from (select greatest(extract(epoch from (clock_timestamp() - p_cuando)), 0) as s) x;
$$;
revoke all on function public._hace(timestamptz) from public, anon, authenticated;

-- Levanta `PT409` con «<quién> cambió <esto> hace <cuánto>». El quién sale del último registro de
-- `actividad` de la fila (el trigger `auditar` y las RPC lo escriben con su actor): no hace falta
-- una columna `actualizado_por`. Si lo cambió un proceso sin sesión, no se inventa una persona.
create or replace function public._conflicto_de_edicion(p_tabla text, p_registro uuid, p_cuando timestamptz, p_sujeto text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_nombre text; v_hay boolean := false;
begin
  select a.actor_id, true into v_actor, v_hay from public.actividad a
  where a.tabla = p_tabla and a.registro_id = p_registro::text order by a.id desc limit 1;
  if v_actor is not null and v_actor = (select auth.uid()) then
    raise exception 'Cambiaste % % desde otra ventana. Recarga para seguir desde ahí.', p_sujeto, public._hace(p_cuando) using errcode = 'PT409';
  end if;
  if v_actor is not null then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v_actor;
  end if;
  if v_nombre is null and (v_actor is not null or not coalesce(v_hay, false)) then
    v_nombre := 'Otra persona';
  end if;
  if v_nombre is null then
    raise exception '% cambió %.', upper(left(p_sujeto, 1)) || substr(p_sujeto, 2), public._hace(p_cuando) using errcode = 'PT409';
  end if;
  raise exception '% cambió % %.', v_nombre, p_sujeto, public._hace(p_cuando) using errcode = 'PT409';
end;
$$;
revoke all on function public._conflicto_de_edicion(text, uuid, timestamptz, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atributos: los mismos chequeos, dichos con la etiqueta del campo y diciendo cuál es
-- ---------------------------------------------------------------------------
-- El `hint` lleva `atributos.<clave>`: la app pinta el motivo junto al campo.
create or replace function public.vehiculo_validar_atributos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record; v jsonb;
begin
  if jsonb_typeof(new.atributos) <> 'object' then
    raise exception 'Los atributos de un vehículo tienen que ser un objeto.' using errcode = '22023';
  end if;
  for c in select clave, etiqueta, tipo, requerido from public.origenes_campos where origen_id = new.origen_id and activo loop
    v := new.atributos -> c.clave;
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
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lo que se puede escribir de un vehículo, validado antes de convertir
-- ---------------------------------------------------------------------------
create or replace function public._vehiculo_texto(p_datos jsonb, p_clave text, p_nombre text, p_largo int)
returns text language plpgsql immutable set search_path = '' as $$
declare v jsonb := p_datos -> p_clave; t text;
begin
  if v is null or v = 'null'::jsonb then return null; end if;
  if jsonb_typeof(v) <> 'string' then
    raise exception '% tiene que ser un texto.', p_nombre using errcode = '22023', hint = p_clave;
  end if;
  t := nullif(btrim(v #>> '{}'), '');
  if char_length(t) > p_largo then
    raise exception '% admite hasta % caracteres.', p_nombre, p_largo using errcode = '22023', hint = p_clave;
  end if;
  return t;
end;
$$;
revoke all on function public._vehiculo_texto(jsonb, text, text, int) from public, anon, authenticated;

create or replace function public._vehiculo_numero(p_datos jsonb, p_clave text, p_nombre text, p_minimo numeric, p_maximo numeric, p_entero boolean)
returns numeric language plpgsql immutable set search_path = '' as $$
declare v jsonb := p_datos -> p_clave; n numeric;
begin
  if v is null or v = 'null'::jsonb then return null; end if;
  if jsonb_typeof(v) <> 'number' then
    raise exception '% tiene que ser un número.', p_nombre using errcode = '22023', hint = p_clave;
  end if;
  n := (v #>> '{}')::numeric;
  if (p_entero and n <> trunc(n)) or n < p_minimo or n > p_maximo then
    raise exception '% tiene que estar entre % y %.', p_nombre, p_minimo, p_maximo using errcode = '22023', hint = p_clave;
  end if;
  return n;
end;
$$;
revoke all on function public._vehiculo_numero(jsonb, text, text, numeric, numeric, boolean) from public, anon, authenticated;

create or replace function public._vehiculo_si_no(p_datos jsonb, p_clave text, p_nombre text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v jsonb := p_datos -> p_clave;
begin
  if v is null or v = 'null'::jsonb then return null; end if;
  if jsonb_typeof(v) <> 'boolean' then
    raise exception '% tiene que ser sí o no.', p_nombre using errcode = '22023', hint = p_clave;
  end if;
  return (v #>> '{}')::boolean;
end;
$$;
revoke all on function public._vehiculo_si_no(jsonb, text, text) from public, anon, authenticated;

-- Aplica `p_datos` sobre una fila: una clave ausente no se toca, un nulo vacía. Sólo acepta las
-- columnas de la ficha: `fase_id`, `publicado_web`, `lead_id`, `creado_por`… se rechazan acá, que
-- es lo que antes dejaba pasar el INSERT directo. No escribe: devuelve la fila como quedaría.
create or replace function public._vehiculo_aplicar(v public.vehiculos, p_datos jsonb)
returns public.vehiculos language plpgsql stable security definer set search_path = '' as $$
declare
  v_permitidas constant text[] := array['titulo', 'marca', 'modelo', 'anio', 'vin', 'lote', 'plataforma', 'url_origen', 'precio',
    'precio_negociable', 'acepta_permuta', 'placado', 'kilometraje', 'categoria_id', 'atributos'];
  k text; a jsonb; x jsonb; v_categoria uuid;
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

  -- Atributos: se fusionan por clave (lo de un campo desactivado queda como estaba) y nunca se
  -- guarda un nulo: vaciar quita la clave. Un `null` guardado entraría en todo filtro «hasta N».
  if p_datos ? 'atributos' then
    a := p_datos -> 'atributos';
    if jsonb_typeof(a) <> 'object' then
      raise exception 'Los atributos de un vehículo tienen que ser un objeto.' using errcode = '22023';
    end if;
    for k, x in select * from jsonb_each(a) loop
      if not exists (select 1 from public.origenes_campos c where c.origen_id = v.origen_id and c.clave = k and c.activo) then
        raise exception 'El campo «%» no es de este origen o está desactivado.', k using errcode = '22023', hint = 'atributos.' || k;
      end if;
      if x in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then
        v.atributos := v.atributos - k;
      else
        v.atributos := v.atributos || jsonb_build_object(k, x);
      end if;
    end loop;
  end if;
  return v;
end;
$$;
revoke all on function public._vehiculo_aplicar(public.vehiculos, jsonb) from public, anon, authenticated;

-- VIN y lote repetidos, dichos antes de que los frene el índice (que habla en técnico). El VIN es
-- único entre todos los vehículos vivos, no por origen. El lote, por origen y plataforma: acá
-- también con la plataforma vacía, que el índice deja pasar (dos nulos no chocan).
create or replace function public._vehiculo_sin_repetidos(v public.vehiculos)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if v.vin is not null and exists (select 1 from public.vehiculos o where o.vin = v.vin and o.id <> v.id and o.eliminado_en is null) then
    raise exception 'Ya hay un vehículo con el VIN %.', v.vin using errcode = '23505', hint = 'vin';
  end if;
  if v.lote is not null and exists (
    select 1 from public.vehiculos o
    where o.origen_id = v.origen_id and o.lote = v.lote and o.plataforma is not distinct from v.plataforma
      and o.id <> v.id and o.eliminado_en is null) then
    raise exception 'Ya hay un vehículo con el lote % en este origen.', v.lote using errcode = '23505', hint = 'lote';
  end if;
end;
$$;
revoke all on function public._vehiculo_sin_repetidos(public.vehiculos) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La fase con la que nace un vehículo
-- ---------------------------------------------------------------------------
-- Entra a la fase inicial sólo cuando no hay nada que decidir: el flujo tiene exactamente una
-- inicial activa, esa fase no pide nota, no le falta ningún requisito bloqueante y, si limita
-- roles, quien crea tiene uno. Si no, nace sin fase y lo ubica quien mueve. Entrar al flujo al
-- nacer no es «mover»: no pide `flujos.mover` (el asesor que carga un vehículo no lo tiene).
create or replace function public._vehiculo_fase_de_entrada(p_vehiculo uuid, p_origen uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_iniciales uuid[]; f public.fases;
begin
  select array_agg(fa.id) into v_iniciales
  from public.fases fa join public.flujos fl on fl.id = fa.flujo_id
  where fl.origen_id = p_origen and fl.ambito = 'vehiculos' and fa.es_inicial and fa.activa;
  if coalesce(cardinality(v_iniciales), 0) <> 1 then return null; end if;
  select * into f from public.fases where id = v_iniciales[1];
  if f.nota_obligatoria then return null; end if;
  if exists (select 1 from public.evaluar_requisitos(p_vehiculo, null, f.id) e where e.bloqueante and not e.cumplido) then return null; end if;
  if exists (select 1 from public.fases_roles fr where fr.fase_id = f.id)
     and not exists (
       select 1 from public.fases_roles fr join public.usuarios_roles ur on ur.rol_id = fr.rol_id
       where fr.fase_id = f.id and ur.usuario_id = (select auth.uid())) then
    return null;
  end if;
  return f.id;
end;
$$;
revoke all on function public._vehiculo_fase_de_entrada(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Alta
-- ---------------------------------------------------------------------------
-- El `id` lo trae quien llama (lo genera el navegador al abrir el formulario): si la respuesta se
-- pierde y se reintenta, se devuelve el vehículo que esa persona ya creó en vez de duplicarlo.
create or replace function public.vehiculo_crear(p_id uuid, p_origen uuid, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_origen public.origenes; v_fase uuid; v_flujo uuid;
begin
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen del vehículo.' using errcode = '22023';
  end if;
  perform public.assert_permiso('vehiculos.crear', p_origen);

  select * into v from public.vehiculos x where x.id = p_id;
  if found then
    if v.creado_por is distinct from (select auth.uid()) or v.origen_id <> p_origen then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505';
    end if;
    return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
  end if;

  select * into v_origen from public.origenes o where o.id = p_origen;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if not v_origen.activo then
    raise exception 'El origen «%» está desactivado: no recibe registros nuevos.', v_origen.nombre using errcode = '23514';
  end if;

  v.id := p_id;
  v.origen_id := p_origen;
  v.atributos := '{}'::jsonb;
  v := public._vehiculo_aplicar(v, p_datos);
  perform public._vehiculo_sin_repetidos(v);

  begin
    insert into public.vehiculos (id, origen_id, categoria_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen,
      precio, precio_negociable, acepta_permuta, placado, kilometraje, atributos, creado_por)
    values (v.id, v.origen_id, v.categoria_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen,
      v.precio, v.precio_negociable, v.acepta_permuta, v.placado, v.kilometraje, v.atributos, (select auth.uid()))
    returning * into v;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;

  v_fase := public._vehiculo_fase_de_entrada(v.id, p_origen);
  if v_fase is not null then
    select f.flujo_id into v_flujo from public.fases f where f.id = v_fase;
    update public.vehiculos x set fase_id = v_fase, fase_desde = now() where x.id = v.id returning * into v;
    insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, usuario_id)
    values (v_flujo, v.id, null, v_fase, (select auth.uid()));
  end if;
  return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
end;
$$;
revoke all on function public.vehiculo_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.vehiculo_crear(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Edición
-- ---------------------------------------------------------------------------
-- Misma regla que la policy que reemplaza: `vehiculos.editar` del origen, y con alcance «propios»
-- sólo lo que creó o lo vinculado a un lead de su cartera. El origen de un vehículo no cambia.
create or replace function public.vehiculo_guardar(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; n public.vehiculos;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  -- `puede_vehiculo()` y no la condición escrita acá: con `lead_id` nulo, `lead_id in (…)` da nulo,
  -- y un `if` con nulo no levanta (dejaba editar lo ajeno a quien tuviera algún lead en su cartera).
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  n := public._vehiculo_aplicar(v, p_datos);
  -- Guardar lo que ya está guardado no es un conflicto: un reintento tras perder la respuesta no
  -- choca consigo mismo, y quien no cambió nada no pisa a nadie.
  if to_jsonb(n) = to_jsonb(v) then
    return jsonb_build_object('actualizado_en', v.actualizado_en);
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  perform public._vehiculo_sin_repetidos(n);

  begin
    update public.vehiculos x set
      categoria_id = n.categoria_id, titulo = n.titulo, marca = n.marca, modelo = n.modelo, anio = n.anio, vin = n.vin,
      lote = n.lote, plataforma = n.plataforma, url_origen = n.url_origen, precio = n.precio,
      precio_negociable = n.precio_negociable, acepta_permuta = n.acepta_permuta, placado = n.placado,
      kilometraje = n.kilometraje, atributos = n.atributos
    where x.id = v.id
    returning * into n;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  return jsonb_build_object('actualizado_en', n.actualizado_en);
end;
$$;
revoke all on function public.vehiculo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.vehiculo_guardar(uuid, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- La tabla queda de sólo lectura para la app
-- ---------------------------------------------------------------------------
drop policy "vehiculos: crear" on public.vehiculos;
drop policy "vehiculos: editar" on public.vehiculos;
revoke insert, update on table public.vehiculos from authenticated;

comment on table public.vehiculos is 'Inventario. De sólo lectura para la app: se escribe por vehiculo_crear() y vehiculo_guardar(). fase_id lo escriben cambiar_fase() y, sólo al nacer, vehiculo_crear() (entrada a la única fase inicial). publicado_web + fase.publica_web + integración web activa = sale en la vitrina. Papelera: eliminado_en + lote; una policy RESTRICTIVE esconde lo borrado a todos.';
comment on table public.historial_fases is 'Cada cambio de fase, con su nota interna. Lo escriben cambiar_fase() y, con de_fase_id nulo, vehiculo_crear() cuando el vehículo nace en la fase inicial. «Llegó a una fase» se calcula sobre esta tabla.';

-- `permisos.aplicado_en` de `vehiculos.ver|crear|editar` se corrigió en `seed.sql`, que es donde se siembra el catálogo.
