-- Importar todo (9.06-1, parte 1 de 5): la base de la importación total de `/datos`. Columnas de destino y de avance en `importaciones`, la tabla
-- `importaciones_filas` (el informe por fila: lo que no entró, sin datos de nadie) y `importacion_crear()`, que es el enforcement de
-- `datos.importar.todo` al crear: importar para otra persona pide ese permiso y que el destino esté activo y pueda crear leads. Procesar los lotes
-- (sólo `service_role`) va en la migración siguiente; el job que continúa y la función edge, en las partes 2 y 3.

-- Columnas de la importación total. Las filas de `/leads` las dejan en su valor por defecto.
alter table public.importaciones
  add column asignar_a uuid null references public.perfiles (id) on delete set null,
  add column con_destino boolean not null default false,
  add column origen_id uuid null references public.origenes (id) on delete set null,
  add column procesadas integer not null default 0,
  add column ya_existian integer not null default 0,
  add column rechazadas integer not null default 0,
  add column avance_en timestamptz null,
  add constraint importaciones_procesadas_check check (procesadas >= 0 and (filas_total is null or procesadas <= filas_total)),
  add constraint importaciones_cuentas_check check (ya_existian >= 0 and rechazadas >= 0),
  add constraint importaciones_asignar_a_check check (asignar_a is null or entidad = 'leads'),
  add constraint importaciones_con_destino_check check (not con_destino or entidad = 'leads'),
  add constraint importaciones_origen_id_check check (origen_id is null or entidad = 'vehiculos');

create index importaciones_asignar_a_idx on public.importaciones using btree (asignar_a);
create index importaciones_origen_id_idx on public.importaciones using btree (origen_id);

comment on column public.importaciones.asignar_a is
  'Importación total de leads (9.06): la persona de destino, que crea los leads y los recibe en su cartera. Nulo = quien importa.';
comment on column public.importaciones.con_destino is
  'Verdadero si se creó para otra persona. Si su perfil se borra (asignar_a queda nulo), la importación pasa a fallida: nunca cambia de dueño en silencio.';
comment on column public.importaciones.origen_id is 'Importación total de vehículos (9.06): el origen de todas sus filas.';
comment on column public.importaciones.procesadas is
  'Marca de agua: la última fila procesada (las filas 1..procesadas ya tienen su resultado). Un lote que la repite se salta.';
comment on column public.importaciones.ya_existian is 'Filas que ya existían (un teléfono, un VIN o un lote repetido).';
comment on column public.importaciones.rechazadas is 'Filas con error (validación o una regla de la base).';
comment on column public.importaciones.avance_en is 'Último avance de la importación total; el job de continuar busca las detenidas.';

-- El informe por fila: sólo lo que no entró, con su campo y su motivo. Ni datos del archivo ni de nadie.
create table public.importaciones_filas (
  importacion_id uuid not null references public.importaciones (id) on delete cascade,
  fila integer not null check (fila > 0),
  resultado text not null check (resultado in ('ya_existe', 'error')),
  campo text null check (char_length(campo) <= 120),
  motivo text null check (char_length(motivo) <= 500),
  creado_en timestamptz not null default now(),
  primary key (importacion_id, fila)
);

comment on table public.importaciones_filas is
  'Las filas de una importación total que no entraron (ya_existe o error), con su campo y su motivo, para «Descargar las rechazadas». Las escriben sólo las RPC de importación; se lee con la regla de importaciones.';

alter table public.importaciones_filas enable row level security;
revoke all on table public.importaciones_filas from anon, authenticated;
grant select on table public.importaciones_filas to authenticated;
grant all on table public.importaciones_filas to service_role;

create policy "importaciones_filas: leer" on public.importaciones_filas for select to authenticated using (
  exists (
    select 1 from public.importaciones i
     where i.id = importaciones_filas.importacion_id
       and (i.usuario_id = (select auth.uid()) or (select public.tiene_permiso('datos.importar.todo')))
  )
);

