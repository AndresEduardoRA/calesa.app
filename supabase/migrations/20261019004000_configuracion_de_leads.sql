-- Configuración de leads: los tipos de seguimiento con pantalla, un icono para el origen y el tipo del lead y para el tipo de
-- seguimiento, y un origen del lead «por defecto» de la empresa.
--
--  1. Un catálogo CERRADO de iconos (`_iconos_del_catalogo()`, 24 claves genéricas). Se guarda la clave, nunca un nombre libre ni
--     un SVG; la base sólo la acepta si está en el catálogo (las RPC), y una clave que ya no estuviera se dibuja como un icono
--     neutro (la interfaz). Los nombres de lucide que guardaba `tipos_seguimiento.icono` pasan a su clave del catálogo; lo
--     desconocido queda sin icono (nada se pierde: la fila sigue).
--  2. `tipos_seguimiento` se escribe sólo por RPC (`tipo_seguimiento_crear|guardar|mover|eliminar`, `tipos_seguimiento_con_uso`)
--     con `leads.configurar`, versión y `PT409`, como los orígenes y los tipos de lead. Tope de 100 (activos e inactivos), de un
--     solo punto (`_tipos_seguimiento_tope()`). Uno con seguimientos no se elimina, se desactiva. Ninguno es «de sistema»: el
--     código no razona por la clave ni el nombre de un tipo de seguimiento (`docs/DECISIONES.md`, Configuración de leads).
--     Un seguimiento no guarda un tipo apagado aunque la desactivación llegue a la vez (`seguimiento_tipo_vigente`, `for share`).
--  3. El origen «por defecto»: `origenes_lead.por_defecto`, uno solo y siempre activo, impuesto por un índice único parcial y un
--     `check` (vale para quien sea que escriba la tabla). Se marca con `origen_lead_guardar({por_defecto})`, que desmarca al
--     anterior; apagar o eliminar el que lo es se rechaza con el motivo.
--  4. `lead_alta_contexto()` pide cada catálogo acotado a su tope y lo dice (`topes`): cierra 5b-5. Deja de mandar `clave` e `icono`
--     (el alta dibuja `<select>`: no los usa; la importación toma las claves de `leads_catalogos()`) y suma `origen_por_defecto_id`.
--  5. `leads_catalogos()` suma el icono de cada origen y tipo: el listado, la ficha y el rápido lo dibujan junto al nombre.

-- ---------------------------------------------------------------------------
-- El catálogo de iconos y los topes (un solo punto cada uno)
-- ---------------------------------------------------------------------------
-- La lista es la de `src/shared/lib/iconos.ts`: una guarda de `pnpm test` las compara.
create or replace function public._iconos_del_catalogo()
returns text[] language sql immutable set search_path = '' as $$
  select array['telefono', 'celular', 'mensaje', 'correo', 'video', 'persona', 'personas', 'trato', 'ubicacion', 'tienda',
               'oficina', 'web', 'enlace', 'compartir', 'megafono', 'estrella', 'etiqueta', 'calendario', 'nota', 'documento',
               'auto', 'barco', 'casa', 'otro'];
$$;
revoke all on function public._iconos_del_catalogo() from public, anon, authenticated;

