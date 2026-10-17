-- Parte 9f-1: el origen del lead es configurable.
--
-- `origenes_lead` pasa a ser de sólo lectura para la app: se escribe por `origen_lead_crear|guardar|
-- mover|eliminar`, con el permiso `leads.configurar` (el mismo de los campos: no hay permiso nuevo),
-- versión y PT409. Un origen con leads no se elimina, se desactiva: sigue nombrando a los leads que
-- ya lo tienen y no se ofrece para uno nuevo.
--
-- Una desactivación que llega a la vez que un alta no puede dejar guardado un origen apagado: un
-- trigger de `leads` mira el origen con `for share` (la FK sólo toma `for key share`, que no choca
-- con la desactivación) y, si ya no está activo, rechaza con un mensaje legible.
--
-- Las columnas y el índice único del nombre viven en `schemas/05_leads/01_leads.sql`; acá van
-- también como `if not exists` para una base que ya los tuviera aplicados sin ellos.

alter table public.origenes_lead add column if not exists creado_en timestamptz not null default now();
alter table public.origenes_lead add column if not exists actualizado_en timestamptz not null default now();
create unique index if not exists origenes_lead_nombre_unico on public.origenes_lead (lower(btrim(nombre)));

-- ---------------------------------------------------------------------------
-- Sólo lectura para la app
-- ---------------------------------------------------------------------------
drop policy if exists "origenes_lead: crear" on public.origenes_lead;
drop policy if exists "origenes_lead: editar" on public.origenes_lead;
drop policy if exists "origenes_lead: borrar" on public.origenes_lead;
revoke insert, update, delete on table public.origenes_lead from authenticated;

-- ---------------------------------------------------------------------------
-- Versión y auditoría
-- ---------------------------------------------------------------------------
-- La versión es de lo que se edita (nombre y activo). Reordenar renumera filas que nadie editó: no la
-- mueve, así dos reordenamientos seguidos no se pisan y un nombre en pantalla no queda viejo porque
-- otra persona movió el lugar. Sella con `greatest(clock_timestamp(), anterior + 1 µs)`.
create or replace function public.origen_lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.activo) is distinct from (old.nombre, old.activo) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.origen_lead_version() from public, anon, authenticated;

drop trigger if exists trg_actualizado_en on public.origenes_lead;
drop trigger if exists trg_origen_lead_version on public.origenes_lead;
create trigger trg_origen_lead_version before update on public.origenes_lead
  for each row execute function public.origen_lead_version();

-- Sólo cuando la versión se movió: renumerar el orden no deja una fila por origen (mover deja una sola).
create or replace function public.origen_lead_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.actualizado_en is not distinct from old.actualizado_en then
    return null;
  end if;
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values ('origenes_lead.' || lower(tg_op), (select auth.uid()), 'origenes_lead', coalesce(new.id, old.id)::text,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end;
$$;
revoke all on function public.origen_lead_auditar() from public, anon, authenticated;

drop trigger if exists trg_auditar on public.origenes_lead;
drop trigger if exists trg_origen_lead_auditar on public.origenes_lead;
create trigger trg_origen_lead_auditar after insert or update or delete on public.origenes_lead
  for each row execute function public.origen_lead_auditar();

-- ---------------------------------------------------------------------------
-- Un lead no guarda un origen apagado
-- ---------------------------------------------------------------------------
-- Lo que ya tiene un lead no se toca (el origen apagado que conserva): sólo cuenta cuando el origen
-- entra o cambia. `for share` choca con el `update` de desactivar: o la desactivación espera a que el
-- alta termine, o el alta ve el origen ya apagado y falla.
create or replace function public.lead_origen_vigente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_activo boolean;
begin
  if new.origen_lead_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.origen_lead_id is not distinct from old.origen_lead_id then
    return new;
  end if;
  select o.activo into v_activo from public.origenes_lead o where o.id = new.origen_lead_id for share;
  if not found then
    raise exception 'Ese origen del lead ya no existe: elige otro.' using errcode = '22023', hint = 'origen_lead_id';
  end if;
  if not v_activo then
    raise exception 'Ese origen del lead se desactivó: elige otro.' using errcode = '22023', hint = 'origen_lead_id';
  end if;
  return new;
end;
$$;
revoke all on function public.lead_origen_vigente() from public, anon, authenticated;

drop trigger if exists trg_lead_origen_vigente on public.leads;
create trigger trg_lead_origen_vigente before insert or update of origen_lead_id on public.leads
  for each row execute function public.lead_origen_vigente();

-- ---------------------------------------------------------------------------
-- Piezas internas
-- ---------------------------------------------------------------------------
-- El nombre, sin espacios de más: «  Redes   sociales » es «Redes sociales».
create or replace function public._origen_lead_nombre(p_texto text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del origen.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del origen admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._origen_lead_nombre(text) from public, anon, authenticated;

-- La clave sale del nombre (sin acentos, minúsculas, guion bajo) y no cambia nunca; si choca con otra
-- se le suma un número. La importación sigue aceptando nombre o clave.
create or replace function public._origen_lead_clave(p_nombre text)
returns text language plpgsql stable set search_path = '' as $$
declare v text; v_base text; n int := 1;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v !~ '^[a-z]' then
    v := 'o_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    v := 'origen';
  end if;
  v_base := v;
  while exists (select 1 from public.origenes_lead o where o.clave = v) loop
    n := n + 1;
    v := left(v_base, 30 - char_length(n::text) - 1) || '_' || n;
  end loop;
  return v;
end;
$$;
revoke all on function public._origen_lead_clave(text) from public, anon, authenticated;

-- La lista que devuelven todas las escrituras y `origenes_lead_con_uso()`: hasta 100 filas, cada una
-- con si algún lead la usa (también en la papelera: la FK los cuenta) por un `exists` sobre el índice
-- de la FK, nunca un conteo.
create or replace function public._origenes_lead_json()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'clave', o.clave, 'nombre', o.nombre, 'activo', o.activo, 'orden', o.orden,
           'actualizado_en', o.actualizado_en,
           'con_leads', exists (select 1 from public.leads l where l.origen_lead_id = o.id)
         ) order by o.orden, o.nombre), '[]'::jsonb)
    from public.origenes_lead o;
