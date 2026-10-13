-- Papelera de vehículos: enviar, listar y restaurar, con sus reglas. Escrito a mano.
--
-- Hasta acá los vehículos iban a la papelera por `papelera_enviar('vehiculos', ids)`, la misma
-- función de leads y cotizaciones: sin versión, todo o nada, con el uuid en los mensajes, sin mirar
-- el vínculo ni la fase y sin despublicar (restaurar devolvía el vehículo publicado). Restaurar no
-- comprobaba el VIN y sólo sabía del lote entero. Ahora los vehículos tienen sus RPC:
--   vehiculos_papelera_enviar()    — uno o hasta 200, cada uno con su versión; resultado parcial
--   vehiculos_papelera_listar()    — los lotes abiertos, con quién, cuándo y cuándo se purgan
--   vehiculos_papelera_restaurar() — el lote entero o algunos de sus vehículos; resultado parcial
-- y las genéricas (`papelera_enviar`, `_listar`, `_restaurar`, `_purgar`) dejan de aceptarlos: quedan
-- para leads y cotizaciones hasta que su fase las reescriba. Purgar llega en `…000900`.
--
-- La versión de un envío en lote es la de cada vehículo, y viaja en el arreglo; la de restaurar es
-- la del lote (`lotes_papelera.actualizado_en`).

-- La versión del lote la sellan las RPC con la hora del reloj: tiene que cambiar en cada operación,
-- también cuando dos caen en la misma transacción (como la de las fotos).
drop trigger if exists trg_actualizado_en on public.lotes_papelera;

create index if not exists vehiculos_lote_papelera_idx on public.vehiculos (lote_papelera_id) where lote_papelera_id is not null;
create index if not exists cotizaciones_lote_papelera_idx on public.cotizaciones (lote_papelera_id) where lote_papelera_id is not null;
create index if not exists leads_lote_papelera_idx on public.leads (lote_papelera_id) where lote_papelera_id is not null;

-- ---------------------------------------------------------------------------
-- Qué no va a la papelera
-- ---------------------------------------------------------------------------
-- Una sola lista para enviar y para purgar: todo lo que entra a la papelera se puede purgar, y
-- la purga (manual o automática) vuelve a preguntar por si algo cambió mientras estaba adentro.
-- La fase sólo se mira al enviar: en la papelera nadie mueve un vehículo.
create or replace function public._vehiculo_motivo_de_bloqueo(v public.vehiculos, p_al_enviar boolean)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_fase public.fases;
begin
  if v.lead_id is not null then
    return 'Está vinculado a un lead. Quita el vínculo antes.';
  end if;
  if p_al_enviar and v.fase_id is not null then
    select * into v_fase from public.fases f where f.id = v.fase_id;
    if not v_fase.es_inicial then
      return format('Está en «%s». Sólo va a la papelera lo que sigue en su fase inicial.', v_fase.nombre);
    end if;
  end if;
  if exists (select 1 from public.comprobantes cp join public.cotizaciones c on c.id = cp.cotizacion_id where c.vehiculo_id = v.id) then
    return 'Tiene un comprobante emitido.';
  end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) or exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then
    return 'Tiene pagos o gastos registrados.';
  end if;
  if exists (select 1 from public.declaraciones_vehiculos d where d.vehiculo_id = v.id and d.removido_en is null) then
    return 'Está en una declaración aduanera.';
  end if;
  if exists (select 1 from public.repuestos_proyectos r where r.vehiculo_id = v.id and r.eliminado_en is null) then
    return 'Tiene un proyecto de repuestos.';
  end if;
  return null;
end;
$$;
revoke all on function public._vehiculo_motivo_de_bloqueo(public.vehiculos, boolean) from public, anon, authenticated;

-- Sella la versión del lote y devuelve la nueva.
create or replace function public._lote_papelera_tocar(p_lote uuid)
returns timestamptz language sql security definer set search_path = '' as $$
  update public.lotes_papelera l
  set actualizado_en = greatest(clock_timestamp(), l.actualizado_en + interval '1 microsecond')
  where l.id = p_lote
  returning l.actualizado_en;