-- Lo que una RPC recibe como icono: nulo o vacío es «sin icono»; una clave fuera del catálogo se rechaza junto al campo.
create or replace function public._icono_del_catalogo(p_icono text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_icono is null or btrim(p_icono) = '' then
    return null;
  end if;
  if p_icono <> all (public._iconos_del_catalogo()) then
    raise exception 'Ese icono no está en el catálogo: elige uno de la lista o déjalo sin icono.' using errcode = '22023', hint = 'icono';
  end if;
  return p_icono;
end;
$$;
revoke all on function public._icono_del_catalogo(text) from public, anon, authenticated;

create or replace function public._origenes_lead_tope()
returns integer language sql immutable set search_path = '' as $$ select 100; $$;
revoke all on function public._origenes_lead_tope() from public, anon, authenticated;

create or replace function public._tipos_seguimiento_tope()
returns integer language sql immutable set search_path = '' as $$ select 100; $$;
revoke all on function public._tipos_seguimiento_tope() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Columnas (las del estado final viven en `schemas/05_leads/01_leads.sql`; acá, `if not exists` para una base ya aplicada)
-- ---------------------------------------------------------------------------
alter table public.origenes_lead add column if not exists icono text;
alter table public.origenes_lead add column if not exists por_defecto boolean not null default false;
alter table public.tipos_lead add column if not exists icono text;
alter table public.tipos_seguimiento add column if not exists creado_en timestamptz not null default now();
alter table public.tipos_seguimiento add column if not exists actualizado_en timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'origenes_lead_por_defecto_activo' and conrelid = 'public.origenes_lead'::regclass) then
    alter table public.origenes_lead add constraint origenes_lead_por_defecto_activo check (not por_defecto or activo);
  end if;
end $$;
create unique index if not exists origenes_lead_por_defecto_unico on public.origenes_lead (por_defecto) where por_defecto;

-- ---------------------------------------------------------------------------
-- Datos de una base viva (antes de reemplazar los triggers: así no mueven versiones ni dejan constancias)
-- ---------------------------------------------------------------------------
-- Los nombres de lucide pasan a la clave del catálogo; lo que no se reconoce queda sin icono (la fila se conserva).
do $$
declare v_sin integer;
begin
  select count(*) into v_sin from public.tipos_seguimiento t
   where t.icono is not null and t.icono not in ('message-circle', 'phone', 'users', 'mail', 'map-pin', 'sticky-note', 'more-horizontal')
     and t.icono <> all (public._iconos_del_catalogo());
  update public.tipos_seguimiento t
     set icono = case t.icono
                   when 'message-circle' then 'mensaje' when 'phone' then 'telefono' when 'users' then 'personas'
                   when 'mail' then 'correo' when 'map-pin' then 'ubicacion' when 'sticky-note' then 'nota'
                   when 'more-horizontal' then 'otro'
                   else case when t.icono = any (public._iconos_del_catalogo()) then t.icono end
                 end
   where t.icono is not null;
  if v_sin > 0 then
    raise notice 'tipos_seguimiento: % icono(s) fuera del catálogo quedaron sin icono.', v_sin;
  end if;
end $$;

update public.tipos_lead set icono = case clave when 'prospecto' then 'persona' when 'cliente' then 'trato' end
 where icono is null and clave in ('prospecto', 'cliente');

-- Un nombre por tipo de seguimiento, sin importar mayúsculas: los repetidos de una base viva se distinguen con un número.
update public.tipos_seguimiento t set nombre = t.nombre || ' ' || d.n
  from (select x.id, row_number() over (partition by lower(btrim(x.nombre)) order by x.orden, x.id) as n from public.tipos_seguimiento x) d
 where d.id = t.id and d.n > 1;
create unique index if not exists tipos_seguimiento_nombre_unico on public.tipos_seguimiento (lower(btrim(nombre)));

-- El orden pasa a 10, 20, 30…: así «después de X» siempre tiene lugar (como los orígenes y los tipos de lead).
update public.tipos_seguimiento t set orden = n.o
  from (select x.id, (row_number() over (order by x.orden, x.nombre) * 10)::smallint as o from public.tipos_seguimiento x) n
 where n.id = t.id and t.orden <> n.o;

-- ---------------------------------------------------------------------------
-- tipos_seguimiento: sólo lectura para la app
-- ---------------------------------------------------------------------------
drop policy if exists "tipos_seguimiento: crear" on public.tipos_seguimiento;
drop policy if exists "tipos_seguimiento: editar" on public.tipos_seguimiento;
drop policy if exists "tipos_seguimiento: borrar" on public.tipos_seguimiento;
revoke insert, update, delete on table public.tipos_seguimiento from authenticated;

-- ---------------------------------------------------------------------------
-- Versión y auditoría (el icono es de lo que se edita; el orden y el «por defecto» no mueven la versión)
-- ---------------------------------------------------------------------------
create or replace function public.origen_lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.activo, new.icono) is distinct from (old.nombre, old.activo, old.icono) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

