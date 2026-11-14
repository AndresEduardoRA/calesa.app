-- La cotización aprobada de un vehículo (B4, `docs/TANDA.md`; `docs/COTIZADOR.md` › «La cotización aprobada»): una marca por vehículo, distinta de la
-- final, con su primer resultado congelado para que la lista de vehículos la lea sin unir cotizaciones.
--
-- La verdad es la tabla `cotizaciones_aprobadas` (una fila por vehículo). No se guarda en `cotizaciones` (aprobar movería la versión de quien edita) ni
-- en `vehiculos` (`authenticated` lee la fila entera: el monto llegaría a quien ve el vehículo y no la cotización). La mantiene la base al confirmar:
-- un trigger por fila anota los vehículos cuya aprobada pudo cambiar y un constraint trigger diferido los repone con el candado de cada vehículo.

-- ─── El permiso: quien cierra finales en un origen también aprueba ahí ───────────────────────────────────────────────────────────────────────────
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('cotizaciones.aprobar', 'cotizaciones', 'Aprobar cotizaciones', 'Elegir la cotización aprobada de un vehículo (por origen)', true, false, 'cotizacion_aprobar', 252)
on conflict (clave) do nothing;

-- Migración de datos.
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select rp.rol_id, 'cotizaciones.aprobar', rp.origen_id, rp.alcance
from public.roles_permisos rp
where rp.permiso_clave = 'cotizaciones.final.gestionar'
on conflict (rol_id, permiso_clave, origen_id) do nothing;

-- ─── La tabla ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Sin FK a `vehiculos`: el insert tomaría `key share` del vehículo al confirmar y cerraría un ciclo con su papelera. La integridad la da
-- `_aprobada_reponer()` (un vehículo en la papelera o inexistente queda sin fila).
create table public.cotizaciones_aprobadas (
  vehiculo_id uuid primary key,
  cotizacion_id uuid not null unique references public.cotizaciones (id) on delete cascade,
  origen_id uuid not null,
  creado_por uuid not null,
  lead_id uuid,
  monto numeric,
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  actualizado_en timestamptz not null default now()
);

comment on table public.cotizaciones_aprobadas is 'La cotización aprobada de cada vehículo (una fila por vehículo) con su primer resultado congelado (monto, moneda). Sólo la escriben cotizacion_aprobar() y _aprobada_reponer() (al confirmar, por trg_cotizaciones_aprobadas_al_confirmar). origen_id, creado_por y lead_id son copias de la cotización: su policy espeja «cotizaciones: leer», así que la fila y el monto los ve exactamente quien ve esa cotización.';
comment on column public.cotizaciones_aprobadas.vehiculo_id is 'Sin FK a vehiculos (ver el comentario de la tabla): un vehículo inexistente o en la papelera no tiene fila.';
comment on column public.cotizaciones_aprobadas.monto is 'El primer resultado de la cotización al aprobarla o guardarla: totales.usd, sin escala (la tarjeta del total de su hoja). Nulo si la cotización no lo trae.';
comment on column public.cotizaciones_aprobadas.moneda is 'La moneda del monto, congelada con él (hoy siempre USD).';

create index cotizaciones_aprobadas_origen_idx on public.cotizaciones_aprobadas (origen_id);
create index cotizaciones_aprobadas_creado_por_idx on public.cotizaciones_aprobadas (creado_por);
create index cotizaciones_aprobadas_lead_idx on public.cotizaciones_aprobadas (lead_id) where lead_id is not null;

alter table public.cotizaciones_aprobadas enable row level security;
revoke all on table public.cotizaciones_aprobadas from anon, authenticated;
grant select on table public.cotizaciones_aprobadas to authenticated;

create policy "cotizaciones_aprobadas: leer" on public.cotizaciones_aprobadas for select to authenticated using (
  origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'todos'))::uuid[])
  or (origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'propios'))::uuid[])
      and (creado_por = (select auth.uid()) or public.en_cartera(lead_id)))
);

-- ─── Funciones de nadie ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
create function public._cotizacion_primer_resultado(p_totales jsonb, out monto numeric, out moneda text)
  language sql stable
  set search_path = ''
as $$
  select case when jsonb_typeof(p_totales -> 'usd') = 'number' then (p_totales ->> 'usd')::numeric end, 'USD'::text;
$$;

comment on function public._cotizacion_primer_resultado(jsonb) is 'El primer resultado de una cotización: totales.usd (lo que la hoja dibuja primero en la tarjeta del total) y su moneda, USD. Nulo si no es un número. Espejo de entities/primer-resultado.ts. De nadie.';

