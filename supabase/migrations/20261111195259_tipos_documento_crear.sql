-- Tipos de documento: crear por RPC con permiso por grupo (paso 5.03, C1–C5 y C10; decisiones D1–D12 del paso).
--
-- La base dejaba escribir `tipos_documento` directo con dos policies. Desde el 5.03 se escribe sólo por RPC `security definer`:
--   C1. Versión propia de la fila: `tipo_documento_version()` la mueve con `greatest(clock_timestamp(), anterior + 1 µs)` sólo si cambia un dato
--       (ordenar no la cambia), porque `set_actualizado_en()` pone `now()` y no se movería dos veces en una transacción (D4).
--   C2. El grupo es el de la fila: el global (`flujo_id` nulo) pide `logistica.catalogos.gestionar`; el de un flujo, `puede_configurar_flujo()`.
--       Se mira antes que la versión (D5).
--   C3. Los datos se validan sobre el estado que resulta; una combinación inválida se rechaza con su `hint` (D3).
--   C4. Nombre único en el grupo sin distinguir mayúsculas; un tipo de flujo activo no repite el de un global activo (D6).
--   C10. Hasta 100 tipos por grupo (D9).

-- C1 · la versión de la fila (corre después de trg_actualizado_en: van por orden alfabético).
create or replace function public.tipo_documento_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.nombre, new.descripcion, new.activo, new.formatos, new.modo_vencimiento, new.vigencia_dias, new.aviso_dias,
      new.visible_portal_permitido, new.proposito, new.flujo_id)
     is distinct from
     (old.nombre, old.descripcion, old.activo, old.formatos, old.modo_vencimiento, old.vigencia_dias, old.aviso_dias,
      old.visible_portal_permitido, old.proposito, old.flujo_id) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

create trigger trg_tipo_documento_version before update on public.tipos_documento
  for each row execute function public.tipo_documento_version();

-- Los formatos que se aceptan, en el orden en que se guardan (el default de la columna).
create or replace function public._tipos_documento_formatos() returns text[]
language sql immutable
set search_path = ''
as $$ select array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[] $$;

-- C10 · cuántos tipos caben en un grupo.
create or replace function public._tipos_documento_tope() returns integer
language sql immutable
set search_path = ''
as $$ select 100 $$;

-- C2 · el permiso del grupo: global o el de un flujo.
create or replace function public._tipo_documento_exigir_permiso(p_flujo uuid) returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if p_flujo is null then
    perform public.assert_permiso('logistica.catalogos.gestionar');
    return;
  end if;
  perform public.assert_activo();
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No puedes configurar los tipos de documento de este flujo.' using errcode = '42501';
  end if;
end;
$$;

