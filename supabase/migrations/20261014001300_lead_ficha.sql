-- La ficha del lead (Fase 3, parte 4a). Escrito a mano.
--
-- 1. La versión de edición de un lead (`actualizado_en`) sólo se mueve con un cambio de lo que la
--    ficha edita o de su estado. Un seguimiento nuevo (`ultimo_seguimiento_en`), compartir, transferir
--    o revocar no la mueven: antes cada uno le daba un conflicto a quien tenía la ficha abierta.
-- 2. La auditoría de `leads` deja de guardar el teléfono y sólo escribe cuando la versión se movió.
--    El conflicto nombra a quien editó, no a quien compartió o hizo un seguimiento.
-- 3. `lead_guardar()` es la única puerta de edición: se quita el UPDATE directo.
-- 4. `leads_telefonos` no se lee ni se escribe directo: se lee por `lead_telefonos()`, que aplica la
--    regla de la cartera.
-- 5. `telefono_lead()` da nulo a quien no ve el lead.
-- 6. `lead_ficha()`: la ficha en un solo viaje.
-- 7. `leads_asesores`: quien ve el lead sin estar en la cartera sólo ve quién lo tiene, no con quién
--    está compartido.
--
-- Idempotente: el estado declarativo está en `supabase/schemas/05_leads/01_leads.sql`.

-- ---------------------------------------------------------------------------
-- leads_telefonos: formato, sin duplicados dentro del lead y fuera del acceso directo
-- ---------------------------------------------------------------------------
alter table public.leads_telefonos add column if not exists creado_en timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.leads_telefonos'::regclass and conname = 'leads_telefonos_formato') then
    alter table public.leads_telefonos add constraint leads_telefonos_formato check (telefono ~ '^[0-9]{7,15}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.leads_telefonos'::regclass and conname = 'leads_telefonos_etiqueta_largo') then
    alter table public.leads_telefonos add constraint leads_telefonos_etiqueta_largo
      check (etiqueta is null or char_length(etiqueta) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.leads_telefonos'::regclass and conname = 'leads_telefonos_unico') then
    alter table public.leads_telefonos add constraint leads_telefonos_unico unique (lead_id, telefono);
  end if;
end $$;

drop policy if exists "leads_telefonos: leer" on public.leads_telefonos;
drop policy if exists "leads_telefonos: crear" on public.leads_telefonos;
drop policy if exists "leads_telefonos: editar" on public.leads_telefonos;
drop policy if exists "leads_telefonos: borrar" on public.leads_telefonos;
revoke all on table public.leads_telefonos from anon, authenticated;
alter table public.leads_telefonos enable row level security;

comment on table public.leads_telefonos is 'Teléfonos extra de un lead (alternos: sin unicidad entre leads). RLS no esconde columnas: la app no lee ni escribe esta tabla; los lee lead_telefonos(), que da el número completo a la cartera y enmascarado al resto, y los escriben las RPC de la parte 4b.';

-- ---------------------------------------------------------------------------
-- Cartera: quien ve el lead sin estar en ella sólo ve quién lo tiene
-- ---------------------------------------------------------------------------
drop policy if exists "leads_asesores: leer" on public.leads_asesores;
create policy "leads_asesores: leer" on public.leads_asesores for select to authenticated
  using (
    (select public.puede_lead(lead_id, 'leads.ver'))
    and ((select public.en_cartera(lead_id)) or (tipo_acceso = 'dueno' and revocado_en is null))
  );

-- ---------------------------------------------------------------------------
-- La versión del lead
-- ---------------------------------------------------------------------------
-- Sella con `greatest(clock_timestamp(), anterior + 1 µs)`: dos ediciones en una misma transacción
-- también tienen versiones distintas (`now()` es la hora de inicio de la transacción).
create or replace function public.lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.tipo, new.origen_lead_id, new.atributos, new.telefono_principal,
      new.telefono_cc, new.eliminado_en, new.lote_papelera_id)
     is distinct from
     (old.nombre, old.tipo, old.origen_lead_id, old.atributos, old.telefono_principal,
      old.telefono_cc, old.eliminado_en, old.lote_papelera_id) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actualizado_en on public.leads;
drop trigger if exists trg_lead_version on public.leads;
create trigger trg_lead_version before update on public.leads
  for each row execute function public.lead_version();

-- Auditoría: sin el teléfono (la constancia de un cambio de número lo lleva enmascarado) y sólo
-- cuando la versión se movió. Lo derivado (el último seguimiento) no deja nada.
create or replace function public.lead_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.actualizado_en is not distinct from old.actualizado_en then
    return null;
  end if;
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values ('leads.' || lower(tg_op), (select auth.uid()), 'leads', coalesce(new.id, old.id)::text,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'telefono_principal' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'telefono_principal' end);
  return null;
end;
$$;
revoke all on function public.lead_auditar() from public, anon, authenticated;

