-- Fotos de un vehículo: la única puerta de escritura, con versión propia. Escrito a mano.
--
-- Hasta acá `vehiculos_imagenes` se escribía con INSERT, UPDATE y DELETE directos bajo RLS: sin
-- versión (reordenar no podía dar `PT409`), con un tope de 24 que contaba sin candado, y sin nada
-- que impidiera la misma foto dos veces. Ahora la tabla es de sólo lectura para la app:
--   vehiculo_fotos_agregar() — alta; idempotente por hash; acepta hasta llenar 24
--   vehiculo_foto_mover()    — orden relativo («después de»), como origen_campo_mover()
--   vehiculo_foto_portada()  — una sola portada
--   vehiculo_foto_eliminar() — borra la fila y encola sus dos objetos
-- Las tres de edición mandan la versión de las fotos (`vehiculos_imagenes_version`), que es otra
-- que la de la ficha. Storage: nadie borra objetos de `vehiculos` desde la app, `anon` deja de
-- poder listar el bucket, y la carpeta que no es un uuid se niega en vez de dar error.

-- ---------------------------------------------------------------------------
-- Lectura: se ven las fotos de los vehículos que se ven
-- ---------------------------------------------------------------------------
-- La subconsulta corre con la RLS de `vehiculos` de quien pregunta (policy de InitPlan y papelera
-- incluidas): una sola regla, en un solo lugar.
drop policy "vehiculos_imagenes: leer" on public.vehiculos_imagenes;
drop policy "vehiculos_imagenes: crear" on public.vehiculos_imagenes;
drop policy "vehiculos_imagenes: editar" on public.vehiculos_imagenes;
drop policy "vehiculos_imagenes: borrar" on public.vehiculos_imagenes;
revoke insert, update, delete on table public.vehiculos_imagenes from authenticated;
create policy "vehiculos_imagenes: leer" on public.vehiculos_imagenes for select to authenticated
  using (exists (select 1 from public.vehiculos v where v.id = vehiculos_imagenes.vehiculo_id));

-- `vehiculos_imagenes_version` tiene su policy de lectura, con la misma regla, en `…000200_rls_y_grants.sql`.
-- La versión la pone la RPC con la hora del reloj, no la de inicio de la transacción: tiene que
-- cambiar en cada operación, también cuando dos caen en la misma transacción.
drop trigger if exists trg_actualizado_en on public.vehiculos_imagenes_version;

create index if not exists vehiculos_imagenes_ruta_idx on public.vehiculos_imagenes (ruta);
create index if not exists vehiculos_imagenes_miniatura_idx on public.vehiculos_imagenes (ruta_miniatura);

-- ---------------------------------------------------------------------------
-- Refcount: una foto son dos objetos
-- ---------------------------------------------------------------------------
create or replace function public.storage_refcount(p_bucket text, p_ruta text)
returns int language sql stable security definer set search_path = '' as $$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$$;

-- ---------------------------------------------------------------------------
-- Invariantes de toda fila de foto, la escriba quien la escriba
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_imagenes_tope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = new.vehiculo_id) >= 24 then
    raise exception 'Un vehículo admite hasta 24 fotos.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Una fila sólo nace apuntando a dos objetos de la carpeta de su vehículo, que existen y que la
-- limpieza no está por borrar. `storage_gc_rescatar()` toma el candado del objeto: ver
-- `…000400_storage_gc.sql`.
create or replace function public.vehiculo_imagen_integridad()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_patron text := '^' || new.vehiculo_id::text || '/[0-9a-f]{64}\.(webp|jpg)$';
begin
  if new.ruta !~ v_patron or new.ruta_miniatura !~ v_patron then
    raise exception 'La foto no está en la carpeta de este vehículo.' using errcode = '22023';
  end if;
  perform public.storage_gc_rescatar('vehiculos', new.ruta);
  perform public.storage_gc_rescatar('vehiculos', new.ruta_miniatura);
  if (select count(*) from storage.objects o where o.bucket_id = 'vehiculos' and o.name in (new.ruta, new.ruta_miniatura))
     < (case when new.ruta = new.ruta_miniatura then 1 else 2 end) then
    raise exception 'La foto no terminó de subir. Vuelve a intentarlo.';
  end if;
  return new;
end;
$$;
create trigger trg_vehiculo_imagen_integridad before insert on public.vehiculos_imagenes
  for each row execute function public.vehiculo_imagen_integridad();