$$;
revoke all on function public._lote_papelera_tocar(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enviar
-- ---------------------------------------------------------------------------
-- Un vehículo: levanta si no puede. Lo publicado se despublica acá mismo (conserva su precio).
-- Sus cotizaciones viajan con él, al mismo lote.
create or replace function public._vehiculo_a_papelera(p_vehiculo uuid, p_esperado timestamptz, p_lote uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_motivo text;
begin
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ya no existe o ya está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.eliminar') then
    raise exception 'No tienes permiso para enviarlo a la papelera.' using errcode = '42501';
  end if;
  if p_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if v.actualizado_en is distinct from p_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  v_motivo := public._vehiculo_motivo_de_bloqueo(v, true);
  if v_motivo is not null then
    raise exception '%', v_motivo using errcode = '23514';
  end if;
  update public.vehiculos x
  set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = p_lote, publicado_web = false, destacado_web = false
  where x.id = v.id;
  update public.cotizaciones c
  set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = p_lote
  where c.vehiculo_id = v.id and c.eliminado_en is null;
  return jsonb_build_object('id', v.id, 'titulo', v.titulo, 'despublicado', v.publicado_web);
end;
$$;
revoke all on function public._vehiculo_a_papelera(uuid, timestamptz, uuid) from public, anon, authenticated;

-- `p_vehiculos`: [{id, actualizado_en}], de 1 a 200. Un envío es un lote. Va uno por uno, cada uno
-- en su subtransacción: los que no pasan vuelven en `rechazados` con su motivo y no frenan al
-- resto. Si no pasa ninguno, no queda lote. En orden de id: dos envíos que se pisan no se abrazan.
create or replace function public.vehiculos_papelera_enviar(p_vehiculos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e record; v_lote uuid; v_version timestamptz; v_mensaje text; v_codigo text; v_titulo text;
  v_enviados jsonb := '[]'::jsonb; v_rechazados jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  if jsonb_typeof(p_vehiculos) is distinct from 'array' or jsonb_array_length(p_vehiculos) = 0 then
    raise exception 'No llegó ningún vehículo.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_vehiculos) > 200 then
    raise exception 'Se envían hasta 200 por vez.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_vehiculos) x
    where jsonb_typeof(x) <> 'object'
       or coalesce(x ->> 'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(x ->> 'actualizado_en', '2000-01-01') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}') then
    raise exception 'Uno de los vehículos llegó incompleto. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;

  insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', (select auth.uid())) returning id into v_lote;
  for e in
    select distinct on (x ->> 'id') (x ->> 'id')::uuid as id, x ->> 'actualizado_en' as version
    from jsonb_array_elements(p_vehiculos) x order by x ->> 'id'
  loop
    begin
      v_enviados := v_enviados || public._vehiculo_a_papelera(e.id, e.version::timestamptz, v_lote);
    exception when others then
      get stacked diagnostics v_mensaje = message_text, v_codigo = returned_sqlstate;
      -- Sólo lo que escribimos nosotros llega a la pantalla.
      if v_codigo not in ('PT409', '42501', '23514', 'P0001') then
        v_mensaje := 'No se pudo enviar. Vuelve a intentarlo.';
      end if;
      -- El título, sólo de lo que quien llama ve.
      select x.titulo into v_titulo from public.vehiculos x where x.id = e.id and public.puede_vehiculo(x.id, 'vehiculos.ver');
      v_rechazados := v_rechazados || jsonb_build_object('id', e.id, 'titulo', v_titulo, 'codigo', v_codigo, 'motivo', v_mensaje);
    end;
  end loop;

  if jsonb_array_length(v_enviados) = 0 then
    delete from public.lotes_papelera l where l.id = v_lote;
    return jsonb_build_object('lote', null, 'actualizado_en', null, 'enviados', v_enviados, 'rechazados', v_rechazados);
  end if;
  update public.lotes_papelera l
  set resumen = jsonb_build_object('cantidad', jsonb_array_length(v_enviados), 'restaurados', 0, 'purgados', 0)
  where l.id = v_lote;
  v_version := public._lote_papelera_tocar(v_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, null,
    jsonb_build_object('tipo', 'vehiculos', 'cantidad', jsonb_array_length(v_enviados)));
  return jsonb_build_object('lote', v_lote, 'actualizado_en', v_version, 'enviados', v_enviados, 'rechazados', v_rechazados);
end;
$$;
revoke all on function public.vehiculos_papelera_enviar(jsonb) from public, anon;
grant execute on function public.vehiculos_papelera_enviar(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Listar
-- ---------------------------------------------------------------------------
-- Los lotes que todavía tienen algo adentro: los propios, o todos con `vehiculos.papelera.purgar`.
-- `motivo_de_bloqueo` dice por qué un vehículo no se purga (algo cambió mientras estaba adentro).
create or replace function public.vehiculos_papelera_listar()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_lotes jsonb;
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('vehiculos.papelera.purgar');
  select coalesce(jsonb_agg(x.lote order by x.creado_en desc, x.id), '[]'::jsonb) into v_lotes
  from (
    select l.id, l.creado_en, jsonb_build_object(
      'id', l.id, 'actualizado_en', l.actualizado_en, 'creado_en', l.creado_en,
      'creado_por_nombre', nullif(btrim(p.nombre), ''), 'es_mio', l.creado_por is not distinct from (select auth.uid()),
      'purga_el', l.creado_en + make_interval(days => v_dias),
      'enviados', coalesce((l.resumen ->> 'cantidad')::int, 0),
      'vehiculos', (
        select jsonb_agg(jsonb_build_object(
          'id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'origen_id', v.origen_id,
          'miniatura', (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = v.id and i.es_portada),
          'fotos', (select count(*) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
          'motivo_de_bloqueo', public._vehiculo_motivo_de_bloqueo(v, false)) order by v.numero)
        from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)) as lote
    from public.lotes_papelera l left join public.perfiles p on p.id = l.creado_por
    where l.tipo = 'vehiculos'
      and (v_todo or l.creado_por = (select auth.uid()))
      and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)
  ) x;
  return v_lotes;
end;
$$;
revoke all on function public.vehiculos_papelera_listar() from public, anon;
grant execute on function public.vehiculos_papelera_listar() to authenticated;

-- ---------------------------------------------------------------------------
-- Restaurar
-- ---------------------------------------------------------------------------
-- El lote entero (`p_vehiculos` nulo) o algunos de sus vehículos. Lo hace quien lo envió o quien
-- puede vaciar la papelera. Cada vehículo vuelve sin publicar. Si otro vehículo vivo tomó su VIN o
-- su lote de subasta, queda adentro y vuelve en `pendientes` con el motivo.
create or replace function public.vehiculos_papelera_restaurar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_vehiculos uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.lotes_papelera; v public.vehiculos; v_mensaje text; v_campo text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  select * into l from public.lotes_papelera x where x.id = p_lote and x.tipo = 'vehiculos' for update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('vehiculos.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;

  for v in
    select * from public.vehiculos x
    where x.lote_papelera_id = l.id and x.eliminado_en is not null and (p_vehiculos is null or x.id = any (p_vehiculos))
    order by x.id for update
  loop
    begin
      perform public._vehiculo_sin_repetidos(v);
      update public.vehiculos x
      set eliminado_en = null, eliminado_por = null, lote_papelera_id = null, publicado_web = false, destacado_web = false
      where x.id = v.id;
      update public.cotizaciones c set eliminado_en = null, eliminado_por = null, lote_papelera_id = null
      where c.lote_papelera_id = l.id and c.vehiculo_id = v.id;
      v_restaurados := v_restaurados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo);
    exception when unique_violation then
      get stacked diagnostics v_mensaje = message_text, v_campo = pg_exception_hint;
      -- El VIN y el lote los dice `_vehiculo_sin_repetidos()`; cualquier otro choque habla en técnico.
      if coalesce(v_campo, '') not in ('vin', 'lote') then
        v_mensaje := 'Choca con otro registro que ya existe.';
      end if;
      v_pendientes := v_pendientes || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'motivo', v_mensaje);
    end;
  end loop;

  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', l.actualizado_en, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan',
      (select count(*) from public.vehiculos x where x.lote_papelera_id = l.id and x.eliminado_en is not null));
  end if;
  select count(*) into v_quedan from public.vehiculos x where x.lote_papelera_id = l.id and x.eliminado_en is not null;
  update public.lotes_papelera x
  set resumen = x.resumen || jsonb_build_object('restaurados', coalesce((x.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else x.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else x.restaurado_por end
  where x.id = l.id;
  v_version := public._lote_papelera_tocar(l.id);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', l.id::text, null, null,
    jsonb_build_object('cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;
revoke all on function public.vehiculos_papelera_restaurar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.vehiculos_papelera_restaurar(uuid, timestamptz, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- ¿Sobre cuáles de estos vehículos tengo este permiso?
-- ---------------------------------------------------------------------------
-- Como `vehiculos_editables()`, para cualquier permiso con alcance: la interfaz pregunta, acotado
-- a lo que tiene en pantalla, en vez de copiar la regla de la cartera.
create or replace function public.vehiculos_con_permiso(p_ids uuid[], p_clave text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select x.id from unnest(p_ids[1:200]) as x (id)
  where p_clave in ('vehiculos.editar', 'vehiculos.eliminar') and public.puede_vehiculo(x.id, p_clave);
$$;
revoke all on function public.vehiculos_con_permiso(uuid[], text) from public, anon;
grant execute on function public.vehiculos_con_permiso(uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- Las genéricas dejan de aceptar vehículos
-- ---------------------------------------------------------------------------
-- Siguen para leads y cotizaciones (las llama `cotizacion_marcar_final`). Rechazan por el tipo que
-- reciben y por el tipo del lote: no queda una puerta a los vehículos sin sus reglas.
create or replace function public._papelera_sin_vehiculos(p_tipo public.tipo_lote_papelera)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_tipo = 'vehiculos' then
    raise exception 'Los vehículos tienen su propia papelera: usa vehiculos_papelera_*().' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._papelera_sin_vehiculos(public.tipo_lote_papelera) from public, anon, authenticated;

create or replace function public.papelera_enviar(p_tipo public.tipo_lote_papelera, p_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_lote uuid; n int; v_id uuid;
begin
  perform public.assert_activo();
  perform public._papelera_sin_vehiculos(p_tipo);
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Nada que enviar.' using errcode = '22023'; end if;
  if array_length(p_ids, 1) > 200 then raise exception 'Máximo 200 por lote.' using errcode = '22023'; end if;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values (p_tipo, (select auth.uid()), jsonb_build_object('cantidad', array_length(p_ids, 1))) returning id into v_lote;
  if p_tipo = 'leads' then
    foreach v_id in array p_ids loop
      if not public.puede_lead(v_id, 'leads.eliminar') then raise exception 'Sin permiso para eliminar el lead %', v_id using errcode = '42501'; end if;
    end loop;
    update public.leads set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
  else
    foreach v_id in array p_ids loop
      if not public.puede_cotizacion(v_id, 'cotizaciones.editar') and not public.tiene_permiso('cotizaciones.moderar') then raise exception 'Sin permiso para eliminar la cotización %', v_id using errcode = '42501'; end if;
    end loop;
    update public.cotizaciones set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
  end if;
  get diagnostics n = row_count;
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, jsonb_build_object('tipo', p_tipo, 'cantidad', n));
  return v_lote;
end;
$$;

create or replace function public.papelera_listar(p_tipo public.tipo_lote_papelera)
returns table (registro_id uuid, titulo text, borrado_en timestamptz, borrado_por uuid, lote_id uuid, purga_el timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_dias int;
begin
  perform public.assert_activo();
  perform public._papelera_sin_vehiculos(p_tipo);
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  if p_tipo = 'leads' then
    return query select l.id, l.nombre, l.eliminado_en, l.eliminado_por, l.lote_papelera_id, l.eliminado_en + make_interval(days => v_dias)
      from public.leads l where l.eliminado_en is not null and (l.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
  else
    return query select c.id, coalesce(c.titulo, 'Cotización #' || c.numero), c.eliminado_en, c.eliminado_por, c.lote_papelera_id, c.eliminado_en + make_interval(days => v_dias)
      from public.cotizaciones c where c.eliminado_en is not null and (c.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
  end if;
end;
$$;

create or replace function public.papelera_restaurar(p_lote uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; v_por uuid; n int := 0;
begin
  perform public.assert_activo();
  select tipo, creado_por into v_tipo, v_por from public.lotes_papelera where id = p_lote and purgado_en is null;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  perform public._papelera_sin_vehiculos(v_tipo);
  if v_por <> (select auth.uid()) and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sólo quien lo envió (o quien purga) lo restaura.' using errcode = '42501'; end if;
  if v_tipo = 'leads' then
    update public.leads set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  else
    update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  end if;
  get diagnostics n = row_count;
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = (select auth.uid()) where id = p_lote;
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

create or replace function public.papelera_purgar(p_lote uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; n int := 0;
begin
  if (select auth.uid()) is not null and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sin permiso para purgar.' using errcode = '42501'; end if;
  select tipo into v_tipo from public.lotes_papelera where id = p_lote and purgado_en is null and restaurado_en is null;
  if not found then return 0; end if;
  perform public._papelera_sin_vehiculos(v_tipo);
  if v_tipo = 'leads' then
    delete from public.leads where lote_papelera_id = p_lote;
  else
    insert into public.cola_gc_storage (bucket, ruta) select 'cotizaciones', a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id where c.lote_papelera_id = p_lote on conflict do nothing;
    delete from public.cotizaciones where lote_papelera_id = p_lote;
  end if;
  get diagnostics n = row_count;
  update public.lotes_papelera set purgado_en = now() where id = p_lote;
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

-- La purga automática no existe todavía para los vehículos (llega en `…000900`, con sus bloqueos),
-- y la genérica ya no los acepta: que no reviente con el primer lote de vehículos vencido.
create or replace function public.papelera_purgar_vencidos()
returns int language plpgsql security definer set search_path = '' as $$
declare v_dias int; r record; total int := 0;
begin
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  for r in select id from public.lotes_papelera where tipo <> 'vehiculos' and purgado_en is null and restaurado_en is null and creado_en < now() - make_interval(days => v_dias) loop
    total := total + public.papelera_purgar(r.id);
  end loop;
  return total;
end;
$$;