-- Crear una importación total, en `pendiente`. Idempotente por id. La procesa la función edge `importar-csv` (9.06-3) a nombre de quien importa.
create or replace function public.importacion_crear(p_id uuid, p_entidad text, p_archivo_ruta text, p_mapeo jsonb,
  p_asignar_a uuid default null, p_origen uuid default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_prev public.importaciones;
  v_destino uuid;
  v_con_destino boolean := false;
  v_ruta text := btrim(coalesce(p_archivo_ruta, ''));
  v_k text;
  v_tipo text;
  v_n integer := 0;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;

  -- Un reintento con el mismo id devuelve lo mismo; una importación ajena o de `/leads` no se nombra.
  select * into v_prev from public.importaciones i where i.id = p_id;
  if found then
    if v_prev.usuario_id is distinct from v_yo or v_prev.archivo_ruta is null then
      raise exception 'No encontramos esta importación.' using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_prev.id, 'estado', v_prev.estado, 'repetido', true);
  end if;

  if p_entidad is null or p_entidad not in ('leads', 'vehiculos') then
    raise exception 'Sólo se importan leads o vehículos.' using errcode = '22023', hint = 'entidad';
  end if;

  -- La ruta, en la carpeta de quien importa (la misma regla que la policy del bucket `importaciones`).
  if v_ruta = '' or char_length(v_ruta) > 500 or split_part(v_ruta, '/', 1) <> v_yo::text
     or strpos(v_ruta, '..') > 0 or strpos(v_ruta, '//') > 0 or lower(v_ruta) !~ '\.(csv|txt)$' then
    raise exception 'El archivo tiene que estar en tu carpeta y ser .csv o .txt.' using errcode = '22023', hint = 'archivo_ruta';
  end if;

  -- El mapeo: columna del archivo → campo (o nulo). Qué campo es cada uno lo valida la función edge contra la plantilla.
  if p_mapeo is null or jsonb_typeof(p_mapeo) <> 'object' then
    raise exception 'El emparejamiento de columnas no tiene la forma esperada.' using errcode = '22023', hint = 'mapeo';
  end if;
  for v_k in select jsonb_object_keys(p_mapeo) loop
    v_n := v_n + 1;
    v_tipo := jsonb_typeof(p_mapeo -> v_k);
    if v_tipo not in ('string', 'null') or (v_tipo = 'string' and char_length(p_mapeo ->> v_k) > 120) or char_length(v_k) > 120 then
      raise exception 'El emparejamiento de columnas no tiene la forma esperada.' using errcode = '22023', hint = 'mapeo';
    end if;
  end loop;
  if v_n not between 1 and 200 then
    raise exception 'El emparejamiento lleva de 1 a 200 columnas.' using errcode = '22023', hint = 'mapeo';
  end if;

  if p_entidad = 'leads' then
    if p_origen is not null then
      raise exception 'Una importación de leads no lleva origen.' using errcode = '22023', hint = 'origen';
    end if;
    v_destino := coalesce(p_asignar_a, v_yo);
    if v_destino = v_yo then
      perform public.assert_permiso('leads.crear');
      v_destino := null;
    else
      perform public.assert_permiso('datos.importar.todo');
      if not exists (select 1 from public.perfiles p where p.id = v_destino and p.activo and not p.bloqueado)
         or not public.usuario_tiene_permiso(v_destino, 'leads.crear') then
        raise exception 'Esa persona no puede recibir leads: está inactiva o no tiene el permiso de crear leads.'
          using errcode = '22023', hint = 'asignar_a';
      end if;
      v_con_destino := true;
    end if;
  else
    if p_asignar_a is not null then
      raise exception 'Una importación de vehículos no se asigna a nadie.' using errcode = '22023', hint = 'asignar_a';
    end if;
    if p_origen is null or not exists (select 1 from public.origenes o where o.id = p_origen and o.activo) then
      raise exception 'Elige un origen activo para los vehículos.' using errcode = '22023', hint = 'origen';
    end if;
    perform public.assert_permiso('vehiculos.crear', p_origen);
  end if;

  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, mapeo, estado, asignar_a, con_destino, origen_id)
  values (p_id, v_yo, p_entidad, v_ruta, p_mapeo, 'pendiente', v_destino, v_con_destino, case when p_entidad = 'vehiculos' then p_origen end);
  return jsonb_build_object('id', p_id, 'estado', 'pendiente', 'repetido', false);
end;
$$;

comment on function public.importacion_crear(uuid, text, text, jsonb, uuid, uuid) is
  'Importación total (9.06): crea la importación en pendiente, idempotente por id. Leads: para sí misma pide leads.crear; para otra persona, datos.importar.todo y que el destino esté activo y tenga leads.crear. Vehículos: un origen activo y vehiculos.crear de ese origen. La ruta va en la carpeta de quien importa.';

revoke all on function public.importacion_crear(uuid, text, text, jsonb, uuid, uuid) from public, anon;
grant execute on function public.importacion_crear(uuid, text, text, jsonb, uuid, uuid) to authenticated, service_role;

-- El permiso gana enforcement en funciones (catálogo: la nube no vuelve a correr el seed).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('datos.importar.todo', 'datos', 'Importar para todos', 'Importar datos asignándolos a cualquiera', false, false,
        'importacion_crear, _importacion_autorizar, policy importaciones', 680)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