drop trigger if exists trg_auditar on public.leads;
drop trigger if exists trg_lead_auditar on public.leads;
create trigger trg_lead_auditar after insert or update or delete on public.leads
  for each row execute function public.lead_auditar();

-- La función que retira las seis columnas (`…000900`) desactivaba los dos triggers que acá se
-- reemplazan. Se vuelve a crear con los nombres nuevos: sin sellar la versión de nadie ni dejar una
-- fila de auditoría por lead. Una base nueva no tiene las columnas: no hace nada.
create or replace function public._leads_columnas_a_atributos()
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int := 0;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'leads' and column_name = 'edad') then
    return 0;
  end if;
  drop view if exists public.leads_vista;
  alter table public.leads disable trigger trg_lead_version;
  alter table public.leads disable trigger trg_lead_auditar;
  execute $q$
    update public.leads set atributos = atributos || jsonb_strip_nulls(jsonb_build_object(
      'edad', edad,
      'genero', nullif(genero::text, 'sin_especificar'),
      'ciudad', nullif(btrim(ciudad), ''),
      'pais', nullif(btrim(pais), ''),
      'direccion', nullif(btrim(direccion), ''),
      'notas', nullif(btrim(notas), '')))
  $q$;
  get diagnostics v_n = row_count;
  alter table public.leads enable trigger trg_lead_version;
  alter table public.leads enable trigger trg_lead_auditar;
  alter table public.leads drop column edad, drop column ciudad, drop column pais,
    drop column direccion, drop column genero, drop column notas;
  drop type if exists public.genero_persona;
  return v_n;
end;
$$;
revoke all on function public._leads_columnas_a_atributos() from public, anon, authenticated;