-- ---------------------------------------------------------------------------
-- Abrir y cerrar una operación sobre las fotos de un vehículo
-- ---------------------------------------------------------------------------
-- Misma regla de permiso que `vehiculo_guardar()`. Devuelve la versión vigente con su fila
-- bloqueada: desde acá, las operaciones sobre las fotos de este vehículo van de a una.
create or replace function public._fotos_abrir(p_vehiculo uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_alcance public.alcance_permiso; v_version timestamptz;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for key share;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  v_alcance := public.alcance_de('vehiculos.editar', v.origen_id);
  if v_alcance is null
     or (v_alcance = 'propios' and not (v.creado_por = (select auth.uid()) or v.lead_id in (select public.mis_leads()))) then
    raise exception 'No tienes permiso para cambiar las fotos de este vehículo.' using errcode = '42501';
  end if;
  insert into public.vehiculos_imagenes_version (vehiculo_id, actualizado_en)
  values (p_vehiculo, clock_timestamp()) on conflict (vehiculo_id) do nothing;
  select x.actualizado_en into v_version from public.vehiculos_imagenes_version x where x.vehiculo_id = p_vehiculo for update;
  return v_version;
end;
$$;
revoke all on function public._fotos_abrir(uuid) from public, anon, authenticated;

-- Deja el orden corrido (1..n), una portada si hay fotos, la versión nueva y el registro de quién
-- lo hizo (de ahí saca `_conflicto_de_edicion` el nombre).
create or replace function public._fotos_cerrar(p_vehiculo uuid, p_accion text, p_detalle jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_version timestamptz;
begin
  update public.vehiculos_imagenes i set orden = n.posicion
  from (select x.id, row_number() over (order by x.orden, x.creado_en, x.id) as posicion
        from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo) n
  where i.id = n.id and i.orden <> n.posicion;
  if not exists (select 1 from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo and x.es_portada) then
    update public.vehiculos_imagenes i set es_portada = true
    where i.id = (select x.id from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo order by x.orden, x.id limit 1);
  end if;
  update public.vehiculos_imagenes_version x
  set actualizado_en = greatest(clock_timestamp(), x.actualizado_en + interval '1 microsecond')
  where x.vehiculo_id = p_vehiculo returning x.actualizado_en into v_version;
  perform public.registrar_actividad(p_accion, 'vehiculos_imagenes_version', p_vehiculo::text, null, null, p_detalle);
  return v_version;
end;
$$;
revoke all on function public._fotos_cerrar(uuid, text, jsonb) from public, anon, authenticated;

-- La versión que manda quien edita: obligatoria, y si no es la vigente dice quién cambió las fotos.
create or replace function public._fotos_exigir_version(p_vehiculo uuid, p_actual timestamptz, p_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_actual is distinct from p_esperado then
    perform public._conflicto_de_edicion('vehiculos_imagenes_version', p_vehiculo, p_actual, 'las fotos de este vehículo');
  end if;
end;
$$;
revoke all on function public._fotos_exigir_version(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Agregar
-- ---------------------------------------------------------------------------
-- `p_fotos`: [{hash, ruta, ruta_miniatura, ancho, alto, bytes, orden?, es_portada?}], ya subidas.
-- No lleva versión: sumar fotos no pisa lo de nadie. Reintentar es inocuo (el hash que ya está
-- vuelve en `repetidas`). Con más fotos de las que entran acepta, en orden, las que entran y
-- devuelve el resto en `sin_lugar`. `orden` y `es_portada` son para «Deshacer» un eliminar: la
-- foto vuelve a su lugar.
create or replace function public.vehiculo_fotos_agregar(p_vehiculo uuid, p_fotos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  f jsonb; v_version timestamptz; v_hay int; v_hash text; v_orden int; v_id uuid;
  v_agregadas text[] := '{}'; v_repetidas text[] := '{}'; v_sin_lugar text[] := '{}';
begin
  v_version := public._fotos_abrir(p_vehiculo);
  if jsonb_typeof(p_fotos) is distinct from 'array' or jsonb_array_length(p_fotos) = 0 then
    raise exception 'No llegó ninguna foto.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_fotos) > 24 then
    raise exception 'Un vehículo admite hasta 24 fotos.' using errcode = '23514';
  end if;
  select count(*) into v_hay from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo;

  for f in select * from jsonb_array_elements(p_fotos) loop
    v_hash := f ->> 'hash';
    if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'Una de las fotos llegó incompleta. Vuelve a elegirla.' using errcode = '22023';
    end if;
    if v_hash = any (v_agregadas) or exists (select 1 from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo and x.hash = v_hash) then
      v_repetidas := v_repetidas || v_hash;
      continue;
    end if;
    if v_hay >= 24 then
      v_sin_lugar := v_sin_lugar || v_hash;
      continue;
    end if;
    -- Al final, salvo que traiga su lugar: ahí se le hace sitio.
    v_orden := least(greatest(coalesce((f ->> 'orden')::int, v_hay + 1), 1), v_hay + 1);
    update public.vehiculos_imagenes x set orden = x.orden + 1 where x.vehiculo_id = p_vehiculo and x.orden >= v_orden;
    insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden)
    values (p_vehiculo, v_hash, f ->> 'ruta', f ->> 'ruta_miniatura', (f ->> 'ancho')::int, (f ->> 'alto')::int, (f ->> 'bytes')::int, v_orden)
    returning id into v_id;
    if coalesce((f ->> 'es_portada')::boolean, false) then
      update public.vehiculos_imagenes x set es_portada = false where x.vehiculo_id = p_vehiculo and x.es_portada;
      update public.vehiculos_imagenes x set es_portada = true where x.id = v_id;
    end if;
    v_hay := v_hay + 1;
    v_agregadas := v_agregadas || v_hash;
  end loop;

  if cardinality(v_agregadas) > 0 then
    v_version := public._fotos_cerrar(p_vehiculo, 'vehiculo.fotos_agregadas', jsonb_build_object('cantidad', cardinality(v_agregadas)));
  end if;
  return jsonb_build_object('actualizado_en', v_version, 'agregadas', to_jsonb(v_agregadas),
    'repetidas', to_jsonb(v_repetidas), 'sin_lugar', to_jsonb(v_sin_lugar));
end;
$$;
revoke all on function public.vehiculo_fotos_agregar(uuid, jsonb) from public, anon;
grant execute on function public.vehiculo_fotos_agregar(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Mover: «después de X» (nulo = primera), no una posición
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_foto_mover(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_foto uuid, p_despues_de uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_version timestamptz; v_orden int; v_vecina int; v_destino int;
begin
  v_version := public._fotos_abrir(p_vehiculo);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  select x.orden into v_orden from public.vehiculos_imagenes x where x.id = p_foto and x.vehiculo_id = p_vehiculo;
  if not found then
    raise exception 'Esa foto ya no está. Recarga para ver cómo quedaron.' using errcode = 'PT409';
  end if;
  if p_despues_de is null then
    v_destino := 1;
  else
    select x.orden into v_vecina from public.vehiculos_imagenes x where x.id = p_despues_de and x.vehiculo_id = p_vehiculo;
    if not found then
      raise exception 'La foto de al lado ya no está. Recarga para ver cómo quedaron.' using errcode = 'PT409';
    end if;
    -- Al sacarla de su lugar, las de atrás se corren uno.
    v_destino := case when v_vecina < v_orden then v_vecina + 1 else v_vecina end;
  end if;
  -- Ya está donde se la quería: un reintento no choca consigo mismo.
  if v_destino = v_orden then
    return jsonb_build_object('actualizado_en', v_version);
  end if;
  perform public._fotos_exigir_version(p_vehiculo, v_version, p_actualizado_en_esperado);

  if v_destino < v_orden then
    update public.vehiculos_imagenes x set orden = x.orden + 1 where x.vehiculo_id = p_vehiculo and x.orden >= v_destino and x.orden < v_orden;
  else
    update public.vehiculos_imagenes x set orden = x.orden - 1 where x.vehiculo_id = p_vehiculo and x.orden > v_orden and x.orden <= v_destino;
  end if;
  update public.vehiculos_imagenes x set orden = v_destino where x.id = p_foto;
  return jsonb_build_object('actualizado_en', public._fotos_cerrar(p_vehiculo, 'vehiculo.foto_movida', jsonb_build_object('foto', p_foto)));
end;
$$;
revoke all on function public.vehiculo_foto_mover(uuid, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.vehiculo_foto_mover(uuid, timestamptz, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Portada
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_foto_portada(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_foto uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_version timestamptz; v_es boolean;
begin
  v_version := public._fotos_abrir(p_vehiculo);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  select x.es_portada into v_es from public.vehiculos_imagenes x where x.id = p_foto and x.vehiculo_id = p_vehiculo;
  if not found then
    raise exception 'Esa foto ya no está. Recarga para ver cómo quedaron.' using errcode = 'PT409';
  end if;
  if v_es then
    return jsonb_build_object('actualizado_en', v_version);
  end if;
  perform public._fotos_exigir_version(p_vehiculo, v_version, p_actualizado_en_esperado);
  update public.vehiculos_imagenes x set es_portada = false where x.vehiculo_id = p_vehiculo and x.es_portada;
  update public.vehiculos_imagenes x set es_portada = true where x.id = p_foto;
  return jsonb_build_object('actualizado_en', public._fotos_cerrar(p_vehiculo, 'vehiculo.foto_portada', jsonb_build_object('foto', p_foto)));
end;
$$;
revoke all on function public.vehiculo_foto_portada(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.vehiculo_foto_portada(uuid, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Eliminar
-- ---------------------------------------------------------------------------
-- Borra la fila y deja sus dos objetos en la cola: la limpieza los borra recién pasadas 24 h y
-- si nadie volvió a referenciarlos. Devuelve la foto tal como estaba, que es lo que «Deshacer»
-- le pasa a `vehiculo_fotos_agregar()`.
create or replace function public.vehiculo_foto_eliminar(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_foto uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_version timestamptz; f public.vehiculos_imagenes;
begin
  v_version := public._fotos_abrir(p_vehiculo);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  select * into f from public.vehiculos_imagenes x where x.id = p_foto and x.vehiculo_id = p_vehiculo;
  -- Ya no está: un reintento tras perder la respuesta no es un error.
  if not found then
    return jsonb_build_object('actualizado_en', v_version, 'foto', null);
  end if;
  perform public._fotos_exigir_version(p_vehiculo, v_version, p_actualizado_en_esperado);
  delete from public.vehiculos_imagenes x where x.id = f.id;
  insert into public.cola_gc_storage as c (bucket, ruta)
  select 'vehiculos', r from unnest(array[f.ruta, f.ruta_miniatura]) as r
  on conflict (bucket, ruta) do update set encolado_en = now() where c.reclamado_en is null;
  return jsonb_build_object(
    'actualizado_en', public._fotos_cerrar(p_vehiculo, 'vehiculo.foto_eliminada', jsonb_build_object('foto', f.id, 'hash', f.hash)),
    'foto', jsonb_build_object('hash', f.hash, 'ruta', f.ruta, 'ruta_miniatura', f.ruta_miniatura,
      'ancho', f.ancho, 'alto', f.alto, 'bytes', f.bytes, 'orden', f.orden, 'es_portada', f.es_portada));
end;
$$;
revoke all on function public.vehiculo_foto_eliminar(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.vehiculo_foto_eliminar(uuid, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- ¿Cuáles de estos vehículos puedo editar?
-- ---------------------------------------------------------------------------
-- La interfaz copiaba la regla y le faltaba una parte (con alcance «propios», lo vinculado a un
-- lead de la cartera). Ahora pregunta, acotado a los que tiene en pantalla.
create or replace function public.vehiculos_editables(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select x.id from unnest(p_ids[1:200]) as x (id) where public.puede_vehiculo(x.id, 'vehiculos.editar');
$$;
revoke all on function public.vehiculos_editables(uuid[]) from public, anon;
grant execute on function public.vehiculos_editables(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: el bucket `vehiculos`
-- ---------------------------------------------------------------------------
-- `storage.objects` no es nuestra: sólo se le crean y quitan policies.
-- El vehículo es la primera carpeta de la ruta. Lo que no es un uuid se niega (el cast directo
-- levantaba 22P02).
create or replace function public.puede_objeto_de_vehiculo(p_nombre text, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when split_part(p_nombre, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.puede_vehiculo(split_part(p_nombre, '/', 1)::uuid, p_clave)
    else false
  end;
$$;
revoke all on function public.puede_objeto_de_vehiculo(text, text) from public, anon;
grant execute on function public.puede_objeto_de_vehiculo(text, text) to authenticated;

-- Leer una foto por su URL pública no pasa por estas policies (el bucket es público). Lo que
-- esta policy daba de más era LISTAR: cualquiera, sin sesión, enumeraba los vehículos y sus fotos.
drop policy "marca: leer" on storage.objects;
create policy "marca: leer" on storage.objects for select to anon, authenticated
  using (bucket_id in ('marca', 'avatares', 'web', 'repuestos'));
create policy "vehiculos: listar" on storage.objects for select to authenticated
  using (bucket_id = 'vehiculos' and (select public.puede_objeto_de_vehiculo(name, 'vehiculos.ver')));

drop policy "vehiculos: subir" on storage.objects;
create policy "vehiculos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehiculos' and (select public.puede_objeto_de_vehiculo(name, 'vehiculos.editar')));
-- Nadie borra objetos de este bucket desde la app: eliminar una foto los encola, y los borra la
-- limpieza (`storage_gc_reclamar`). Tampoco hay policy de UPDATE: un objeto no cambia de contenido.
drop policy "vehiculos: borrar" on storage.objects;
