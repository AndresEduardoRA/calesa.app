-- Los datos de un lead pasan a atributos configurables, con los privados recortados en la base.
-- Escrito a mano.
--
--   1. Los seis datos que eran columna (edad, ciudad, país, dirección, género y notas) se copian a
--      `leads.atributos` y las columnas se retiran, junto con el enum `genero_persona`.
--   2. `leads.atributos` no es legible por la API: lo lee `atributos_lead()`, que le da todo a la
--      cartera y a quien sólo ve el lead le saca los campos «solo la cartera». Filtrar también es
--      leer: PostgREST sólo filtra sobre lo que la vista ya recortó.
--   3. Un trigger valida lo que se guarda contra el layout (tipo, requeridos, opciones, formato) y
--      no deja que alguien fuera de la cartera cambie un privado.
--   4. `crear_lead` recibe los datos propios dentro de `atributos`.
--   5. `actividad` deja de entregarle a la API las filas completas (`antes`, `despues`): guardan el
--      teléfono entero y, desde ahora, los privados.
--
-- Se aplica sobre una base viva (y desde cero): todo es idempotente.

-- ---------------------------------------------------------------------------
-- Lectura: lo que recibe quien llama
-- ---------------------------------------------------------------------------
-- Falla cerrada: quien no está en la cartera recibe sólo las claves que el layout conoce como no
-- privadas, estén activas o no (desactivar un privado no lo expone). Nulo si no ve el lead.
create or replace function public.atributos_lead(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_atributos jsonb;
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return null;
  end if;
  select l.atributos into v_atributos from public.leads l where l.id = p_lead;
  if public.en_cartera(p_lead) then
    return v_atributos;
  end if;
  return coalesce((
    select jsonb_object_agg(e.key, e.value)
    from jsonb_each(v_atributos) e
    where exists (select 1 from public.leads_campos c where c.clave = e.key and not c.solo_cartera)
  ), '{}'::jsonb);
end;
$$;
revoke all on function public.atributos_lead(uuid) from public, anon;
grant execute on function public.atributos_lead(uuid) to authenticated;

-- La vista que lee la app. security_invoker: la RLS de leads sigue mandando.
create or replace function public._leads_vista_crear()
returns void language plpgsql security definer set search_path = '' as $$
begin
  drop view if exists public.leads_vista;
  create view public.leads_vista with (security_invoker = true) as
  select l.id, l.numero, l.nombre, l.telefono_cc,
         public.telefono_lead(l.id) as telefono_principal,
         public.en_cartera(l.id) as telefono_visible,
         l.tipo, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         exists (select 1 from public.leads_favoritos f where f.lead_id = l.id and f.usuario_id = (select auth.uid())) as es_favorito,
         exists (select 1 from public.leads_tachados t where t.lead_id = l.id and t.usuario_id = (select auth.uid())) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
         (select count(*) from public.cotizaciones c where c.lead_id = l.id and c.eliminado_en is null) as cotizaciones_count
  from public.leads l;
  grant select on public.leads_vista to authenticated;
end;
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Las seis columnas pasan a atributos
-- ---------------------------------------------------------------------------
-- Si las columnas existen: copia lo que haya, retira las columnas y el enum. Sin sellar la versión de
-- nadie ni dejar una fila de auditoría por lead. `genero = 'sin_especificar'` es «sin dato».
-- Devuelve cuántos leads tocó. Una base nueva no tiene las columnas: no hace nada.
create or replace function public._leads_columnas_a_atributos()
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int := 0;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'leads' and column_name = 'edad') then
    return 0;
  end if;
  drop view if exists public.leads_vista;
  alter table public.leads disable trigger trg_actualizado_en;
  alter table public.leads disable trigger trg_auditar;
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
  alter table public.leads enable trigger trg_actualizado_en;
  alter table public.leads enable trigger trg_auditar;
  alter table public.leads drop column edad, drop column ciudad, drop column pais,
    drop column direccion, drop column genero, drop column notas;
  drop type if exists public.genero_persona;
  return v_n;
end;
$$;
revoke all on function public._leads_columnas_a_atributos() from public, anon, authenticated;

select public._leads_columnas_a_atributos();
drop type if exists public.genero_persona;

