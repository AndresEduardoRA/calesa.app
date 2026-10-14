-- apibara_consultas: la respuesta de apibara la origina la edge function, no el navegador.
-- Escrito a mano.
--
-- Qué había: `vehiculo_crear(…, p_apibara jsonb)` y `vehiculo_subasta_refrescar(…, p_apibara, …)`
-- guardaban el bruto que mandaba el navegador, y de ese bruto la base deriva `subasta_en` y
-- `estado_subasta`. Quien crea o edita podía mandar uno hecho a mano: la limpieza automática (que
-- decide por esas columnas) no puede confiar en él.
--
-- Qué hay desde acá:
--   apibara_consultas            — cada respuesta que trajo la edge function, de quién y de qué
--                                  origen; sólo la escribe `apibara_consulta_guardar()` (service_role)
--   vehiculo_crear(…, p_consulta) y vehiculo_subasta_refrescar(…, p_consulta, …) — reciben la
--                                  referencia y copian el bruto de ahí
--   apibara_consulta_leer()      — el bruto de una consulta propia, para que el servidor compare
--                                  al refrescar (`fusionarRefresco`)
--   vehiculos.importado_apibara  — nació de una consulta; no cambia nunca
--   apibara_contexto()           — suma `usuario`: la edge function guarda a nombre de quien llama
--   apibara_consultas_purgar()   — y su job diario
--
-- Se aplica sobre una base viva: todo es idempotente y la estructura también vive en
-- `supabase/schemas/06_vehiculos/`.

-- ---------------------------------------------------------------------------
-- Estructura (espejo de schemas/, para la base que ya existe)
-- ---------------------------------------------------------------------------
create table if not exists public.apibara_consultas (
  id          uuid primary key default gen_random_uuid(),
  origen_id   uuid not null references public.origenes (id) on delete cascade,
  creado_por  uuid not null references public.perfiles (id) on delete cascade,
  raw         jsonb not null,
  creado_en   timestamptz not null default now(),
  vehiculo_id uuid references public.vehiculos (id) on delete set null
);
create index if not exists apibara_consultas_origen_idx on public.apibara_consultas (origen_id);
create index if not exists apibara_consultas_creado_por_idx on public.apibara_consultas (creado_por);
create index if not exists apibara_consultas_vehiculo_idx on public.apibara_consultas (vehiculo_id) where vehiculo_id is not null;
create index if not exists apibara_consultas_creado_en_idx on public.apibara_consultas (creado_en);

alter table public.apibara_consultas enable row level security;
revoke all on table public.apibara_consultas from anon, authenticated;
grant select, insert, update, delete on table public.apibara_consultas to service_role;

alter table public.vehiculos add column if not exists importado_apibara boolean not null default false;

-- Lo que ya estaba: importado es lo que tiene bruto. No se distingue un vehículo cargado a mano y
-- refrescado después (la base no lo sabía): cuenta como importado. Sin mover la versión de nadie
-- ni dejar una fila de auditoría por cada vehículo.
do $$
begin
  if exists (select 1 from public.vehiculos where apibara_raw is not null and not importado_apibara) then
    alter table public.vehiculos disable trigger trg_actualizado_en;
    alter table public.vehiculos disable trigger trg_auditar;
    update public.vehiculos set importado_apibara = true where apibara_raw is not null and not importado_apibara;
    alter table public.vehiculos enable trigger trg_actualizado_en;
    alter table public.vehiculos enable trigger trg_auditar;
  end if;
end $$;

comment on column public.vehiculos.importado_apibara is 'Nació de una consulta a apibara (vehiculo_crear con p_consulta). No cambia nunca: la limpieza automática sólo mira a estos.';
comment on column public.vehiculos.apibara_raw is 'La última respuesta de apibara, entera. La copia la base desde apibara_consultas: nunca llega del navegador.';
comment on table public.apibara_consultas is 'Cada respuesta que trajo la edge function apibara, a nombre de quien consultó. vehiculo_crear() y vehiculo_subasta_refrescar() la reciben por id y copian el bruto: así sólo la función origina lo que la base deriva (fecha y estado de la subasta). Vale 24 h y la usa un solo vehículo. Sólo service_role.';

