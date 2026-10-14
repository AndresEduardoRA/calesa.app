-- limpieza automática de vehículos de subasta que nadie compró. Escrito a mano.
--
-- Qué hace: cada madrugada (en la zona horaria de la empresa) manda a la papelera, en un lote
-- «Limpieza automática», los vehículos importados por apibara cuya subasta terminó hace más de N días
-- y que no tienen ninguna ancla. Desde ahí sigue el camino de siempre: papelera_dias, purga y
-- storage-gc. Nunca llama a apibara: decide por la fecha y el estado que ya están guardados.
--
-- UNA SOLA FUENTE DE VERDAD. La regla vive acá y de acá leen el job, el filtro «Se limpiará pronto»
-- y el banner de la ficha; ninguno la copia:
--
--   _limpieza_aplica(v)          — ¿le toca a este vehículo? (importado por apibara, de un origen de subasta)
--   _limpieza_termino(v, ahora)  — cuándo terminó su subasta, según lo guardado
--   _limpieza_vence(v, ahora)    — el día local en que cumple los días de gracia (sin mirar anclas)
--   _limpieza_ancla(v)           — qué lo retiene; AQUÍ se suman las anclas nuevas (cotización final: Fase 4)
--   _limpieza_fecha(v, ahora, proxima) — el día local en que el job lo va a mover, o nulo
--   limpieza_el(v)               — lo mismo con la hora de ahora: columna calculada para PostgREST
--
-- Se aplica sobre una base viva: todo es idempotente y la estructura también vive en
-- `supabase/schemas/`.

-- ---------------------------------------------------------------------------
-- Ajustes de la empresa
-- ---------------------------------------------------------------------------
alter table public.ajustes_empresa
  add column if not exists limpieza_automatica boolean not null default true,
  add column if not exists limpieza_dias_gracia int not null default 7 check (limpieza_dias_gracia between 1 and 90);
comment on column public.ajustes_empresa.limpieza_automatica is 'Interruptor general de la limpieza automática de vehículos de subasta. Apagado: no hay job, filtro ni banner.';
comment on column public.ajustes_empresa.limpieza_dias_gracia is 'Días que pasan desde que terminó la subasta hasta que un vehículo sin ancla va a la papelera (1 a 90).';