-- ---------------------------------------------------------------------------
-- Escritura: validar contra el layout
-- ---------------------------------------------------------------------------
-- Lo que no sale del tipo JSON: que la clave sea del layout, que una opción exista (la que el lead
-- ya tenía sigue valiendo aunque se haya sacado de la lista) y el formato de cada tipo.
-- `p_campos`: [{clave, etiqueta, tipo, opciones, activo}] de todo el layout. Lo de un campo
-- desactivado se conserva, pero no se cambia.
create or replace function public._lead_atributos_formato(p_nuevos jsonb, p_anteriores jsonb, p_campos jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; c record; e jsonb; t text; x numeric;
begin
  for k in select jsonb_object_keys(p_nuevos) loop
    if not exists (select 1 from jsonb_to_recordset(p_campos) as f (clave text) where f.clave = k) then
      raise exception 'El dato «%» no es un campo de los leads.', k using errcode = '22023', hint = 'atributos.' || k;
    end if;
  end loop;
  for c in select f.clave, f.etiqueta, f.tipo, f.opciones, f.activo
           from jsonb_to_recordset(p_campos) as f (clave text, etiqueta text, tipo text, opciones jsonb, activo boolean) loop
    v := p_nuevos -> c.clave;
    if v is null or v = 'null'::jsonb then
      continue;
    end if;
    if not c.activo then
      if v is distinct from (p_anteriores -> c.clave) then
        raise exception '«%» está desactivado: no se cambia.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
      end if;
      continue;
    end if;
    t := v #>> '{}';
    case c.tipo
      when 'texto' then
        if jsonb_typeof(v) = 'string' and char_length(t) > 500 then
          raise exception '«%» admite hasta 500 caracteres.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'texto_largo' then
        if jsonb_typeof(v) = 'string' and char_length(t) > 5000 then
          raise exception '«%» admite hasta 5000 caracteres.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'numero', 'moneda' then
        x := t::numeric;
        if abs(x) > 1000000000000 then
          raise exception '«%» es demasiado grande.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'fecha' then
        begin
          if t !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'x'; end if;
          perform t::date;
        exception when others then
          raise exception '«%» tiene que ser una fecha (aaaa-mm-dd).', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end;
      when 'fecha_hora' then
        begin
          perform t::timestamptz;
        exception when others then
          raise exception '«%» tiene que ser una fecha con hora.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end;
      when 'url' then
        if t !~* '^https?://[^[:space:]]+$' or char_length(t) > 500 then
          raise exception '«%» tiene que ser un enlace que empiece con http:// o https://.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'correo' then
        if t !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(t) > 160 then
          raise exception '«%» tiene que ser un correo.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'documento' then
        if t !~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,29}$' then
          raise exception '«%» lleva letras, números y separadores, hasta 30.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'opcion' then
        if not exists (select 1 from jsonb_array_elements(c.opciones) o where o ->> 'clave' = t)
           and v is distinct from (p_anteriores -> c.clave) then
          raise exception '«%» no es una de las opciones de «%».', t, c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
        end if;
      when 'multi_opcion' then
        for e in select * from jsonb_array_elements(v) loop
          if jsonb_typeof(e) <> 'string' then
            raise exception '«%» tiene que ser una lista de opciones.', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
          end if;
          if not exists (select 1 from jsonb_array_elements(c.opciones) o where o ->> 'clave' = e #>> '{}')
             and not (coalesce(p_anteriores -> c.clave, '[]'::jsonb) @> jsonb_build_array(e)) then
            raise exception '«%» no es una de las opciones de «%».', e #>> '{}', c.etiqueta using errcode = '22023', hint = 'atributos.' || c.clave;
          end if;
        end loop;
      else
        null;
    end case;
  end loop;
end;
$$;
revoke all on function public._lead_atributos_formato(jsonb, jsonb, jsonb) from public, anon, authenticated;

-- El `hint` lleva `atributos.<clave>`: la app pinta el motivo junto al campo. Quien escribe con
-- sesión y no está en la cartera (sólo puede ser una edición: quien crea queda de dueño) no cambia
-- un privado, y no se le exige uno que no ve.
create or replace function public.lead_validar_atributos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_anteriores jsonb := '{}'::jsonb; v_fuera boolean; v_todos jsonb; v_activos jsonb; c record;
begin
  if jsonb_typeof(new.atributos) <> 'object' then
    raise exception 'Los atributos de un lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    v_anteriores := old.atributos;
  end if;
  v_fuera := tg_op = 'UPDATE' and (select auth.uid()) is not null and not public.en_cartera(new.id);
  if v_fuera then
    for c in select k.clave, k.etiqueta from public.leads_campos k where k.solo_cartera loop
      if new.atributos -> c.clave is distinct from v_anteriores -> c.clave then
        raise exception 'No tienes acceso a «%».', c.etiqueta using errcode = '42501', hint = 'atributos.' || c.clave;
      end if;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', k.clave, 'etiqueta', k.etiqueta, 'tipo', k.tipo,
                                               'opciones', k.opciones, 'activo', k.activo)), '[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('clave', k.clave, 'etiqueta', k.etiqueta, 'tipo', k.tipo,
                                               'requerido', k.requerido and not (v_fuera and k.solo_cartera)))
                  filter (where k.activo), '[]'::jsonb)
    into v_todos, v_activos
  from public.leads_campos k;

  perform public._atributos_validar(new.atributos, v_activos, 'Los atributos de un lead tienen que ser un objeto.');
  perform public._lead_atributos_formato(new.atributos, v_anteriores, v_todos);
  return new;