-- «Rosa Mamani cambió este lead hace 3 min.» El quien sale de la última edición de la ficha, no de
-- cualquier fila de actividad del lead (compartir, transferir…).
create or replace function public._lead_conflicto(p_lead uuid, p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_nombre text; v_hay boolean := false;
begin
  select a.actor_id, true into v_actor, v_hay from public.actividad a
   where a.tabla = 'leads' and a.registro_id = p_lead::text and a.accion = 'leads.update'
   order by a.id desc limit 1;
  if v_actor is not null and v_actor = (select auth.uid()) then
    raise exception 'Cambiaste este lead % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
      using errcode = 'PT409';
  end if;
  if v_actor is not null then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v_actor;
  end if;
  if v_nombre is null and (v_actor is not null or not coalesce(v_hay, false)) then
    v_nombre := 'Otra persona';
  end if;
  if v_nombre is null then
    raise exception 'Este lead cambió %.', public._hace(p_cuando) using errcode = 'PT409';
  end if;
  raise exception '% cambió este lead %.', v_nombre, public._hace(p_cuando) using errcode = 'PT409';
end;
$$;
revoke all on function public._lead_conflicto(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Editar: la única puerta
-- ---------------------------------------------------------------------------
revoke update on table public.leads from anon, authenticated;
drop policy if exists "leads: editar" on public.leads;

-- `p_cambios`: sólo lo que cambió. `nombre`, `tipo`, `origen_lead_id` y `atributos`, que es un
-- parche: `{clave: valor}` pone o cambia y `{clave: null}` quita. Lo que no se nombra no se toca
-- (un privado que quien edita no recibe sigue como estaba). El teléfono no pasa por acá.
create or replace function public.lead_guardar(p_lead uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_permitidas constant text[] := array['nombre', 'tipo', 'origen_lead_id', 'atributos'];
  v_k text;
  l public.leads;
  n public.leads;
  v_nombre text;
  v_tipo public.tipo_lead;
  v_origen uuid;
  v_atributos jsonb;
  e record;
begin
  perform public.assert_activo();
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- Inexistente, en el limbo, en la papelera y sin acceso: la misma respuesta.
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_lead(l.id, 'leads.editar') then
    raise exception 'No tienes permiso para editar este lead.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := l.nombre;
  v_tipo := l.tipo;
  v_origen := l.origen_lead_id;
  v_atributos := l.atributos;

  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := btrim(p_cambios ->> 'nombre');
    if v_nombre = '' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    if char_length(v_nombre) > 120 then
      raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
    end if;
  end if;

  if p_cambios ? 'tipo' then
    begin
      v_tipo := (p_cambios ->> 'tipo')::public.tipo_lead;
    exception when invalid_text_representation then
      raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
    end;
    if v_tipo is null then
      raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
    end if;
  end if;

  if p_cambios ? 'origen_lead_id' then
    begin
      v_origen := nullif(p_cambios ->> 'origen_lead_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end;
    -- Sólo si cambia: uno desactivado que el lead ya tiene se conserva.
    if v_origen is distinct from l.origen_lead_id then
      if v_origen is not null then
        if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
          raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
        end if;
      elsif exists (select 1 from public.origenes_lead o where o.activo) then
        raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
      end if;
    end if;
  end if;

  if p_cambios ? 'atributos' then
    if jsonb_typeof(p_cambios -> 'atributos') <> 'object' then
      raise exception 'Los atributos de un lead tienen que ser un objeto.' using errcode = '22023';
    end if;
    for e in select x.key, x.value from jsonb_each(p_cambios -> 'atributos') x loop
      if e.value = 'null'::jsonb then
        v_atributos := v_atributos - e.key;
      else
        v_atributos := v_atributos || jsonb_build_object(e.key, e.value);
      end if;
    end loop;
  end if;

  -- Guardar lo que ya está guardado no es un conflicto: un reintento tras perder la respuesta no
  -- choca consigo mismo, y quien no cambió nada no pisa a nadie.
  if (v_nombre, v_tipo, v_origen, v_atributos) is not distinct from (l.nombre, l.tipo, l.origen_lead_id, l.atributos) then
    return jsonb_build_object('actualizado_en', l.actualizado_en);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  -- `atributos` va siempre en el SET: el trigger que valida el layout se dispara por columna
  -- nombrada, así que un lead al que le falta un requerido nuevo no se guarda ni cambiándole
  -- sólo el tipo.
  update public.leads x set
    nombre = v_nombre, tipo = v_tipo, origen_lead_id = v_origen, atributos = v_atributos
  where x.id = l.id
  returning * into n;
  return jsonb_build_object('actualizado_en', n.actualizado_en);
end;
$$;
revoke all on function public.lead_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.lead_guardar(uuid, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Teléfonos: lo que cada quien recibe
-- ---------------------------------------------------------------------------
-- Nulo si quien pregunta no ve el lead (sin `leads.ver`, «propios» fuera de su cartera, limbo,
-- papelera o inexistente); completo para la cartera; enmascarado para quien ve «todos» sin estar.
create or replace function public.telefono_lead(p_lead uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_alcance public.alcance_permiso;
  v_tel text;
  v_cartera boolean;
  v_vivo boolean;
begin
  v_alcance := public.alcance_de('leads.ver');
  if v_alcance is null then
    return null;
  end if;
  select l.telefono_principal,
         exists (select 1 from public.leads_asesores la
                  where la.lead_id = l.id and la.usuario_id = (select auth.uid()) and la.revocado_en is null),
         exists (select 1 from public.leads_asesores la where la.lead_id = l.id and la.revocado_en is null)
    into v_tel, v_cartera, v_vivo
  from public.leads l
  where l.id = p_lead and l.eliminado_en is null;
  if not found or not v_vivo then
    return null;
  end if;
  if v_alcance <> 'todos' and not v_cartera then
    return null;
  end if;
  return case when v_cartera then v_tel else public.enmascarar_telefono(v_tel) end;
end;
$$;
revoke all on function public.telefono_lead(uuid) from public, anon;
grant execute on function public.telefono_lead(uuid) to authenticated;

create or replace function public.lead_telefonos(p_lead uuid)
returns table (id uuid, telefono text, etiqueta text, creado_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_cartera boolean;
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return;
  end if;
  v_cartera := public.en_cartera(p_lead);
  return query
    select t.id,
           case when v_cartera then t.telefono else public.enmascarar_telefono(t.telefono) end,
           t.etiqueta, t.creado_en
      from public.leads_telefonos t
     where t.lead_id = p_lead
     order by t.creado_en, t.id;
end;
$$;
revoke all on function public.lead_telefonos(uuid) from public, anon;
grant execute on function public.lead_telefonos(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- La ficha, en un viaje
-- ---------------------------------------------------------------------------
-- Corre con los derechos de quien llama: la fila sale de `leads_vista` (RLS, teléfono y atributos
-- recortados) y quién lo tiene, de `perfiles`. Nulo si no lo ve, sea cual sea el motivo.
create or replace function public.lead_ficha(p_lead uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb));
end;
$$;
revoke all on function public.lead_ficha(uuid) from public, anon;
grant execute on function public.lead_ficha(uuid) to authenticated;

comment on table public.leads is 'Prospectos y clientes. El teléfono principal es único entre leads vivos y sólo lo ve completo quien está en la cartera (leads_asesores): la app lee leads_vista y lead_ficha, no esta tabla. Se escribe sólo por RPC (crear_lead, lead_guardar, cambiar_telefono_lead). actualizado_en es la versión de edición: la mueve un cambio de nombre, tipo, origen, atributos, teléfono o papelera; un seguimiento, compartir o transferir no. Un lead sin asesores vigentes está en el LIMBO: invisible hasta que alguien lo adopta registrando su teléfono. Fijos: nombre, teléfono, tipo y origen; el resto son campos configurables (leads_campos) y viven en atributos.';