create or replace function public.tipo_lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.activo, new.icono) is distinct from (old.nombre, old.activo, old.icono) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

create or replace function public.tipo_seguimiento_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.activo, new.icono) is distinct from (old.nombre, old.activo, old.icono) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.tipo_seguimiento_version() from public, anon, authenticated;
drop trigger if exists trg_tipo_seguimiento_version on public.tipos_seguimiento;
create trigger trg_tipo_seguimiento_version before update on public.tipos_seguimiento
  for each row execute function public.tipo_seguimiento_version();

create or replace function public.tipo_seguimiento_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.actualizado_en is not distinct from old.actualizado_en then
    return null;
  end if;
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values ('tipos_seguimiento.' || lower(tg_op), (select auth.uid()), 'tipos_seguimiento', coalesce(new.id, old.id)::text,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end;
$$;
revoke all on function public.tipo_seguimiento_auditar() from public, anon, authenticated;
drop trigger if exists trg_tipo_seguimiento_auditar on public.tipos_seguimiento;
create trigger trg_tipo_seguimiento_auditar after insert or update or delete on public.tipos_seguimiento
  for each row execute function public.tipo_seguimiento_auditar();

-- ---------------------------------------------------------------------------
-- Un seguimiento no guarda un tipo apagado
-- ---------------------------------------------------------------------------
-- Lo que ya tiene un seguimiento no se toca (el tipo apagado que conserva): sólo cuenta cuando el tipo entra o cambia. `for share`
-- choca con el `update` de desactivar: o la desactivación espera a que el seguimiento termine, o éste ve el tipo ya apagado y falla.
create or replace function public.seguimiento_tipo_vigente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_activo boolean;
begin
  if tg_op = 'UPDATE' and new.tipo_id is not distinct from old.tipo_id then
    return new;
  end if;
  select t.activo into v_activo from public.tipos_seguimiento t where t.id = new.tipo_id for share;
  if not found then
    raise exception 'Ese tipo de seguimiento ya no existe: elige otro.' using errcode = '22023', hint = 'tipo_id';
  end if;
  if not v_activo then
    raise exception 'Ese tipo de seguimiento se desactivó: elige otro.' using errcode = '22023', hint = 'tipo_id';
  end if;
  return new;
end;
$$;
revoke all on function public.seguimiento_tipo_vigente() from public, anon, authenticated;
drop trigger if exists trg_seguimiento_tipo_vigente on public.seguimientos;
create trigger trg_seguimiento_tipo_vigente before insert or update of tipo_id on public.seguimientos
  for each row execute function public.seguimiento_tipo_vigente();

-- ---------------------------------------------------------------------------
-- Piezas internas de los tipos de seguimiento (el patrón de `…002900`)
-- ---------------------------------------------------------------------------
create or replace function public._tipo_seguimiento_nombre(p_texto text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del tipo de seguimiento.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del tipo de seguimiento admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._tipo_seguimiento_nombre(text) from public, anon, authenticated;

create or replace function public._tipo_seguimiento_clave(p_nombre text)
returns text language plpgsql stable set search_path = '' as $$
declare v text; v_base text; n int := 1;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v !~ '^[a-z]' then
    v := 's_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    v := 'seguimiento';
  end if;
  v_base := v;
  while exists (select 1 from public.tipos_seguimiento t where t.clave = v) loop
    n := n + 1;
    v := left(v_base, 30 - char_length(n::text) - 1) || '_' || n;
  end loop;
  return v;
end;
$$;
revoke all on function public._tipo_seguimiento_clave(text) from public, anon, authenticated;

-- La lista que devuelven todas las escrituras y `tipos_seguimiento_con_uso()`: hasta `_tipos_seguimiento_tope()` filas, cada una con
-- si algún seguimiento la usa (los eliminados también: la FK es `restrict`) por una sonda por rango sobre `seguimientos_tipo_idx`
-- (ver `…20261019000800_origen_lead_uso_por_indice.sql`), nunca un conteo.
create or replace function public._tipos_seguimiento_lista()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._tipos_seguimiento_tope(),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object(
           'id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'icono', t.icono, 'activo', t.activo, 'orden', t.orden,
           'actualizado_en', t.actualizado_en,
           'con_seguimientos', exists (select 1 from public.seguimientos s where s.tipo_id >= t.id and s.tipo_id <= t.id)
         ) order by t.orden, t.nombre) from (select x.* from public.tipos_seguimiento x order by x.orden, x.nombre
                                              limit public._tipos_seguimiento_tope()) t), '[]'::jsonb));
