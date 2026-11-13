-- Importar todo (9.06-2, parte 2 de 5): los pases de la importación total. La función edge `importar-csv` (9.06-3) no recibe un id ni una
-- sesión: recibe un pase de un solo uso que la base emitió para una importación ya autorizada por `importacion_crear()`, y lo canjea con
-- `importacion_abrir()` por el id. Lo emite quien la creó (`importacion_pase_emitir`, desde la acción de 9.06-4) o el job que retoma las
-- detenidas (migración siguiente). El patrón es el de `cola_gc_pases` / `storage_gc_abrir`. Más los índices de la lista «Importaciones»
-- (9.06-5) y el de las importaciones en curso que mira el job.

create table public.importaciones_pases (
  pase uuid primary key default gen_random_uuid(),
  importacion_id uuid not null references public.importaciones (id) on delete cascade,
  creado_en timestamptz not null default now(),
  usado_en timestamptz null
);

comment on table public.importaciones_pases is
  'Pases de un solo uso de la importación total (9.06): importacion_pase_emitir() o el job importaciones-continuar crean uno, la función '
  'importar-csv lo canjea con importacion_abrir() por el id de la importación (vale 10 minutos). Sólo service_role.';

-- La fk y el «pase reciente» de una importación (el reuso de importacion_pase_emitir y el `not exists` del job).
create index importaciones_pases_importacion_idx on public.importaciones_pases using btree (importacion_id, creado_en desc);

alter table public.importaciones_pases enable row level security;
revoke all on table public.importaciones_pases from anon, authenticated;
grant all on table public.importaciones_pases to service_role;

-- La lista «Importaciones» de `/datos` (9.06-5) por cursor: las propias, y todas para quien tiene `datos.importar.todo`. Sólo las totales
-- (`archivo_ruta`): las de `/leads` tienen su panel.
create index importaciones_lista_propia_idx on public.importaciones using btree (usuario_id, creado_en desc, id desc)
  where archivo_ruta is not null;
create index importaciones_lista_idx on public.importaciones using btree (creado_en desc, id desc) where archivo_ruta is not null;
-- Las totales en curso, por su último avance: lo que filtra y ordena el job importaciones-continuar.
create index importaciones_en_curso_idx on public.importaciones using btree ((coalesce(avance_en, creado_en)), id)
  where archivo_ruta is not null and estado in ('pendiente', 'procesando');

-- Quien creó la importación total pide un pase para despertar la función. Sólo la propia (nunca la regla de lectura con
-- `datos.importar.todo`: ver una importación ajena no da poder para procesarla) y sólo una total. Si ya tiene un pase sin usar de los
-- últimos 5 minutos, devuelve ése: llamarla en bucle no llena la tabla.
create or replace function public.importacion_pase_emitir(p_importacion uuid) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_imp public.importaciones;
  v_pase uuid;
begin
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  select * into v_imp from public.importaciones i where i.id = p_importacion;
  if not found or v_imp.usuario_id is distinct from v_yo or v_imp.archivo_ruta is null then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_imp.estado in ('terminada', 'fallida') then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;
  -- Sobre importaciones_pases_importacion_idx.
  select p.pase into v_pase from public.importaciones_pases p
  where p.importacion_id = p_importacion and p.usado_en is null and p.creado_en > now() - interval '5 minutes'
  order by p.creado_en desc limit 1;
  if v_pase is null then
    insert into public.importaciones_pases (importacion_id) values (p_importacion) returning pase into v_pase;
  end if;
  return v_pase;
end;
$$;

comment on function public.importacion_pase_emitir(uuid) is
  'Un pase de un solo uso para la importación total propia (pendiente o procesando); devuelve el vivo si hay uno de los últimos 5 minutos. '
  'La acción de /datos se lo manda a la función importar-csv. Ajena, inexistente o de /leads: 42501.';
revoke all on function public.importacion_pase_emitir(uuid) from public, anon;
grant execute on function public.importacion_pase_emitir(uuid) to authenticated, service_role;

-- La función edge canjea el pase: un uso, 10 minutos. Devuelve el id de la importación o null.
create or replace function public.importacion_abrir(p_pase uuid) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid;
begin
  update public.importaciones_pases p set usado_en = now()
  where p.pase = p_pase and p.usado_en is null and p.creado_en > now() - interval '10 minutes'
  returning p.importacion_id into v_id;
  return v_id;
end;
$$;

comment on function public.importacion_abrir(uuid) is
  'La función importar-csv canjea un pase (un uso, 10 minutos) por el id de su importación; null si no vale. Sólo service_role.';
revoke all on function public.importacion_abrir(uuid) from public, anon, authenticated;
grant execute on function public.importacion_abrir(uuid) to service_role;