end;
$$;
drop trigger if exists trg_lead_validar_atributos on public.leads;
create trigger trg_lead_validar_atributos before insert or update of atributos on public.leads
  for each row execute function public.lead_validar_atributos();

-- ---------------------------------------------------------------------------
-- Crear un lead: la única puerta de INSERT. Si el teléfono está en limbo, lo adopta.
-- ---------------------------------------------------------------------------
-- `p`: nombre, telefono_cc, telefono_principal, tipo, origen_lead_id y `atributos` (los campos del
-- layout, por su clave). Una clave suelta se rechaza diciendo dónde va. Quien adopta ya está en la
-- cartera: sus atributos se suman a lo que el lead tenía.
create or replace function public.crear_lead(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tel text; v_id uuid; v_existente uuid; v_k text; v_atributos jsonb := '{}'::jsonb;
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos'];
  v_activos text[];
begin
  perform public.assert_permiso('leads.crear');
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Los datos del lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select coalesce(array_agg(c.clave), '{}') into v_activos from public.leads_campos c where c.activo;
  v_tel := public.normalizar_telefono(p ->> 'telefono_cc', p ->> 'telefono_principal');
  select id into v_existente from public.leads where telefono_principal = v_tel and eliminado_en is null;
  if v_existente is not null then
    if public.lead_en_limbo(v_existente) then
      insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_existente, (select auth.uid()), 'adoptado');
      update public.leads set nombre = coalesce(nullif(p ->> 'nombre', ''), nombre), creado_por = (select auth.uid()) where id = v_existente;
      if p ? 'atributos' then
        update public.leads set atributos = public._atributos_fusionar(
          atributos, p -> 'atributos', v_activos,
          'Los atributos de un lead tienen que ser un objeto.',
          'El campo «%s» no es un campo de los leads o está desactivado.')
        where id = v_existente;
      end if;
      perform public.registrar_actividad('lead.adoptado_del_limbo', 'leads', v_existente::text, null, jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return v_existente;
    end if;
    raise exception 'Ese teléfono ya pertenece a otro lead.' using errcode = '23505';
  end if;
  if p ? 'atributos' then
    v_atributos := public._atributos_fusionar(
      '{}'::jsonb, p -> 'atributos', v_activos,
      'Los atributos de un lead tienen que ser un objeto.',
      'El campo «%s» no es un campo de los leads o está desactivado.');
  end if;
  insert into public.leads (nombre, telefono_cc, telefono_principal, tipo, origen_lead_id, atributos, creado_por)
  values (p ->> 'nombre', coalesce(p ->> 'telefono_cc', '+591'), v_tel,
          coalesce((p ->> 'tipo')::public.tipo_lead, 'prospecto'), (p ->> 'origen_lead_id')::uuid,
          v_atributos, (select auth.uid()))
  returning id into v_id;
  perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null, jsonb_build_object('nombre', p ->> 'nombre'));
  return v_id;
end;
$$;
revoke all on function public.crear_lead(jsonb) from public, anon;
grant execute on function public.crear_lead(jsonb) to authenticated;

-- Tuteo: lo que dice una RPC llega a la pantalla tal cual.
create or replace function public.revocar_acceso_lead(p_lead uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.compartir');
  if exists (select 1 from public.leads_asesores where lead_id = p_lead and usuario_id = p_usuario and tipo_acceso = 'dueno' and revocado_en is null) then
    raise exception 'Al dueño no se le revoca: transfiere el lead.' using errcode = '23514';
  end if;
  update public.leads_asesores set revocado_en = now(), revocado_por = (select auth.uid()) where lead_id = p_lead and usuario_id = p_usuario and revocado_en is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Actividad: sin las filas completas
-- ---------------------------------------------------------------------------
-- `antes` y `despues` guardan la fila entera (el teléfono completo y los privados). Quien tiene
-- `actividad.ver` ve qué pasó, quién y cuándo; el diff lo dará la pantalla de Actividad por una
-- función que recorta según la cartera. Un `select *` desde la API falla a propósito.
revoke select on table public.actividad from authenticated;
grant select (id, accion, actor_id, tabla, registro_id, detalle, creado_en) on table public.actividad to authenticated;

-- La vista, al final: necesita `atributos_lead()` y las columnas ya retiradas.
select public._leads_vista_crear();