$$;
revoke all on function public._origenes_lead_json() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
-- Los orígenes con si tienen leads. Es lo que lee la pantalla de configuración.
create or replace function public.origenes_lead_con_uso()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.configurar');
  return public._origenes_lead_json();
end;
$$;
revoke all on function public.origenes_lead_con_uso() from public, anon;
grant execute on function public.origenes_lead_con_uso() to authenticated;

-- Crea uno al final. El id lo genera el navegador: reintentar no duplica. Tope de 100 (activos e
-- inactivos), dicho en la pantalla. El candado de la tabla ordena el «último + 10» y el tope de dos
-- altas a la vez.
create or replace function public.origen_lead_crear(p_id uuid, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz;
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
  if (select count(*) from (select 1 from public.origenes_lead limit 100) t) >= 100 then
    raise exception 'Ya hay 100 orígenes del lead, que es el máximo. Elimina uno sin leads o desactiva los que no uses.'
      using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.origenes_lead o where lower(btrim(o.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un origen «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.origenes_lead (id, clave, nombre, orden)
  values (p_id, public._origen_lead_clave(v_nombre), v_nombre,
          coalesce((select max(o.orden) + 10 from public.origenes_lead o), 10))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false,
                            'origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_crear(uuid, text) from public, anon;
grant execute on function public.origen_lead_crear(uuid, text) to authenticated;

-- Renombra o activa/desactiva. `p_cambios` lleva `nombre` y/o `activo`. Lo que ya está guardado no es
-- un conflicto (un reintento no choca consigo mismo).
create or replace function public.origen_lead_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.origenes_lead; v_k text; v_nombre text; v_activo boolean;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.origenes_lead in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un origen tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('nombre', 'activo') then
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

  if (v_nombre, v_activo) is not distinct from (o.nombre, o.activo) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true,
                              'origenes', public._origenes_lead_json());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');
  if exists (select 1 from public.origenes_lead x where x.id <> p_id and lower(btrim(x.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un origen «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.origenes_lead x set nombre = v_nombre, activo = v_activo where x.id = p_id
  returning x.actualizado_en into o.actualizado_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', false,
                            'origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_lead_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Lo mueve después de otro (nulo = primero), no a una posición: si otra persona agregó uno entre
-- tanto, queda junto al vecino que se eligió. Renumera 10, 20, 30… tocando sólo las filas que cambian.
create or replace function public.origen_lead_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.origenes_lead;
begin
  perform public.assert_permiso('leads.configurar');
  -- El orden es de la lista entera: el candado hace que dos reordenamientos vayan en fila.
  lock table public.origenes_lead in share row exclusive mode;
  select * into o from public.origenes_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese origen ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_id then
      raise exception 'Un origen no puede ir después de sí mismo.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.origenes_lead x where x.id = p_despues_de) then
      raise exception 'Ese origen ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.origenes_lead x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden)) from public.origenes_lead y),
    p_id, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  perform public.registrar_actividad('origenes_lead.movido', 'origenes_lead', p_id::text, null, null,
    jsonb_build_object('nombre', o.nombre, 'despues_de', p_despues_de));
  return jsonb_build_object('id', p_id, 'actualizado_en', (select x.actualizado_en from public.origenes_lead x where x.id = p_id),
                            'origenes', public._origenes_lead_json());
end;
$$;
revoke all on function public.origen_lead_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.origen_lead_mover(uuid, timestamptz, uuid) to authenticated;

-- Sólo uno que ningún lead usa (la papelera cuenta: la FK es `restrict`). Con leads se desactiva.
-- Un alta que gana la carrera cae en el `foreign_key_violation` y recibe el mismo mensaje.
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
  v_mensaje := format('«%s» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.', o.nombre);
  if exists (select 1 from public.leads l where l.origen_lead_id = p_id limit 1) then
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
-- El permiso ya existía: ahora también gobierna estas RPC
-- ---------------------------------------------------------------------------
update public.permisos
set aplicado_en = 'lead_campo_*, origen_lead_*, origenes_lead_con_uso, policy tipos_seguimiento'
where clave = 'leads.configurar';