$$;
revoke all on function public._tipos_seguimiento_lista() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC de los tipos de seguimiento
-- ---------------------------------------------------------------------------
create or replace function public.tipos_seguimiento_con_uso()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.configurar');
  return public._tipos_seguimiento_lista();
end;
$$;
revoke all on function public.tipos_seguimiento_con_uso() from public, anon;
grant execute on function public.tipos_seguimiento_con_uso() to authenticated;

create or replace function public.tipo_seguimiento_crear(p_id uuid, p_nombre text, p_icono text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz; v_icono text; v_tope integer := public._tipos_seguimiento_tope();
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_seguimiento in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select t.actualizado_en into v_version from public.tipos_seguimiento t where t.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._tipos_seguimiento_lista());
  end if;
  v_nombre := public._tipo_seguimiento_nombre(p_nombre);
  v_icono := public._icono_del_catalogo(p_icono);
  if (select count(*) from (select 1 from public.tipos_seguimiento limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % tipos de seguimiento, que es el máximo. Elimina uno sin seguimientos o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.tipos_seguimiento t where lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo de seguimiento «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.tipos_seguimiento (id, clave, nombre, icono, orden)
  values (p_id, public._tipo_seguimiento_clave(v_nombre), v_nombre, v_icono,
          coalesce((select max(t.orden) + 10 from public.tipos_seguimiento t), 10))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false, 'lista', public._tipos_seguimiento_lista());
end;
$$;
revoke all on function public.tipo_seguimiento_crear(uuid, text, text) from public, anon;
grant execute on function public.tipo_seguimiento_crear(uuid, text, text) to authenticated;

-- Renombra, cambia el icono o activa/desactiva. Lo ya guardado no es un conflicto.
create or replace function public.tipo_seguimiento_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.tipos_seguimiento; v_k text; v_nombre text; v_activo boolean; v_icono text;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_seguimiento in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un tipo de seguimiento tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('nombre', 'activo', 'icono') then
      raise exception 'El dato «%» de un tipo de seguimiento no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.tipos_seguimiento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de seguimiento ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := o.nombre;
  v_activo := o.activo;
  v_icono := o.icono;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del tipo de seguimiento.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._tipo_seguimiento_nombre(p_cambios ->> 'nombre');
  end if;
  if p_cambios ? 'activo' then
    if jsonb_typeof(p_cambios -> 'activo') <> 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    v_activo := (p_cambios ->> 'activo')::boolean;
  end if;
  if p_cambios ? 'icono' then
    if jsonb_typeof(p_cambios -> 'icono') not in ('string', 'null') then
      raise exception 'El icono es una clave del catálogo o nada.' using errcode = '22023', hint = 'icono';
    end if;
    v_icono := public._icono_del_catalogo(p_cambios ->> 'icono');
  end if;

  if (v_nombre, v_activo, v_icono) is not distinct from (o.nombre, o.activo, o.icono) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true, 'lista', public._tipos_seguimiento_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de seguimiento mientras lo editabas.');
  if exists (select 1 from public.tipos_seguimiento x where x.id <> p_id and lower(btrim(x.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo de seguimiento «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.tipos_seguimiento x set nombre = v_nombre, activo = v_activo, icono = v_icono where x.id = p_id
  returning x.actualizado_en into o.actualizado_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', false, 'lista', public._tipos_seguimiento_lista());
end;
$$;
revoke all on function public.tipo_seguimiento_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tipo_seguimiento_guardar(uuid, timestamptz, jsonb) to authenticated;

create or replace function public.tipo_seguimiento_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tipos_seguimiento;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_seguimiento in share row exclusive mode;
  select * into o from public.tipos_seguimiento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de seguimiento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de seguimiento mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_id then
      raise exception 'Un tipo de seguimiento no puede ir después de sí mismo.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.tipos_seguimiento x where x.id = p_despues_de) then
      raise exception 'Ese tipo de seguimiento ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.tipos_seguimiento x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden)) from public.tipos_seguimiento y),
    p_id, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  perform public.registrar_actividad('tipos_seguimiento.movido', 'tipos_seguimiento', p_id::text, null, null,
    jsonb_build_object('nombre', o.nombre, 'despues_de', p_despues_de));
  return jsonb_build_object('id', p_id, 'actualizado_en', (select x.actualizado_en from public.tipos_seguimiento x where x.id = p_id),
                            'lista', public._tipos_seguimiento_lista());
end;
$$;
revoke all on function public.tipo_seguimiento_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.tipo_seguimiento_mover(uuid, timestamptz, uuid) to authenticated;

-- Sólo uno que ningún seguimiento usa (la FK es `restrict`). Con seguimientos se desactiva: sigue nombrando a los que ya lo tienen.
create or replace function public.tipo_seguimiento_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tipos_seguimiento; v_mensaje text;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_seguimiento in share row exclusive mode;
  select * into o from public.tipos_seguimiento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de seguimiento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de seguimiento mientras lo editabas.');
  v_mensaje := format('«%s» ya tiene seguimientos: no se elimina. Desactívalo para que no se ofrezca a los nuevos.', o.nombre);
  if exists (select 1 from public.seguimientos s where s.tipo_id >= p_id and s.tipo_id <= p_id) then
    raise exception '%', v_mensaje using errcode = '23503';
  end if;
  begin
    delete from public.tipos_seguimiento x where x.id = p_id;
  exception when foreign_key_violation then
    raise exception '%', v_mensaje using errcode = '23503';
  end;
  return jsonb_build_object('lista', public._tipos_seguimiento_lista());
end;
$$;
revoke all on function public.tipo_seguimiento_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.tipo_seguimiento_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Orígenes del lead: icono y «por defecto»
-- ---------------------------------------------------------------------------
create or replace function public._origenes_lead_json()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'clave', o.clave, 'nombre', o.nombre, 'icono', o.icono, 'activo', o.activo, 'por_defecto', o.por_defecto,
           'orden', o.orden, 'actualizado_en', o.actualizado_en,
           -- Sonda por rango sobre el índice de la FK (ver `…000800`): `= o.id` recorre `leads`.
           'con_leads', exists (select 1 from public.leads l where l.origen_lead_id >= o.id and l.origen_lead_id <= o.id)
         ) order by o.orden, o.nombre), '[]'::jsonb)
    from public.origenes_lead o;
$$;
revoke all on function public._origenes_lead_json() from public, anon, authenticated;

drop function if exists public.origen_lead_crear(uuid, text);
create or replace function public.origen_lead_crear(p_id uuid, p_nombre text, p_icono text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz; v_icono text; v_tope integer := public._origenes_lead_tope();
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.origenes_lead in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select o.actualizado_en into v_version from public.origenes_lead o where o.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true,
                              'origenes', public._origenes_lead_json());
  end if;
  v_nombre := public._origen_lead_nombre(p_nombre);
  v_icono := public._icono_del_catalogo(p_icono);
  if (select count(*) from (select 1 from public.origenes_lead limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % orígenes del lead, que es el máximo. Elimina uno sin leads o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.origenes_lead o where lower(btrim(o.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un origen «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.origenes_lead (id, clave, nombre, icono, orden)
  values (p_id, public._origen_lead_clave(v_nombre), v_nombre, v_icono,
          coalesce((select max(o.orden) + 10 from public.origenes_lead o), 10))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false,
                            'origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_crear(uuid, text, text) from public, anon;
grant execute on function public.origen_lead_crear(uuid, text, text) to authenticated;

-- Renombra, cambia el icono, activa/desactiva o lo marca «por defecto». `p_cambios` lleva `nombre`, `icono`, `activo` y/o `por_defecto`.
-- Marcarlo desmarca al anterior (uno solo, y el índice único lo asegura aunque alguien escriba sin esta RPC). El «por defecto» tiene
-- que estar activo: apagar el que lo es se rechaza (quítale la marca o elige otro antes), y marcar uno apagado también. Marcar o
-- desmarcar no mueve la versión (cambia otra fila como efecto, igual que reordenar) y deja su propia constancia.
create or replace function public.origen_lead_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.origenes_lead; v_k text; v_nombre text; v_activo boolean; v_icono text; v_defecto boolean;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.origenes_lead in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un origen tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('nombre', 'activo', 'icono', 'por_defecto') then
      raise exception 'El dato «%» de un origen no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.origenes_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese origen ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := o.nombre;
  v_activo := o.activo;
  v_icono := o.icono;
  v_defecto := o.por_defecto;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del origen.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._origen_lead_nombre(p_cambios ->> 'nombre');
  end if;
  if p_cambios ? 'activo' then
    if jsonb_typeof(p_cambios -> 'activo') <> 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    v_activo := (p_cambios ->> 'activo')::boolean;
  end if;
  if p_cambios ? 'icono' then
    if jsonb_typeof(p_cambios -> 'icono') not in ('string', 'null') then
      raise exception 'El icono es una clave del catálogo o nada.' using errcode = '22023', hint = 'icono';
    end if;
    v_icono := public._icono_del_catalogo(p_cambios ->> 'icono');
  end if;
  if p_cambios ? 'por_defecto' then
    if jsonb_typeof(p_cambios -> 'por_defecto') <> 'boolean' then
      raise exception 'Por defecto es sí o no.' using errcode = '22023', hint = 'por_defecto';
    end if;
    v_defecto := (p_cambios ->> 'por_defecto')::boolean;
  end if;

  if (v_nombre, v_activo, v_icono, v_defecto) is not distinct from (o.nombre, o.activo, o.icono, o.por_defecto) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true,
                              'origenes', public._origenes_lead_json());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');
  if v_defecto and not v_activo then
    if o.por_defecto then
      raise exception '«%» es el origen por defecto: quítale la marca o elige otro por defecto antes de desactivarlo.', o.nombre
        using errcode = '22023', hint = 'activo';
    end if;
    raise exception '«%» está desactivado: actívalo antes de elegirlo como origen por defecto.', o.nombre
      using errcode = '22023', hint = 'por_defecto';
  end if;
  if exists (select 1 from public.origenes_lead x where x.id <> p_id and lower(btrim(x.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un origen «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  if v_defecto and not o.por_defecto then
    update public.origenes_lead x set por_defecto = false where x.por_defecto and x.id <> p_id;
  end if;
  update public.origenes_lead x set nombre = v_nombre, activo = v_activo, icono = v_icono, por_defecto = v_defecto where x.id = p_id
  returning x.actualizado_en into o.actualizado_en;
  if v_defecto is distinct from o.por_defecto then
    perform public.registrar_actividad('origenes_lead.por_defecto', 'origenes_lead', p_id::text, null, null,
      jsonb_build_object('nombre', v_nombre, 'por_defecto', v_defecto));
  end if;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', false,
                            'origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_lead_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Sólo uno que ningún lead usa (la papelera cuenta) y que no sea el «por defecto»: ése pide elegir otro o quitarle la marca antes.
create or replace function public.origen_lead_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.origenes_lead; v_mensaje text;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.origenes_lead in share row exclusive mode;
  select * into o from public.origenes_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese origen ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');
  if o.por_defecto then
    raise exception '«%» es el origen por defecto: quítale la marca o elige otro por defecto antes de eliminarlo.', o.nombre
      using errcode = '22023', hint = 'por_defecto';
  end if;
  v_mensaje := format('«%s» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.', o.nombre);
  -- Sonda por rango sobre el índice de la FK (ver `…000800`): `= p_id` recorre `leads` entera.
  if exists (select 1 from public.leads l where l.origen_lead_id >= p_id and l.origen_lead_id <= p_id) then
    raise exception '%', v_mensaje using errcode = '23503';
  end if;
  begin
    delete from public.origenes_lead x where x.id = p_id;
  exception when foreign_key_violation then
    raise exception '%', v_mensaje using errcode = '23503';
  end;
  return jsonb_build_object('origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.origen_lead_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Tipos de lead: icono
-- ---------------------------------------------------------------------------
create or replace function public._tipos_lead_lista()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._tipos_lead_tope(),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object(
           'id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'clase', t.clase, 'icono', t.icono, 'activo', t.activo, 'orden', t.orden,
           'actualizado_en', t.actualizado_en,
           'con_leads', exists (select 1 from public.leads l where l.tipo_lead_id >= t.id and l.tipo_lead_id <= t.id)
         ) order by t.orden, t.nombre) from public.tipos_lead t), '[]'::jsonb));
$$;
revoke all on function public._tipos_lead_lista() from public, anon, authenticated;

drop function if exists public.tipo_lead_crear(uuid, text, text);
create or replace function public.tipo_lead_crear(p_id uuid, p_nombre text, p_clase text, p_icono text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz; v_clase public.clase_tipo_lead; v_icono text; v_tope integer := public._tipos_lead_tope();
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select t.actualizado_en into v_version from public.tipos_lead t where t.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._tipos_lead_lista());
  end if;
  v_nombre := public._tipo_lead_nombre(p_nombre);
  v_icono := public._icono_del_catalogo(p_icono);
  if p_clase is null or p_clase not in ('prospecto', 'cliente') then
    raise exception 'Elige la clase del tipo: prospecto o cliente.' using errcode = '22023', hint = 'clase';
  end if;
  v_clase := p_clase::public.clase_tipo_lead;
  if (select count(*) from (select 1 from public.tipos_lead limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % tipos de lead, que es el máximo. Elimina uno sin leads o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.tipos_lead t where lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.tipos_lead (id, clave, nombre, clase, icono, orden)
  values (p_id, public._tipo_lead_clave(v_nombre), v_nombre, v_clase, v_icono,
          coalesce((select max(t.orden) + 10 from public.tipos_lead t), 10))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false, 'lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_crear(uuid, text, text, text) from public, anon;
grant execute on function public.tipo_lead_crear(uuid, text, text, text) to authenticated;

create or replace function public.tipo_lead_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.tipos_lead; v_k text; v_nombre text; v_activo boolean; v_icono text;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un tipo tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k = 'clase' then
      raise exception 'La clase de un tipo no cambia: crea otro de la clase que necesitas.' using errcode = '22023', hint = 'clase';
    end if;
    if v_k not in ('nombre', 'activo', 'icono') then
      raise exception 'El dato «%» de un tipo no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.tipos_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := o.nombre;
  v_activo := o.activo;
  v_icono := o.icono;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del tipo.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._tipo_lead_nombre(p_cambios ->> 'nombre');
  end if;
  if p_cambios ? 'activo' then
    if jsonb_typeof(p_cambios -> 'activo') <> 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    v_activo := (p_cambios ->> 'activo')::boolean;
  end if;
  if p_cambios ? 'icono' then
    if jsonb_typeof(p_cambios -> 'icono') not in ('string', 'null') then
      raise exception 'El icono es una clave del catálogo o nada.' using errcode = '22023', hint = 'icono';
    end if;
    v_icono := public._icono_del_catalogo(p_cambios ->> 'icono');
  end if;

  if (v_nombre, v_activo, v_icono) is not distinct from (o.nombre, o.activo, o.icono) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true, 'lista', public._tipos_lead_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo mientras lo editabas.');
  if exists (select 1 from public.tipos_lead x where x.id <> p_id and lower(btrim(x.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.tipos_lead x set nombre = v_nombre, activo = v_activo, icono = v_icono where x.id = p_id
  returning x.actualizado_en into o.actualizado_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', false, 'lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tipo_lead_guardar(uuid, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Las lecturas
-- ---------------------------------------------------------------------------
-- Los orígenes y los tipos de lead, con los apagados y ahora con su icono (el listado, la ficha, el rápido y la exportación).
create or replace function public.leads_catalogos()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'origenes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'clave', o.clave, 'nombre', o.nombre, 'icono', o.icono, 'activo', o.activo)
                                           order by o.orden, o.nombre) from public.origenes_lead o), '[]'::jsonb),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'clase', t.clase, 'icono', t.icono, 'activo', t.activo)
                                           order by t.orden, t.nombre) from public.tipos_lead t), '[]'::jsonb));
$$;
revoke all on function public.leads_catalogos() from public, anon;
grant execute on function public.leads_catalogos() to authenticated;

-- Lo que «Nuevo lead» lee al abrirse. Cada catálogo se pide acotado a su tope (el mismo de escribir: la base lo impone, la lectura no
-- crece con nada más) y la respuesta lo dice (`topes`). Sin `clave` ni `icono`: el alta dibuja `<select>`. `origen_por_defecto_id` es el
-- de la empresa y `ultimo_origen_id` el de esta persona (nulo si se apagó): el cliente prefiere el último, luego el por defecto.
create or replace function public.lead_alta_contexto()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_ultimo text;
begin
  perform public.assert_permiso('leads.crear');
  select pu.valor #>> '{}' into v_ultimo
    from public.preferencias_usuario pu
   where pu.usuario_id = (select auth.uid()) and pu.clave = 'leads.ultimo_origen_lead';
  return jsonb_build_object(
    'telefono_cc', (select e.telefono_cc from public.ajustes_empresa e where e.id = 1),
    -- La ciudad y el país de la empresa: de ahí salen los valores por defecto «la de la empresa».
    'empresa', (select jsonb_build_object('ciudad', e.ciudad, 'pais', e.pais) from public.ajustes_empresa e where e.id = 1),
    'topes', jsonb_build_object('origenes', public._origenes_lead_tope(), 'tipos', public._tipos_lead_tope(),
                                'tipos_seguimiento', public._tipos_seguimiento_tope()),
    'origenes', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.orden, q.nombre)
        from (select o.id, o.nombre, o.orden from public.origenes_lead o where o.activo
               order by o.orden, o.nombre limit public._origenes_lead_tope()) q), '[]'::jsonb),
    'tipos_seguimiento', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.orden, q.nombre)
        from (select t.id, t.nombre, t.orden from public.tipos_seguimiento t where t.activo
               order by t.orden, t.nombre limit public._tipos_seguimiento_tope()) q), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre, 'clase', q.clase) order by q.orden, q.nombre)
        from (select x.id, x.nombre, x.clase, x.orden from public.tipos_lead x where x.activo
               order by x.orden, x.nombre limit public._tipos_lead_tope()) q), '[]'::jsonb),
    'tipo_por_defecto_id', public._tipo_lead_por_defecto(),
    'origen_por_defecto_id', (select o.id from public.origenes_lead o where o.por_defecto and o.activo),
    'ultimo_origen_id', (select o.id from public.origenes_lead o where o.id::text = v_ultimo and o.activo));
end;
$$;
revoke all on function public.lead_alta_contexto() from public, anon;
grant execute on function public.lead_alta_contexto() to authenticated;

-- ---------------------------------------------------------------------------
-- El permiso ya existía: ahora también gobierna estas RPC
-- ---------------------------------------------------------------------------
update public.permisos
set aplicado_en = 'lead_campo_*, origen_lead_*, origenes_lead_con_uso, tipo_lead_*, tipos_lead_con_uso, tipo_seguimiento_*, tipos_seguimiento_con_uso'
where clave = 'leads.configurar';