-- ---------------------------------------------------------------------------
-- Quién llama
-- ---------------------------------------------------------------------------
create or replace function public.apibara_contexto(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_int public.integraciones; v_origen public.origenes; v_plat text[]; v_config text[]; v_uso boolean;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', false);
  end if;
  v_uso := public.tiene_permiso('empresa.ajustes.gestionar');
  select * into v_int from public.integraciones i where i.clave = 'apibara';
  select * into v_origen from public.origenes o where o.id = p_origen;
  if p_origen is null or not found or v_origen.tipo <> 'subasta' then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', v_uso);
  end if;
  select coalesce(array_agg(x), '{}') into v_config from jsonb_array_elements_text(coalesce(v_int.config -> 'plataformas', '[]'::jsonb)) x;
  v_plat := case when cardinality(v_origen.apibara_plataformas) = 0 then v_config
                 else (select coalesce(array_agg(p), '{}') from unnest(v_origen.apibara_plataformas) p where p = any (v_config)) end;
  return jsonb_build_object(
    'aplica', true,
    'usuario', (select auth.uid()),
    'activa', coalesce(v_int.activa, false) and v_int.secreto_guardado_en is not null,
    'endpoint', v_int.config ->> 'endpoint',
    'plataformas', to_jsonb(v_plat),
    'puede_crear', public.tiene_permiso('vehiculos.crear', p_origen),
    'puede_editar', public.tiene_permiso('vehiculos.editar', p_origen),
    'puede_ver_uso', v_uso);
end;
$$;
revoke all on function public.apibara_contexto(uuid) from public, anon;
grant execute on function public.apibara_contexto(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Guardar y tomar una consulta
-- ---------------------------------------------------------------------------
-- La llama la edge function con la service key, después de que `apibara_contexto()` dijo que esa
-- persona puede crear o editar en ese origen. Devuelve el id que viaja al navegador.
create or replace function public.apibara_consulta_guardar(p_usuario uuid, p_origen uuid, p_raw jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_usuario is null or not exists (select 1 from public.perfiles p where p.id = p_usuario) then
    raise exception 'Falta quién consultó.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta') then
    raise exception 'Sólo un origen de subasta consulta apibara.' using errcode = '22023';
  end if;
  perform public._vehiculo_apibara_valido(p_raw);
  insert into public.apibara_consultas (origen_id, creado_por, raw) values (p_origen, p_usuario, p_raw)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.apibara_consulta_guardar(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apibara_consulta_guardar(uuid, uuid, jsonb) to service_role;

-- La consulta que trae quien llama, con la fila tomada: suya, de ese origen, de las últimas 24 h y
-- sin usar por otro vehículo (el mismo vehículo sí: reintentar un alta no choca consigo mismo).
create or replace function public._apibara_consulta_tomar(p_consulta uuid, p_origen uuid, p_vehiculo uuid)
returns public.apibara_consultas language plpgsql security definer set search_path = '' as $$
declare c public.apibara_consultas;
begin
  select * into c from public.apibara_consultas x where x.id = p_consulta for update;
  if not found or c.creado_por is distinct from (select auth.uid()) or c.origen_id <> p_origen then
    raise exception 'Esa consulta a la subasta no es de este origen o ya no existe. Vuelve a consultar.' using errcode = '22023';
  end if;
  if c.creado_en < now() - interval '24 hours' then
    raise exception 'La consulta a la subasta venció. Vuelve a consultar.' using errcode = '22023';
  end if;
  if c.vehiculo_id is not null and c.vehiculo_id <> p_vehiculo then
    raise exception 'Esa consulta ya se usó para otro vehículo. Vuelve a consultar.' using errcode = '22023';
  end if;
  return c;
end;
$$;
revoke all on function public._apibara_consulta_tomar(uuid, uuid, uuid) from public, anon, authenticated;

-- El bruto de una consulta propia y vigente: con él el servidor compara el refresco con lo
-- guardado. No marca nada: la que cuenta es la que recibe `vehiculo_subasta_refrescar()`.
create or replace function public.apibara_consulta_leer(p_consulta uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_raw jsonb;
begin
  perform public.assert_activo();
  select c.raw into v_raw from public.apibara_consultas c
  where c.id = p_consulta and c.creado_por = (select auth.uid()) and c.creado_en >= now() - interval '24 hours';
  if not found then
    raise exception 'Esa consulta a la subasta ya no existe. Vuelve a consultar.' using errcode = '22023';
  end if;
  return v_raw;
end;
$$;
revoke all on function public.apibara_consulta_leer(uuid) from public, anon;
grant execute on function public.apibara_consulta_leer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Alta con la consulta
-- ---------------------------------------------------------------------------
-- Cambia la firma: sin el `drop` quedarían dos sobrecargas y la llamada por nombre (PostgREST)
-- sería ambigua.
drop function if exists public.vehiculo_crear(uuid, uuid, jsonb, jsonb);

create or replace function public.vehiculo_crear(p_id uuid, p_origen uuid, p_datos jsonb, p_consulta uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_origen public.origenes; v_fase uuid; v_flujo uuid; v_sub jsonb; c public.apibara_consultas;
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
  if p_consulta is not null then
    if v_origen.tipo <> 'subasta' then
      raise exception 'Sólo un origen de subasta guarda datos de apibara.' using errcode = '22023';
    end if;
    c := public._apibara_consulta_tomar(p_consulta, p_origen, p_id);
    v_sub := public._vehiculo_subasta_desde(c.raw);
  end if;

  v.id := p_id;
  v.origen_id := p_origen;
  v.atributos := '{}'::jsonb;
  v := public._vehiculo_aplicar(v, p_datos);
  perform public._vehiculo_sin_repetidos(v);

  begin
    insert into public.vehiculos (id, origen_id, categoria_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen,
      precio, precio_negociable, acepta_permuta, placado, kilometraje, atributos, creado_por,
      subasta_en, subasta_fin_en, estado_subasta, apibara_sync_en, apibara_raw, importado_apibara)
    values (v.id, v.origen_id, v.categoria_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen,
      v.precio, v.precio_negociable, v.acepta_permuta, v.placado, v.kilometraje, v.atributos, (select auth.uid()),
      (v_sub ->> 'subasta_en')::timestamptz, (v_sub ->> 'subasta_fin_en')::timestamptz,
      (v_sub ->> 'estado_subasta')::public.estado_subasta,
      case when p_consulta is not null then now() end, c.raw, p_consulta is not null)
    returning * into v;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  if p_consulta is not null then
    update public.apibara_consultas x set vehiculo_id = v.id where x.id = p_consulta;
  end if;

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
revoke all on function public.vehiculo_crear(uuid, uuid, jsonb, uuid) from public, anon;
grant execute on function public.vehiculo_crear(uuid, uuid, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Refrescar con la consulta
-- ---------------------------------------------------------------------------
drop function if exists public.vehiculo_subasta_refrescar(uuid, timestamptz, jsonb, jsonb);

create or replace function public.vehiculo_subasta_refrescar(
  p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_consulta uuid, p_datos jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; n public.vehiculos; v_sub jsonb; c public.apibara_consultas;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if not exists (select 1 from public.origenes o where o.id = v.origen_id and o.tipo = 'subasta') then
    raise exception 'Sólo un vehículo de subasta se refresca desde apibara.' using errcode = '22023';
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  if p_consulta is null then
    raise exception 'Falta la consulta a la subasta. Vuelve a consultar.' using errcode = '22023';
  end if;
  c := public._apibara_consulta_tomar(p_consulta, v.origen_id, v.id);
  v_sub := public._vehiculo_subasta_desde(c.raw);

  n := public._vehiculo_aplicar(v, coalesce(p_datos, '{}'::jsonb));
  perform public._vehiculo_sin_repetidos(n);
  begin
    update public.vehiculos x set
      categoria_id = n.categoria_id, titulo = n.titulo, marca = n.marca, modelo = n.modelo, anio = n.anio, vin = n.vin,
      lote = n.lote, plataforma = n.plataforma, url_origen = n.url_origen, precio = n.precio,
      precio_negociable = n.precio_negociable, acepta_permuta = n.acepta_permuta, placado = n.placado,
      kilometraje = n.kilometraje, atributos = n.atributos,
      subasta_en = (v_sub ->> 'subasta_en')::timestamptz, subasta_fin_en = (v_sub ->> 'subasta_fin_en')::timestamptz,
      estado_subasta = (v_sub ->> 'estado_subasta')::public.estado_subasta,
      apibara_sync_en = now(), apibara_raw = c.raw
    where x.id = v.id
    returning * into n;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  update public.apibara_consultas x set vehiculo_id = v.id where x.id = p_consulta;
  return jsonb_build_object('actualizado_en', n.actualizado_en, 'subasta_en', n.subasta_en,
    'estado_subasta', n.estado_subasta, 'apibara_sync_en', n.apibara_sync_en);
end;
$$;
revoke all on function public.vehiculo_subasta_refrescar(uuid, timestamptz, uuid, jsonb) from public, anon;
grant execute on function public.vehiculo_subasta_refrescar(uuid, timestamptz, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Las consultas viejas se borran solas
-- ---------------------------------------------------------------------------
-- Una consulta vale 24 h; se conserva un día más por si alguien pregunta qué trajo.
create or replace function public.apibara_consultas_purgar()
returns int language sql security definer set search_path = '' as $$
  with borradas as (delete from public.apibara_consultas c where c.creado_en < now() - interval '48 hours' returning 1)
  select count(*)::int from borradas;
$$;
revoke all on function public.apibara_consultas_purgar() from public, anon, authenticated;
grant execute on function public.apibara_consultas_purgar() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise exception 'pg_cron no está disponible: las consultas a apibara no se borrarían nunca.';
  end if;
  perform cron.schedule('apibara-consultas-purgar', '40 4 * * *', 'select public.apibara_consultas_purgar()');
end $$;