-- Un número de días que llega en el jsonb: entero entre 0 y 3650, o nulo.
create or replace function public._tipo_documento_dias(p_valor jsonb, p_campo text, p_mensaje text) returns integer
language plpgsql immutable
set search_path = ''
as $$
declare v numeric;
begin
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_valor) <> 'number' then
    raise exception '%', p_mensaje using errcode = '22023', hint = p_campo;
  end if;
  v := (p_valor #>> '{}')::numeric;
  if v <> trunc(v) or v < 0 or v > 3650 then
    raise exception '%', p_mensaje using errcode = '22023', hint = p_campo;
  end if;
  return v::integer;
end;
$$;

-- Los datos del jsonb sobre una fila: lista cerrada de claves y el tipo de cada valor. Lo que vale cada uno lo mira _tipo_documento_validar().
create or replace function public._tipo_documento_de_jsonb(p_base public.tipos_documento, p_datos jsonb, p_al_crear boolean)
returns public.tipos_documento
language plpgsql stable
set search_path = ''
as $$
declare
  t public.tipos_documento := p_base; v_k text;
  v_claves text[] := array['nombre', 'descripcion', 'formatos', 'modo_vencimiento', 'vigencia_dias', 'aviso_dias', 'visible_portal_permitido'];
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de un tipo de documento tienen que ser un objeto.' using errcode = '22023';
  end if;
  if not p_al_crear then
    v_claves := v_claves || 'activo'::text;
  end if;
  for v_k in select jsonb_object_keys(p_datos) loop
    if not (v_k = any (v_claves)) and p_al_crear then
      raise exception 'El dato «%» de un tipo de documento no se elige al crearlo.', v_k using errcode = '22023', hint = v_k;
    elsif not (v_k = any (v_claves)) then
      raise exception 'El dato «%» de un tipo de documento no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  if p_datos ? 'nombre' then
    if jsonb_typeof(p_datos -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del tipo de documento.' using errcode = '22023', hint = 'nombre';
    end if;
    t.nombre := btrim(p_datos ->> 'nombre');
  end if;
  if p_datos ? 'descripcion' then
    if jsonb_typeof(p_datos -> 'descripcion') not in ('string', 'null') then
      raise exception 'La descripción es un texto.' using errcode = '22023', hint = 'descripcion';
    end if;
    t.descripcion := p_datos ->> 'descripcion';
  end if;
  if p_datos ? 'formatos' then
    if jsonb_typeof(p_datos -> 'formatos') <> 'array'
       or exists (select 1 from jsonb_array_elements(p_datos -> 'formatos') e where jsonb_typeof(e) <> 'string') then
      raise exception 'Los formatos son una lista de textos.' using errcode = '22023', hint = 'formatos';
    end if;
    t.formatos := array(select jsonb_array_elements_text(p_datos -> 'formatos'));
  end if;
  if p_datos ? 'modo_vencimiento' then
    if jsonb_typeof(p_datos -> 'modo_vencimiento') <> 'string'
       or not ((p_datos ->> 'modo_vencimiento') = any (enum_range(null::public.modo_vencimiento)::text[])) then
      raise exception 'El vencimiento es ninguno, solicitar o renovar.' using errcode = '22023', hint = 'modo_vencimiento';
    end if;
    t.modo_vencimiento := (p_datos ->> 'modo_vencimiento')::public.modo_vencimiento;
  end if;
  if p_datos ? 'vigencia_dias' then
    t.vigencia_dias := public._tipo_documento_dias(p_datos -> 'vigencia_dias', 'vigencia_dias',
      'La vigencia es un número entero de días, de 1 a 3650.');
  end if;
  if p_datos ? 'aviso_dias' then
    t.aviso_dias := public._tipo_documento_dias(p_datos -> 'aviso_dias', 'aviso_dias', 'El aviso es un número entero de días, de 0 a 3650.');
  end if;
  if p_datos ? 'visible_portal_permitido' then
    if jsonb_typeof(p_datos -> 'visible_portal_permitido') <> 'boolean' then
      raise exception 'Mostrar en el portal es sí o no.' using errcode = '22023', hint = 'visible_portal_permitido';
    end if;
    t.visible_portal_permitido := (p_datos ->> 'visible_portal_permitido')::boolean;
  end if;
  if p_datos ? 'activo' then
    if jsonb_typeof(p_datos -> 'activo') <> 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    t.activo := (p_datos ->> 'activo')::boolean;
  end if;
  return t;
end;
$$;

-- C3 · el estado que resulta: nombre, descripción, formatos (sin repetidos, en el orden de p_validos) y vencimiento. Ningún ayudante recibe sólo la
-- fila: PostgREST tomaría una función de un solo argumento de tipo fila como columna calculada de la tabla.
create or replace function public._tipo_documento_validar(p_tipo public.tipos_documento, p_validos text[]) returns public.tipos_documento
language plpgsql immutable
set search_path = ''
as $$
declare t public.tipos_documento := p_tipo; v_formato text; v_validos text[] := p_validos;
begin
  if coalesce(t.nombre, '') = '' then
    raise exception 'Escribe el nombre del tipo de documento.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(t.nombre) > 80 then
    raise exception 'El nombre tiene hasta 80 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  t.descripcion := nullif(btrim(t.descripcion), '');
  if char_length(t.descripcion) > 500 then
    raise exception 'La descripción tiene hasta 500 caracteres.' using errcode = '22023', hint = 'descripcion';
  end if;
  if coalesce(cardinality(t.formatos), 0) = 0 then
    raise exception 'Elige al menos un formato.' using errcode = '22023', hint = 'formatos';
  end if;
  select f into v_formato from unnest(t.formatos) f where f is null or not (f = any (v_validos)) limit 1;
  if found then
    raise exception 'El formato «%» no se acepta.', coalesce(v_formato, '') using errcode = '22023', hint = 'formatos';
  end if;
  t.formatos := array(select v.f from unnest(v_validos) with ordinality v(f, n) where v.f = any (t.formatos) order by v.n);
  if t.modo_vencimiento = 'renovar' and t.vigencia_dias is null then
    raise exception 'Con «renovar», di cada cuántos días vence.' using errcode = '22023', hint = 'vigencia_dias';
  end if;
  if t.modo_vencimiento <> 'renovar' and t.vigencia_dias is not null then
    raise exception 'Sólo «renovar» lleva días de vigencia.' using errcode = '22023', hint = 'vigencia_dias';
  end if;
  if t.vigencia_dias not between 1 and 3650 then
    raise exception 'La vigencia es un número entero de días, de 1 a 3650.' using errcode = '22023', hint = 'vigencia_dias';
  end if;
  if t.aviso_dias not between 0 and 3650 then
    raise exception 'El aviso es un número entero de días, de 0 a 3650.' using errcode = '22023', hint = 'aviso_dias';
  end if;
  if t.modo_vencimiento = 'ninguno' and t.aviso_dias is not null then
    raise exception 'Sin vencimiento no hay aviso.' using errcode = '22023', hint = 'aviso_dias';
  end if;
  if t.modo_vencimiento = 'renovar' and t.aviso_dias > t.vigencia_dias then
    raise exception 'El aviso no puede ser más largo que la vigencia.' using errcode = '22023', hint = 'aviso_dias';
  end if;
  return t;
end;
$$;

-- C4 · el nombre libre: en el grupo (por el btree de tipos_documento_flujo_id_nombre_key, flujo_id primero) y, si es de un flujo y queda activo,
-- entre los globales activos.
create or replace function public._tipo_documento_nombre_libre(p_id uuid, p_flujo uuid, p_nombre text, p_activo boolean) returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if exists (select 1 from public.tipos_documento x
             where ((p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo)
               and x.id <> p_id and lower(btrim(x.nombre)) = lower(p_nombre)) then
    raise exception 'Ya hay un tipo de documento «%».', p_nombre using errcode = '23505', hint = 'nombre';
  end if;
  if p_flujo is not null and p_activo
     and exists (select 1 from public.tipos_documento x
                 where x.flujo_id is null and x.activo and lower(btrim(x.nombre)) = lower(p_nombre)) then
    raise exception 'Ya hay un tipo de documento «%» para toda la empresa.', p_nombre using errcode = '23505', hint = 'nombre';
  end if;
end;
$$;

-- C5 · crear: idempotente por p_id en su grupo.
create or replace function public.tipo_documento_crear(p_id uuid, p_flujo uuid, p_datos jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  o public.tipos_documento; t public.tipos_documento; v_tope integer := public._tipos_documento_tope();
begin
  perform public._tipo_documento_exigir_permiso(p_flujo);
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id;
  if found and o.flujo_id is not distinct from p_flujo then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'repetido', true);
  elsif found then
    raise exception 'Ese identificador ya es de otro tipo de documento.' using errcode = '22023';
  end if;
  if p_datos is not null and jsonb_typeof(p_datos) = 'object' and not (p_datos ? 'nombre') then
    raise exception 'Escribe el nombre del tipo de documento.' using errcode = '22023', hint = 'nombre';
  end if;
  t.id := p_id;
  t.flujo_id := p_flujo;
  t.activo := true;
  t.formatos := public._tipos_documento_formatos();
  t.modo_vencimiento := 'ninguno';
  t.visible_portal_permitido := false;
  t := public._tipo_documento_validar(public._tipo_documento_de_jsonb(t, p_datos, true), public._tipos_documento_formatos());
  if (select count(*) from (select 1 from public.tipos_documento x
                            where (p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo limit v_tope) q) >= v_tope then
    raise exception 'Ya hay % tipos de documento en esta lista, que es el máximo. Elimina uno sin uso o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  perform public._tipo_documento_nombre_libre(t.id, t.flujo_id, t.nombre, t.activo);
  begin
    insert into public.tipos_documento (id, flujo_id, nombre, descripcion, activo, orden, visible_portal_permitido, modo_vencimiento,
                                        vigencia_dias, aviso_dias, formatos)
    values (t.id, t.flujo_id, t.nombre, t.descripcion, true,
            coalesce((select max(x.orden) + 10 from public.tipos_documento x
                      where (p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo), 10),
            t.visible_portal_permitido, t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.formatos)
    returning actualizado_en into t.actualizado_en;
  exception when unique_violation then
    raise exception 'Ya hay un tipo de documento «%».', t.nombre using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', p_id, 'actualizado_en', t.actualizado_en, 'repetido', false);
end;
$$;

revoke all on function public.tipo_documento_version() from public, anon, authenticated;
revoke all on function public._tipos_documento_formatos() from public, anon, authenticated;
revoke all on function public._tipos_documento_tope() from public, anon, authenticated;
revoke all on function public._tipo_documento_exigir_permiso(uuid) from public, anon, authenticated;
revoke all on function public._tipo_documento_dias(jsonb, text, text) from public, anon, authenticated;
revoke all on function public._tipo_documento_de_jsonb(public.tipos_documento, jsonb, boolean) from public, anon, authenticated;
revoke all on function public._tipo_documento_validar(public.tipos_documento, text[]) from public, anon, authenticated;
revoke all on function public._tipo_documento_nombre_libre(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.tipo_documento_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.tipo_documento_crear(uuid, uuid, jsonb) to authenticated, service_role;