-- Los dos datos nuevos entran a la lista cerrada de lo que se edita. El resto, igual que antes.
create or replace function public.empresa_guardar_ajustes(p_cambios jsonb, p_actualizado_en_esperado timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.ajustes_empresa;
  v_clave text;
  v_nueva timestamptz;
  v_editables constant text[] := array['nombre', 'razon_social', 'nit', 'direccion', 'ciudad', 'pais', 'telefono', 'whatsapp', 'email',
    'logo_ruta', 'color_acento', 'iconos', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia'];
  v_obligatorias constant text[] := array['nombre', 'pais', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia'];
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde los ajustes de la empresa.', v_clave;
    end if;
    if v_clave = any (v_obligatorias) and nullif(btrim(p_cambios ->> v_clave), '') is null then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select * into v from public.ajustes_empresa where id = 1 for update;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la empresa mientras los editabas.');

  if p_cambios ? 'zona_horaria' then
    begin
      perform now() at time zone (p_cambios ->> 'zona_horaria');
    exception when others then
      raise exception 'La zona horaria «%» no existe.', p_cambios ->> 'zona_horaria';
    end;
  end if;
  -- Con el locale se formatea cada número de la app: uno con otra forma rompería todas las pantallas.
  if p_cambios ? 'locale' and btrim(p_cambios ->> 'locale') !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    raise exception 'El formato regional «%» no tiene la forma esperada, como es-BO.', p_cambios ->> 'locale';
  end if;
  if p_cambios ? 'iconos' and jsonb_typeof(p_cambios -> 'iconos') not in ('object', 'null') then
    raise exception 'Los íconos no tienen la forma esperada.';
  end if;
  if p_cambios ? 'limpieza_dias_gracia'
     and (btrim(p_cambios ->> 'limpieza_dias_gracia') !~ '^[0-9]{1,3}$' or (p_cambios ->> 'limpieza_dias_gracia')::int not between 1 and 90) then
    raise exception 'Los días de gracia de la limpieza van de 1 a 90.' using errcode = '22023', hint = 'limpieza_dias_gracia';
  end if;
  if p_cambios ? 'limpieza_automatica' and (p_cambios ->> 'limpieza_automatica') not in ('true', 'false') then
    raise exception 'La limpieza automática se enciende o se apaga.' using errcode = '22023', hint = 'limpieza_automatica';
  end if;
  if p_cambios ? 'moneda_base' and (p_cambios ->> 'moneda_base') is distinct from v.moneda_base::text then
    if not exists (select 1 from public.monedas m where m.codigo::text = p_cambios ->> 'moneda_base' and m.activa) then
      raise exception 'La moneda base tiene que ser una de las monedas activas.';
    end if;
    if public.empresa_con_datos_cargados() then
      raise exception 'La moneda base no se cambia con datos cargados: los montos ya están guardados en %.', v.moneda_base;
    end if;
  end if;

  update public.ajustes_empresa e set
    nombre = case when p_cambios ? 'nombre' then btrim(p_cambios ->> 'nombre') else e.nombre end,
    razon_social = case when p_cambios ? 'razon_social' then nullif(btrim(p_cambios ->> 'razon_social'), '') else e.razon_social end,
    nit = case when p_cambios ? 'nit' then nullif(btrim(p_cambios ->> 'nit'), '') else e.nit end,
    direccion = case when p_cambios ? 'direccion' then nullif(btrim(p_cambios ->> 'direccion'), '') else e.direccion end,
    ciudad = case when p_cambios ? 'ciudad' then nullif(btrim(p_cambios ->> 'ciudad'), '') else e.ciudad end,
    pais = case when p_cambios ? 'pais' then btrim(p_cambios ->> 'pais') else e.pais end,
    telefono = case when p_cambios ? 'telefono' then nullif(btrim(p_cambios ->> 'telefono'), '') else e.telefono end,
    whatsapp = case when p_cambios ? 'whatsapp' then nullif(btrim(p_cambios ->> 'whatsapp'), '') else e.whatsapp end,
    email = case when p_cambios ? 'email' then nullif(btrim(p_cambios ->> 'email'), '') else e.email end,
    logo_ruta = case when p_cambios ? 'logo_ruta' then nullif(p_cambios ->> 'logo_ruta', '') else e.logo_ruta end,
    color_acento = case when p_cambios ? 'color_acento' then nullif(lower(p_cambios ->> 'color_acento'), '') else e.color_acento end,
    iconos = case when p_cambios ? 'iconos' then nullif(p_cambios -> 'iconos', 'null'::jsonb) else e.iconos end,
    locale = case when p_cambios ? 'locale' then btrim(p_cambios ->> 'locale') else e.locale end,
    zona_horaria = case when p_cambios ? 'zona_horaria' then btrim(p_cambios ->> 'zona_horaria') else e.zona_horaria end,
    moneda_base = case when p_cambios ? 'moneda_base' then (p_cambios ->> 'moneda_base')::char(3) else e.moneda_base end,
    registro_abierto = case when p_cambios ? 'registro_abierto' then (p_cambios ->> 'registro_abierto')::boolean else e.registro_abierto end,
    papelera_dias = case when p_cambios ? 'papelera_dias' then (p_cambios ->> 'papelera_dias')::int else e.papelera_dias end,
    actividad_dias = case when p_cambios ? 'actividad_dias' then (p_cambios ->> 'actividad_dias')::int else e.actividad_dias end,
    limpieza_automatica = case when p_cambios ? 'limpieza_automatica' then (p_cambios ->> 'limpieza_automatica')::boolean else e.limpieza_automatica end,
    limpieza_dias_gracia = case when p_cambios ? 'limpieza_dias_gracia' then (p_cambios ->> 'limpieza_dias_gracia')::int else e.limpieza_dias_gracia end,
    actualizado_por = (select auth.uid())
  where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.empresa_guardar_ajustes(jsonb, timestamptz) from public, anon;
grant execute on function public.empresa_guardar_ajustes(jsonb, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Estructura (espejo de schemas/, para la base que ya existe)
-- ---------------------------------------------------------------------------
alter table public.lotes_papelera add column if not exists es_limpieza boolean not null default false;
comment on column public.lotes_papelera.es_limpieza is 'El lote lo armó la limpieza automática (creado_por nulo). Restaurar sus vehículos los deja marcados «Conservar».';

create table if not exists public.vehiculos_conservados (
  vehiculo_id    uuid primary key references public.vehiculos (id) on delete cascade,
  conservado_por uuid references public.perfiles (id) on delete set null,
  conservado_en  timestamptz not null default now()
);
create index if not exists vehiculos_conservados_por_idx on public.vehiculos_conservados (conservado_por) where conservado_por is not null;
comment on table public.vehiculos_conservados is 'La marca «Conservar»: la limpieza automática no toca estos vehículos. Aparte de vehiculos para no mover la versión de la ficha. Se escribe sólo por vehiculo_conservar() y, al restaurar un lote de limpieza, por trigger.';

create table if not exists public.limpieza_corridas (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  parcial     boolean not null default false,
  lote_id     uuid references public.lotes_papelera (id) on delete set null,
  movidos     int not null default 0,
  saltados    jsonb not null default '{}'::jsonb,
  pendientes  int not null default 0,
  empezo_en   timestamptz not null default clock_timestamp(),
  termino_en  timestamptz
);
create unique index if not exists limpieza_corridas_dia_unica on public.limpieza_corridas (fecha) where not parcial;
create index if not exists limpieza_corridas_lote_idx on public.limpieza_corridas (lote_id) where lote_id is not null;
comment on table public.limpieza_corridas is 'Una fila por noche (la de verdad; las parciales son de pruebas, acotadas a unos orígenes): cuántos vehículos movió la limpieza, cuántos dejó y por qué ancla, y cuántos quedaron para la noche siguiente. Sólo service_role y limpieza_ultima().';

alter table public.vehiculos_conservados enable row level security;
revoke all on table public.vehiculos_conservados from anon, authenticated;
grant select, insert, update, delete on table public.vehiculos_conservados to service_role;
grant select on table public.vehiculos_conservados to authenticated;
drop policy if exists "vehiculos_conservados: leer" on public.vehiculos_conservados;
create policy "vehiculos_conservados: leer" on public.vehiculos_conservados for select to authenticated
  using ((select public.puede_vehiculo(vehiculo_id, 'vehiculos.ver')));

alter table public.limpieza_corridas enable row level security;
revoke all on table public.limpieza_corridas from anon, authenticated;
grant select, insert, update, delete on table public.limpieza_corridas to service_role;

-- ---------------------------------------------------------------------------
-- La regla
-- ---------------------------------------------------------------------------
-- La hora local desde la que corre la limpieza (03:00). Un solo número: de él salen la fecha que
-- dice el banner y el momento en que el job se pone en marcha.
create or replace function public._limpieza_hora()
returns int language sql immutable set search_path = '' as $$ select 3 $$;
revoke all on function public._limpieza_hora() from public, anon, authenticated;

-- Sólo a los importados por apibara de un origen de subasta: lo cargado a mano nunca se toca. Decide
-- cómo nació el vehículo, no si apibara sigue encendida en su origen.
create or replace function public._limpieza_aplica(v public.vehiculos)
returns boolean language sql stable security definer set search_path = '' as $$
  select v.importado_apibara and v.eliminado_en is null
    and exists (select 1 from public.origenes o where o.id = v.origen_id and o.tipo = 'subasta');
$$;
revoke all on function public._limpieza_aplica(public.vehiculos) from public, anon, authenticated;

-- Cuándo terminó la subasta, por lo guardado (nunca se consulta a apibara):
--   · con fecha (fin, o inicio si no hay fin): terminó en ella si ya pasó; si está en el futuro, no
--     terminó, aunque el estado diga otra cosa (un refresco la movió);
--   · sin fecha: si el estado es terminada o vendida, cuenta desde la última consulta;
--   · sin fecha y sin estado terminal: nunca.
create or replace function public._limpieza_termino(v public.vehiculos, p_ahora timestamptz)
returns timestamptz language sql immutable set search_path = '' as $$
  select case
    when coalesce(v.subasta_fin_en, v.subasta_en) is not null
      then case when coalesce(v.subasta_fin_en, v.subasta_en) <= p_ahora then coalesce(v.subasta_fin_en, v.subasta_en) end
    when v.estado_subasta in ('terminada', 'vendida') then v.apibara_sync_en
  end;
$$;
revoke all on function public._limpieza_termino(public.vehiculos, timestamptz) from public, anon, authenticated;

-- El día local en que cumple los días de gracia, sin mirar anclas ni el interruptor. La limpieza
-- corre a partir de las 03:00 locales: lo que cumple después de esa hora espera al día siguiente.
-- Es una fecha, nunca una hora: así el banner y el job no pueden discrepar por unos minutos.
create or replace function public._limpieza_vence(v public.vehiculos, p_ahora timestamptz)
returns date language plpgsql stable security definer set search_path = '' as $$
declare a public.ajustes_empresa; t timestamptz; l timestamp;
begin
  if not public._limpieza_aplica(v) then return null; end if;
  t := public._limpieza_termino(v, p_ahora);
  if t is null then return null; end if;
  select * into a from public.ajustes_empresa e where e.id = 1;
  l := (t + make_interval(days => a.limpieza_dias_gracia)) at time zone a.zona_horaria;
  return l::date + case when l::time > make_time(public._limpieza_hora(), 0, 0) then 1 else 0 end;
end;
$$;
revoke all on function public._limpieza_vence(public.vehiculos, timestamptz) from public, anon, authenticated;

-- Qué lo retiene: el código de la primera ancla, o nulo si no tiene ninguna. Los interesados NO
-- anclan. Esta lista es la única: para sumar una ancla nueva se agrega acá una línea.
create or replace function public._limpieza_ancla(v public.vehiculos)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.vehiculos_conservados c where c.vehiculo_id = v.id) then return 'conservar'; end if;
  if v.lead_id is not null then return 'vinculo'; end if;
  if v.fase_id is not null and exists (select 1 from public.fases f where f.id = v.fase_id and not f.es_inicial) then
    return 'fase';
  end if;
  -- Cuentan todas las filas, también las borradas: la purga las llevaría en cascada.
  if exists (select 1 from public.documentos d where d.vehiculo_id = v.id) then return 'documentos'; end if;
  if exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then return 'gastos'; end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) then return 'pagos'; end if;
  if v.publicado_web then return 'vitrina'; end if;
  -- Fase 4: una cotización final activa también es ancla ('cotizacion_final'); se suma acá.
  -- Lo demás que la papelera manual rechaza (comprobante, declaración aduanera, repuestos): la
  -- limpieza nunca intenta lo que la puerta de siempre cerraría.
  if public._vehiculo_motivo_de_bloqueo(v, true) is not null then return 'bloqueo'; end if;
  return null;
end;
$$;
revoke all on function public._limpieza_ancla(public.vehiculos) from public, anon, authenticated;

-- El día local de la noche en que corre la próxima limpieza: hoy, salvo que la de hoy ya corrió.
create or replace function public._limpieza_proxima(p_ahora timestamptz)
returns date language plpgsql stable security definer set search_path = '' as $$
declare hoy date;
begin
  select (p_ahora at time zone e.zona_horaria)::date into hoy from public.ajustes_empresa e where e.id = 1;
  if exists (select 1 from public.limpieza_corridas c where c.fecha = hoy and not c.parcial) then
    return hoy + 1;
  end if;
  return hoy;
end;
$$;
revoke all on function public._limpieza_proxima(timestamptz) from public, anon, authenticated;

-- El día local en que el job lo va a mover, o nulo si hoy no hay nada que decir: interruptor
-- apagado, no le toca, nada que contar o tiene una ancla. Una fecha que ya pasó se dice como la
-- próxima corrida (`p_proxima`): es cuando de verdad se va.
create or replace function public._limpieza_fecha(v public.vehiculos, p_ahora timestamptz, p_proxima date)
returns date language plpgsql stable security definer set search_path = '' as $$
declare vence date;
begin
  if not (select e.limpieza_automatica from public.ajustes_empresa e where e.id = 1) then return null; end if;
  vence := public._limpieza_vence(v, p_ahora);
  if vence is null or public._limpieza_ancla(v) is not null then return null; end if;
  return greatest(vence, p_proxima);
end;
$$;
revoke all on function public._limpieza_fecha(public.vehiculos, timestamptz, date) from public, anon, authenticated;

-- Columna calculada de `vehiculos` para PostgREST (`select limpieza_el`, `.lte('limpieza_el', …)`):
-- la misma regla con la hora de ahora. Corre con los derechos de la base porque mira anclas que
-- quien pregunta quizá no lee (pagos, documentos); sólo devuelve una fecha, y de un vehículo que la
-- RLS de `vehiculos` ya le dejó ver.
create or replace function public.limpieza_el(v public.vehiculos)
returns date language sql stable security definer set search_path = '' as $$
  select public._limpieza_fecha(v, now(), public._limpieza_proxima(now()));
$$;
revoke all on function public.limpieza_el(public.vehiculos) from public, anon;
grant execute on function public.limpieza_el(public.vehiculos) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- La ficha: qué decir de un vehículo
-- ---------------------------------------------------------------------------
-- Nulo = no existe, está en la papelera o quien llama no lo ve (se dicen igual).
create or replace function public.vehiculo_limpieza(p_vehiculo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v public.vehiculos; a public.ajustes_empresa; c public.vehiculos_conservados; v_nombre text;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null;
  if not found or not public.puede_vehiculo(v.id, 'vehiculos.ver') then
    return null;
  end if;
  if not public._limpieza_aplica(v) then
    return jsonb_build_object('aplica', false);
  end if;
  select * into a from public.ajustes_empresa e where e.id = 1;
  select * into c from public.vehiculos_conservados x where x.vehiculo_id = v.id;
  if found and c.conservado_por is not null then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = c.conservado_por;
  end if;
  return jsonb_build_object(
    'aplica', true,
    'activa', a.limpieza_automatica,
    'dias_gracia', a.limpieza_dias_gracia,
    'fecha', public.limpieza_el(v),
    'conservado', c.vehiculo_id is not null,
    'conservado_por_nombre', v_nombre,
    'conservado_en', c.conservado_en,
    'conservado_por_mi', c.conservado_por is not distinct from (select auth.uid()) and c.vehiculo_id is not null);
end;
$$;
revoke all on function public.vehiculo_limpieza(uuid) from public, anon;
grant execute on function public.vehiculo_limpieza(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Conservar
-- ---------------------------------------------------------------------------
-- Manda el estado deseado (no alterna): repetirlo no cambia nada, así que no lleva la versión de
-- la ficha ni la mueve. La marca es de otra tabla. Quien puede editar el vehículo la pone y la saca.
create or replace function public.vehiculo_conservar(p_vehiculo uuid, p_conservar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_filas int := 0; c public.vehiculos_conservados;
begin
  perform public.assert_activo();
  if p_conservar is null then
    raise exception 'Falta decir si se conserva o no.' using errcode = '22023';
  end if;
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if not v.importado_apibara then
    raise exception 'Sólo se conserva un vehículo importado de una subasta: los demás no se limpian.' using errcode = '22023';
  end if;
  if p_conservar then
    insert into public.vehiculos_conservados (vehiculo_id, conservado_por) values (v.id, (select auth.uid()))
    on conflict (vehiculo_id) do nothing;
    get diagnostics v_filas = row_count;
  else
    delete from public.vehiculos_conservados x where x.vehiculo_id = v.id;
    get diagnostics v_filas = row_count;
  end if;
  if v_filas > 0 then
    perform public.registrar_actividad(
      case when p_conservar then 'vehiculo.conservado' else 'vehiculo.conservar_quitado' end,
      'vehiculos_conservados', v.id::text, null, null, jsonb_build_object('vehiculo', v.id));
  end if;
  select * into c from public.vehiculos_conservados x where x.vehiculo_id = v.id;
  return jsonb_build_object('conservado', c.vehiculo_id is not null, 'conservado_en', c.conservado_en);
end;
$$;
revoke all on function public.vehiculo_conservar(uuid, boolean) from public, anon;
grant execute on function public.vehiculo_conservar(uuid, boolean) to authenticated;

-- Restaurar un vehículo que se llevó la limpieza lo deja marcado «Conservar»: si no, volvería a
-- irse esa misma noche (su subasta sigue terminada). Un trigger y no un cambio en la restauración:
-- la puerta de siempre queda como estaba.
create or replace function public._vehiculo_restaurado_de_limpieza()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.eliminado_en is not null and new.eliminado_en is null and old.lote_papelera_id is not null
     and exists (select 1 from public.lotes_papelera l where l.id = old.lote_papelera_id and l.es_limpieza) then
    insert into public.vehiculos_conservados (vehiculo_id, conservado_por) values (new.id, (select auth.uid()))
    on conflict (vehiculo_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public._vehiculo_restaurado_de_limpieza() from public, anon, authenticated;
drop trigger if exists trg_vehiculo_restaurado_de_limpieza on public.vehiculos;
create trigger trg_vehiculo_restaurado_de_limpieza after update of eliminado_en on public.vehiculos
  for each row when (old.eliminado_en is not null and new.eliminado_en is null)
  execute function public._vehiculo_restaurado_de_limpieza();

-- ---------------------------------------------------------------------------
-- Mandar a un lote: lo que comparten la papelera manual y la limpieza
-- ---------------------------------------------------------------------------
-- El movimiento en sí, ya decidido y con la fila bloqueada: sale de `_vehiculo_a_papelera`, que
-- ahora lo llama. Lo publicado se despublica (conserva su precio); sus cotizaciones viajan con él.
create or replace function public._vehiculo_a_lote(v public.vehiculos, p_lote uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.vehiculos x
  set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = p_lote, publicado_web = false, destacado_web = false
  where x.id = v.id;
  update public.cotizaciones c
  set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = p_lote
  where c.vehiculo_id = v.id and c.eliminado_en is null;
  return jsonb_build_object('id', v.id, 'titulo', v.titulo, 'despublicado', v.publicado_web);
end;
$$;
revoke all on function public._vehiculo_a_lote(public.vehiculos, uuid) from public, anon, authenticated;

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
  return public._vehiculo_a_lote(v, p_lote);
end;
$$;
revoke all on function public._vehiculo_a_papelera(uuid, timestamptz, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La papelera dice cuándo el lote lo armó la limpieza
-- ---------------------------------------------------------------------------
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
      'es_limpieza', l.es_limpieza,
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
-- El job
-- ---------------------------------------------------------------------------
-- Corre cada hora (el cron es en UTC y la madrugada es de la empresa) y actúa a lo sumo una vez
-- por día local, desde las 03:00. Sin sesión: sólo service_role y el cron. `p_ahora` se inyecta
-- para las pruebas. Con `p_origenes` la corrida es parcial (pruebas): no espera la hora, no tapa a
-- la de verdad y deja su propia fila.
--
-- Vuelve a decidir cada vehículo con la fila bloqueada (`for update skip locked`): si alguien lo
-- está editando, se salta y queda para la noche siguiente; si ganó el job, quien edita recibe el
-- PT409 de siempre («ya no existe o está en la papelera»). Mueve hasta 200 (el tope de un lote de
-- papelera); lo que sobra queda en `pendientes`.
create or replace function public.limpieza_automatica_correr(p_ahora timestamptz default now(), p_origenes uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.ajustes_empresa; v public.vehiculos; r record;
  v_hoy date; v_corrida uuid; v_lote uuid; v_ancla text;
  v_parcial boolean := p_origenes is not null;
  v_tope constant int := 200;
  v_movidos int := 0; v_pendientes int := 0; v_saltados jsonb := '{}'::jsonb;
begin
  select * into a from public.ajustes_empresa e where e.id = 1;
  if not a.limpieza_automatica then
    return jsonb_build_object('estado', 'apagada');
  end if;
  v_hoy := (p_ahora at time zone a.zona_horaria)::date;

  if v_parcial then
    insert into public.limpieza_corridas (fecha, parcial) values (v_hoy, true) returning id into v_corrida;
  else
    if (p_ahora at time zone a.zona_horaria)::time < make_time(public._limpieza_hora(), 0, 0) then
      return jsonb_build_object('estado', 'temprano');
    end if;
    -- La corrida del día se reserva antes de mover nada: dos a la vez no duplican lotes.
    insert into public.limpieza_corridas (fecha, parcial) values (v_hoy, false)
    on conflict (fecha) where not parcial do nothing returning id into v_corrida;
    if v_corrida is null then
      return jsonb_build_object('estado', 'ya_corrio', 'fecha', v_hoy);
    end if;
  end if;

  for r in
    select x.id from public.vehiculos x join public.origenes o on o.id = x.origen_id
    where x.eliminado_en is null and x.importado_apibara and o.tipo = 'subasta'
      and (p_origenes is null or x.origen_id = any (p_origenes))
      and (x.subasta_en is not null or x.subasta_fin_en is not null or x.estado_subasta in ('terminada', 'vendida'))
    order by coalesce(x.subasta_fin_en, x.subasta_en, x.apibara_sync_en), x.id
  loop
    begin
      select * into v from public.vehiculos x where x.id = r.id and x.eliminado_en is null for update skip locked;
      if not found then
        v_saltados := v_saltados || jsonb_build_object('ocupado', coalesce((v_saltados ->> 'ocupado')::int, 0) + 1);
        continue;
      end if;
      -- Se decide de nuevo, con la fila ya bloqueada. Todavía no le toca: no es de esta corrida.
      if public._limpieza_vence(v, p_ahora) is null or public._limpieza_vence(v, p_ahora) > v_hoy then
        continue;
      end if;
      v_ancla := public._limpieza_ancla(v);
      if v_ancla is not null then
        v_saltados := v_saltados || jsonb_build_object(v_ancla, coalesce((v_saltados ->> v_ancla)::int, 0) + 1);
        continue;
      end if;
      if v_movidos >= v_tope then
        v_pendientes := v_pendientes + 1;
        continue;
      end if;
      if v_lote is null then
        insert into public.lotes_papelera (tipo, creado_por, es_limpieza, resumen)
        values ('vehiculos', null, true, jsonb_build_object('cantidad', 0, 'restaurados', 0, 'purgados', 0))
        returning id into v_lote;
      end if;
      perform public._vehiculo_a_lote(v, v_lote);
      v_movidos := v_movidos + 1;
    exception when others then
      raise warning 'limpieza: no se pudo mover el vehículo %: %', r.id, sqlerrm;
      v_saltados := v_saltados || jsonb_build_object('error', coalesce((v_saltados ->> 'error')::int, 0) + 1);
    end;
  end loop;

  if v_lote is not null then
    update public.lotes_papelera l set resumen = jsonb_build_object('cantidad', v_movidos, 'restaurados', 0, 'purgados', 0)
    where l.id = v_lote;
    perform public._lote_papelera_tocar(v_lote);
  end if;
  update public.limpieza_corridas c
  set lote_id = v_lote, movidos = v_movidos, saltados = v_saltados, pendientes = v_pendientes, termino_en = clock_timestamp()
  where c.id = v_corrida;
  perform public.registrar_actividad('limpieza.corrida', 'limpieza_corridas', v_corrida::text, null, null,
    jsonb_build_object('fecha', v_hoy, 'movidos', v_movidos, 'saltados', v_saltados, 'pendientes', v_pendientes,
      'lote', v_lote, 'parcial', v_parcial));
  return jsonb_build_object('estado', 'corrida', 'corrida', v_corrida, 'fecha', v_hoy, 'lote', v_lote,
    'movidos', v_movidos, 'saltados', v_saltados, 'pendientes', v_pendientes);
end;
$$;
revoke all on function public.limpieza_automatica_correr(timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.limpieza_automatica_correr(timestamptz, uuid[]) to service_role;

-- Lo que la pantalla de la papelera dice de la última noche: sólo para quien puede vaciarla.
create or replace function public.limpieza_ultima()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.limpieza_corridas;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('vehiculos.papelera.purgar') then
    return null;
  end if;
  select * into r from public.limpieza_corridas c where not c.parcial order by c.fecha desc limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object('fecha', r.fecha, 'movidos', r.movidos, 'saltados', r.saltados,
    'pendientes', r.pendientes, 'termino_en', r.termino_en);
end;
$$;
revoke all on function public.limpieza_ultima() from public, anon;
grant execute on function public.limpieza_ultima() to authenticated;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise exception 'pg_cron no está disponible: la limpieza automática no correría nunca.';
  end if;
  perform cron.schedule('limpieza-automatica', '7 * * * *', 'select public.limpieza_automatica_correr()');
end $$;