create function public._aprobada_candado(p_vehiculos uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v uuid;
begin
  for v in select distinct x from unnest(p_vehiculos) as x where x is not null order by x loop
    perform pg_advisory_xact_lock(hashtextextended('cotizaciones_aprobadas:' || v::text, 0));
  end loop;
end;
$$;

comment on function public._aprobada_candado(uuid[]) is 'Serializa la aprobada de cada vehículo (candado de aviso por vehículo, en orden de id y sin repetir). Sólo lo toman quienes tocan cotizaciones_aprobadas: cotizacion_aprobar() y trg_cotizaciones_aprobadas_al_confirmar. De nadie.';

create function public._aprobada_poner(p_vehiculo uuid, p_cotizacion uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare c record; r record;
begin
  select x.origen_id, x.creado_por, x.lead_id, x.totales into c from public.cotizaciones x where x.id = p_cotizacion;
  if not found then
    return;
  end if;
  select * into r from public._cotizacion_primer_resultado(c.totales);
  -- Una cotización que cambió de vehículo ya no es la aprobada del anterior.
  delete from public.cotizaciones_aprobadas a where a.cotizacion_id = p_cotizacion and a.vehiculo_id <> p_vehiculo;
  insert into public.cotizaciones_aprobadas as a (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
  values (p_vehiculo, p_cotizacion, c.origen_id, c.creado_por, c.lead_id, r.monto, r.moneda)
  on conflict (vehiculo_id) do update
    set cotizacion_id = excluded.cotizacion_id, origen_id = excluded.origen_id, creado_por = excluded.creado_por, lead_id = excluded.lead_id,
        monto = excluded.monto, moneda = excluded.moneda, actualizado_en = now();
end;
$$;

comment on function public._aprobada_poner(uuid, uuid) is 'Deja a la cotización como aprobada del vehículo, con sus copias y su primer resultado. Supone el candado de _aprobada_candado(). De nadie.';

create function public._aprobada_reponer(p_vehiculo uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_viva boolean;
  a record;
  c record;
  r record;
begin
  if p_vehiculo is null then
    return;
  end if;
  select exists (select 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null) into v_viva;
  if not v_viva then
    delete from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
    return;
  end if;
  -- Activa = con este vehículo, fuera de la papelera y no inválida (la reportada cuenta).
  select x.cotizacion_id, x.origen_id, x.creado_por, x.lead_id, x.monto, x.moneda into a
    from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
  if found then
    select k.origen_id, k.creado_por, k.lead_id, k.totales into c
      from public.cotizaciones k
     where k.id = a.cotizacion_id and k.vehiculo_id = p_vehiculo and k.eliminado_en is null and k.estado <> 'invalida';
    if found then
      -- Se queda; sólo se refrescan el primer resultado y las copias si cambiaron.
      select * into r from public._cotizacion_primer_resultado(c.totales);
      if a.origen_id is distinct from c.origen_id or a.creado_por is distinct from c.creado_por or a.lead_id is distinct from c.lead_id
         or a.monto is distinct from r.monto or a.moneda is distinct from r.moneda then
        update public.cotizaciones_aprobadas x
           set origen_id = c.origen_id, creado_por = c.creado_por, lead_id = c.lead_id, monto = r.monto, moneda = r.moneda, actualizado_en = now()
         where x.vehiculo_id = p_vehiculo;
      end if;
      return;
    end if;
  end if;
  -- La más antigua activa (cotizaciones_vehiculo_creado_idx hacia atrás).
  select k.id into c from public.cotizaciones k
   where k.vehiculo_id = p_vehiculo and k.eliminado_en is null and k.estado <> 'invalida'
   order by k.creado_en, k.id limit 1;
  if found then
    perform public._aprobada_poner(p_vehiculo, c.id);
  else
    delete from public.cotizaciones_aprobadas x where x.vehiculo_id = p_vehiculo;
  end if;
end;
$$;

comment on function public._aprobada_reponer(uuid) is 'La regla única de la aprobada de un vehículo: si apunta a una cotización activa se queda (refresca monto y copias si cambiaron); si no, pasa a la más antigua activa por (creado_en, id); sin activas, o con el vehículo en la papelera o inexistente, no hay fila. Supone el candado de _aprobada_candado(). De nadie.';

create function public._cotizaciones_aprobadas_rellenar() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare n integer;
begin
  insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, lead_id, monto, moneda)
  select distinct on (c.vehiculo_id) c.vehiculo_id, c.id, c.origen_id, c.creado_por, c.lead_id, r.monto, r.moneda
    from public.cotizaciones c
    join public.vehiculos v on v.id = c.vehiculo_id and v.eliminado_en is null
    cross join lateral public._cotizacion_primer_resultado(c.totales) r
   where c.eliminado_en is null and c.estado <> 'invalida'
   order by c.vehiculo_id, c.creado_en, c.id
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public._cotizaciones_aprobadas_rellenar() is 'Relleno de cotizaciones_aprobadas con la más antigua activa de cada vehículo vivo; no pisa lo que ya hay. La llama la migración una vez y la siembra de volumen (que inserta sin triggers).';

-- ─── Los triggers de cotizaciones ────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. Por fila: anota en un GUC local los vehículos cuya aprobada pudo cambiar. No toma candados ni escribe tablas.
create function public._cotizacion_aprobada_anotar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_ids uuid[] := '{}';
  v_actual text;
  v_activa_old boolean;
  v_activa_new boolean;
begin
  if tg_op = 'INSERT' then
    if new.vehiculo_id is not null and new.eliminado_en is null and new.estado <> 'invalida' then
      v_ids := array[new.vehiculo_id];
    end if;
  elsif tg_op = 'DELETE' then
    if old.vehiculo_id is not null then
      v_ids := array[old.vehiculo_id];
    end if;
  else
    v_activa_old := old.vehiculo_id is not null and old.eliminado_en is null and old.estado <> 'invalida';
    v_activa_new := new.vehiculo_id is not null and new.eliminado_en is null and new.estado <> 'invalida';
    if new.vehiculo_id is distinct from old.vehiculo_id then
      v_ids := array_remove(array[old.vehiculo_id, new.vehiculo_id], null);
    elsif v_activa_old is distinct from v_activa_new
          or (v_activa_new and (new.totales is distinct from old.totales or new.lead_id is distinct from old.lead_id
                                or new.creado_por is distinct from old.creado_por or new.origen_id is distinct from old.origen_id)) then
      v_ids := array[new.vehiculo_id];
    end if;
  end if;
  if cardinality(v_ids) > 0 then
    v_actual := coalesce(current_setting('importadora.aprobadas_por_reponer', true), '');
    select string_agg(distinct x::text, ',') into v_actual
      from unnest(string_to_array(nullif(v_actual, ''), ',')::uuid[] || v_ids) as x;
    perform set_config('importadora.aprobadas_por_reponer', v_actual, true);
  end if;
  return null;
end;
$$;

comment on function public._cotizacion_aprobada_anotar() is 'Anota (GUC local importadora.aprobadas_por_reponer) los vehículos cuya aprobada pudo cambiar con esta fila de cotizaciones. No toma candados ni escribe tablas: lo hace _cotizaciones_aprobadas_al_confirmar() al confirmar.';

create trigger trg_cotizacion_aprobada_anotar
  after insert or delete or update of vehiculo_id, estado, eliminado_en, totales, lead_id, creado_por, origen_id on public.cotizaciones
  for each row execute function public._cotizacion_aprobada_anotar();

-- 2. Al confirmar: toma el candado de cada vehículo anotado, en orden de id, y lo repone con una lectura nueva. La transacción ya tiene todos sus
-- candados de fila y sólo lee cotizaciones y escribe cotizaciones_aprobadas: no puede cerrar un ciclo.
create function public._cotizaciones_aprobadas_al_confirmar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_ids uuid[];
  v uuid;
  v_texto text;
begin
  v_texto := nullif(current_setting('importadora.aprobadas_por_reponer', true), '');
  if v_texto is null then
    return null;
  end if;
  perform set_config('importadora.aprobadas_por_reponer', '', true);
  v_ids := array(select distinct x from unnest(string_to_array(v_texto, ',')::uuid[]) as x order by x);
  perform public._aprobada_candado(v_ids);
  foreach v in array v_ids loop
    perform public._aprobada_reponer(v);
  end loop;
  return null;
end;
$$;

comment on function public._cotizaciones_aprobadas_al_confirmar() is 'Repone la aprobada de los vehículos anotados por _cotizacion_aprobada_anotar() al confirmar: candado de cada vehículo en orden de id y _aprobada_reponer(). El primer evento lo hace todo; los demás leen el GUC vacío.';

create constraint trigger trg_cotizaciones_aprobadas_al_confirmar
  after insert or delete or update of vehiculo_id, estado, eliminado_en, totales, lead_id, creado_por, origen_id on public.cotizaciones
  deferrable initially deferred
  for each row execute function public._cotizaciones_aprobadas_al_confirmar();

-- ─── Aprobar ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
create function public.cotizacion_aprobar(p_cotizacion uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c record;
  k record;
  v_ant record;
  v_ver_ant boolean;
  v_anterior jsonb := null;
begin
  perform public.assert_activo();
  -- Ver, y el permiso del origen, antes de tomar nada: quien no puede recibe 42501 sin esperar.
  select x.id, x.vehiculo_id, x.origen_id, x.estado into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if not public.tiene_permiso('cotizaciones.aprobar', c.origen_id) then
    raise exception 'No tienes permiso para aprobar cotizaciones de este origen.' using errcode = '42501';
  end if;
  if c.vehiculo_id is null then
    raise exception 'Para aprobarla, asígnale un vehículo.' using errcode = '22023', hint = 'vehiculo';
  end if;
  if c.estado = 'invalida' then
    raise exception 'Una cotización inválida no se aprueba: reactívala primero.' using errcode = '23514';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  -- Candados en el orden común: vehículo, cotización, y al final el de la aprobada.
  perform 1 from public.vehiculos v where v.id = c.vehiculo_id for key share;
  select x.id, x.numero, x.vehiculo_id, x.estado, x.actualizado_en into k
    from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null for share;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if k.vehiculo_id is distinct from c.vehiculo_id or k.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('cotizaciones', k.id, k.actualizado_en, 'esta cotización');
  end if;
  if k.estado = 'invalida' then
    raise exception 'Una cotización inválida no se aprueba: reactívala primero.' using errcode = '23514';
  end if;
  perform public._aprobada_candado(array[k.vehiculo_id]);

  select a.cotizacion_id into v_ant from public.cotizaciones_aprobadas a where a.vehiculo_id = k.vehiculo_id;
  if found and v_ant.cotizacion_id = k.id then
    return jsonb_build_object('cotizacion', jsonb_build_object('id', k.id, 'numero', k.numero, 'actualizado_en', k.actualizado_en), 'anterior', null);
  end if;

  perform public._aprobada_poner(k.vehiculo_id, k.id);
  perform public.registrar_actividad('cotizacion.aprobada', 'cotizaciones', k.id::text,
    jsonb_build_object('aprobada', v_ant.cotizacion_id), jsonb_build_object('aprobada', k.id), jsonb_build_object('vehiculo', k.vehiculo_id));

  -- La anterior sólo se nombra si quien llama la ve, puede aprobarla (su origen) y sigue activa: es lo que «Deshacer» necesita.
  if v_ant.cotizacion_id is not null then
    select x.id, x.numero, x.origen_id, x.actualizado_en into c
      from public.cotizaciones x where x.id = v_ant.cotizacion_id and x.eliminado_en is null and x.estado <> 'invalida';
    if found then
      v_ver_ant := public.puede_cotizacion(c.id, 'cotizaciones.ver') and public.tiene_permiso('cotizaciones.aprobar', c.origen_id);
      if v_ver_ant then
        v_anterior := jsonb_build_object('id', c.id, 'numero', c.numero, 'actualizado_en', c.actualizado_en);
      end if;
    end if;
  end if;

  return jsonb_build_object('cotizacion', jsonb_build_object('id', k.id, 'numero', k.numero, 'actualizado_en', k.actualizado_en), 'anterior', v_anterior);
end;
$$;

comment on function public.cotizacion_aprobar(uuid, timestamptz) is 'Aprueba una cotización: pasa a ser la aprobada de su vehículo y la anterior deja de serlo (una por vehículo). Pide ver (42501, también si no existe o está en la papelera) y cotizaciones.aprobar de su origen (42501); sin vehículo 22023 (hint vehiculo); inválida 23514; la versión de esa cotización (PT409). No mueve su versión ni escribe cotizaciones: deja cotizacion.aprobada en la actividad. Candados: vehículo (for key share), la cotización (for share) y el de la aprobada. {cotizacion: {id, numero, actualizado_en}, anterior: {id, numero, actualizado_en} | null} (la anterior sólo si quien llama la ve, la aprueba y sigue activa).';

-- ─── Privilegios ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public._cotizacion_primer_resultado(jsonb) from public, anon, authenticated;
revoke all on function public._aprobada_candado(uuid[]) from public, anon, authenticated;
revoke all on function public._aprobada_poner(uuid, uuid) from public, anon, authenticated;
revoke all on function public._aprobada_reponer(uuid) from public, anon, authenticated;
revoke all on function public._cotizaciones_aprobadas_rellenar() from public, anon, authenticated;
revoke all on function public._cotizacion_aprobada_anotar() from public, anon, authenticated;
revoke all on function public._cotizaciones_aprobadas_al_confirmar() from public, anon, authenticated;
revoke all on function public.cotizacion_aprobar(uuid, timestamptz) from public, anon;
grant execute on function public.cotizacion_aprobar(uuid, timestamptz) to authenticated, service_role;

-- Cada vehículo existente queda con su más antigua activa.
select public._cotizaciones_aprobadas_rellenar();
