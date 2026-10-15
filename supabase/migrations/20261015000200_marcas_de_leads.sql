-- Favoritos, tachados y etiquetas (Fase 3, parte 5b). Escrito a mano.
--
-- 1. Son marcas PRIVADAS de cada persona: se leen sólo las propias y se escriben sólo por RPC. Antes
--    se escribían directo con RLS: el UPDATE de `etiquetas` dejaba poner cualquier nombre o color, sin
--    tope ni versión.
-- 2. Marcar exige VER el lead (no la cartera): es una nota para uno mismo, no un cambio del lead. Lo
--    que no se ve —ajeno, limbo, papelera o inexistente— responde lo mismo, también al quitar.
-- 3. `poner(valor)`, no alternar: repetir el pedido (doble clic, reintento) no cambia el resultado.
--    Las marcas no llevan versión (como los teléfonos extra): operan por fila y una versión sólo
--    daría conflictos falsos. Las etiquetas sí: renombrar, recolorear y eliminar la piden.
-- 4. Ninguna mueve la versión del lead, ni deja auditoría ni `actividad`: no tocan `leads`.
-- 5. Los topes (50 etiquetas por persona, 20 suyas por lead) se serializan con un candado de
--    transacción por persona: dos pedidos a la vez no pasan del tope.
-- 6. `leads_vista` suma `etiquetas` (las de quien mira); `es_favorito` y `esta_tachado` ya estaban.
--    Medido con 2.000 leads (`supabase/tests/medir-listado.sql`): el plan las resuelve con una lectura
--    de las marcas de la persona por consulta, no una por fila.

-- ---------------------------------------------------------------------------
-- Las tablas se leen; se escriben por RPC
-- ---------------------------------------------------------------------------
drop policy if exists "leads_favoritos: crear" on public.leads_favoritos;
drop policy if exists "leads_favoritos: borrar" on public.leads_favoritos;
revoke insert, update, delete on table public.leads_favoritos from anon, authenticated;

drop policy if exists "leads_tachados: crear" on public.leads_tachados;
drop policy if exists "leads_tachados: borrar" on public.leads_tachados;
revoke insert, update, delete on table public.leads_tachados from anon, authenticated;

drop policy if exists "etiquetas: crear" on public.etiquetas;
drop policy if exists "etiquetas: editar" on public.etiquetas;
drop policy if exists "etiquetas: borrar" on public.etiquetas;
revoke insert, update, delete on table public.etiquetas from anon, authenticated;

drop policy if exists "leads_etiquetas: crear" on public.leads_etiquetas;
drop policy if exists "leads_etiquetas: borrar" on public.leads_etiquetas;
revoke insert, update, delete on table public.leads_etiquetas from anon, authenticated;

-- La versión de una etiqueta la sellan sus RPC con la hora del reloj.
drop trigger if exists trg_actualizado_en on public.etiquetas;

-- ---------------------------------------------------------------------------
-- Internos
-- ---------------------------------------------------------------------------
-- El lead que quien llama ve. Inexistente, limbo, papelera o ajeno: la misma respuesta.
create or replace function public._lead_visible(p_lead uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return p_lead;
end;
$$;
revoke all on function public._lead_visible(uuid) from public, anon, authenticated;

-- Un candado por persona para todo lo que cuenta etiquetas: crear, eliminar y ponerlas en un lead.
create or replace function public._etiquetas_candado()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('etiquetas:' || (select auth.uid())::text, 0));
end;
$$;
revoke all on function public._etiquetas_candado() from public, anon, authenticated;

-- La paleta cerrada, en su orden. Espejo: `etiquetas_color_paleta` (el check) y
-- `src/modules/leads/entities/etiqueta.ts` (`CLAVES_DE_COLOR`).
create or replace function public._etiquetas_paleta()
returns text[] language sql immutable set search_path = '' as $$
  select array['gris', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'violeta'];
$$;
revoke all on function public._etiquetas_paleta() from public, anon, authenticated;

create or replace function public._etiqueta_json(e public.etiquetas)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color, 'actualizado_en', e.actualizado_en);
$$;
revoke all on function public._etiqueta_json(public.etiquetas) from public, anon, authenticated;

create or replace function public._etiqueta_nombre(p_nombre text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_nombre, ''));
begin
  if char_length(v) not between 1 and 30 then
    raise exception 'El nombre de una etiqueta lleva entre 1 y 30 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._etiqueta_nombre(text) from public, anon, authenticated;

create or replace function public._etiqueta_color(p_color text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_color is null or not (p_color = any (public._etiquetas_paleta())) then
    raise exception 'Elige un color de la paleta.' using errcode = '22023', hint = 'color';
  end if;
  return p_color;
end;
$$;
revoke all on function public._etiqueta_color(text) from public, anon, authenticated;

-- Un nombre que ya tiene (sin importar mayúsculas), salvo la etiqueta que se renombra.
create or replace function public._etiqueta_nombre_libre(p_nombre text, p_excepto uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select e.nombre into v from public.etiquetas e
   where e.usuario_id = (select auth.uid()) and lower(e.nombre) = lower(p_nombre)
     and e.id is distinct from p_excepto;
  if found then
    raise exception 'Ya tienes una etiqueta «%».', v using errcode = '22023', hint = 'nombre';
  end if;
end;
$$;
revoke all on function public._etiqueta_nombre_libre(text, uuid) from public, anon, authenticated;

create or replace function public._etiqueta_conflicto(p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Cambiaste esta etiqueta % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
    using errcode = 'PT409';
end;
$$;
revoke all on function public._etiqueta_conflicto(timestamptz) from public, anon, authenticated;

-- Las etiquetas de quien llama en un lead, en orden estable.
create or replace function public._lead_mis_etiquetas(p_lead uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(le.etiqueta_id order by le.etiqueta_id), '[]'::jsonb)
    from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
   where le.lead_id = p_lead and e.usuario_id = (select auth.uid());
$$;
revoke all on function public._lead_mis_etiquetas(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Favorito y tachado: poner(valor)
-- ---------------------------------------------------------------------------
-- Devuelven `{resultado: puesto | quitado | sin_cambios, valor}`.
create or replace function public.lead_favorito_poner(p_lead uuid, p_valor boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public._lead_visible(p_lead);
  if p_valor is null then
    raise exception 'Falta decir si va o no.' using errcode = '22023';
  end if;
  if p_valor then
    insert into public.leads_favoritos (lead_id, usuario_id) values (p_lead, (select auth.uid())) on conflict do nothing;
  else
    delete from public.leads_favoritos f where f.lead_id = p_lead and f.usuario_id = (select auth.uid());
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('resultado', case when n = 0 then 'sin_cambios' when p_valor then 'puesto' else 'quitado' end,
                            'valor', p_valor);
end;
$$;
revoke all on function public.lead_favorito_poner(uuid, boolean) from public, anon;
grant execute on function public.lead_favorito_poner(uuid, boolean) to authenticated;

create or replace function public.lead_tachado_poner(p_lead uuid, p_valor boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public._lead_visible(p_lead);
  if p_valor is null then
    raise exception 'Falta decir si va o no.' using errcode = '22023';
  end if;
  if p_valor then
    insert into public.leads_tachados (lead_id, usuario_id) values (p_lead, (select auth.uid())) on conflict do nothing;
  else
    delete from public.leads_tachados t where t.lead_id = p_lead and t.usuario_id = (select auth.uid());
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('resultado', case when n = 0 then 'sin_cambios' when p_valor then 'puesto' else 'quitado' end,
                            'valor', p_valor);
end;
$$;
revoke all on function public.lead_tachado_poner(uuid, boolean) from public, anon;
grant execute on function public.lead_tachado_poner(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Etiquetas de un lead: poner o quitar ESAS (nunca reemplazar el conjunto: dos pestañas no se pisan)
-- ---------------------------------------------------------------------------
-- Devuelve `{resultado: puesto | quitado | sin_cambios, etiquetas: [ids]}` (las suyas en el lead).
create or replace function public.lead_etiquetas_poner(p_lead uuid, p_etiquetas uuid[], p_valor boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public._lead_visible(p_lead);
  if p_valor is null then
    raise exception 'Falta decir si va o no.' using errcode = '22023';
  end if;
  if p_etiquetas is null or cardinality(p_etiquetas) not between 1 and 20 or array_position(p_etiquetas, null) is not null then
    raise exception 'Elige entre 1 y 20 etiquetas.' using errcode = '22023', hint = 'etiquetas';
  end if;
  perform public._etiquetas_candado();
  -- Ajena o inexistente: lo mismo. No se dice que existe.
  if exists (select 1 from unnest(p_etiquetas) x (id)
              where not exists (select 1 from public.etiquetas e where e.id = x.id and e.usuario_id = (select auth.uid()))) then
    raise exception 'No encontramos esa etiqueta. Recarga para ver las tuyas.' using errcode = '22023', hint = 'etiquetas';
  end if;
  if p_valor then
    insert into public.leads_etiquetas (lead_id, etiqueta_id)
    select distinct p_lead, x.id from unnest(p_etiquetas) x (id)
    on conflict do nothing;
    get diagnostics n = row_count;
    if (select count(*) from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
         where le.lead_id = p_lead and e.usuario_id = (select auth.uid())) > 20 then
      raise exception 'Un lead admite hasta 20 de tus etiquetas. Quita una para poner otra.' using errcode = '22023', hint = 'etiquetas';
    end if;
  else
    delete from public.leads_etiquetas le where le.lead_id = p_lead and le.etiqueta_id = any (p_etiquetas);
    get diagnostics n = row_count;
  end if;
  return jsonb_build_object('resultado', case when n = 0 then 'sin_cambios' when p_valor then 'puesto' else 'quitado' end,
                            'etiquetas', public._lead_mis_etiquetas(p_lead));
end;
$$;
revoke all on function public.lead_etiquetas_poner(uuid, uuid[], boolean) from public, anon;
grant execute on function public.lead_etiquetas_poner(uuid, uuid[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Etiquetas: crear, guardar (renombrar y recolorear), eliminar
-- ---------------------------------------------------------------------------
-- El intento lleva su id (un reintento devuelve `repetido`; «Deshacer» de un borrado la recrea con
-- el mismo id). Sin color, toma el de la paleta que la persona menos usa.
create or replace function public.etiqueta_crear(p_id uuid, p_nombre text, p_color text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.etiquetas; v_nombre text; v_color text;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador de la etiqueta.' using errcode = '22023';
  end if;
  perform public._etiquetas_candado();
  select * into e from public.etiquetas x where x.id = p_id;
  if found then
    if e.usuario_id = (select auth.uid()) then
      return jsonb_build_object('resultado', 'repetido', 'etiqueta', public._etiqueta_json(e));
    end if;
    raise exception 'No pudimos crear esta etiqueta. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v_nombre := public._etiqueta_nombre(p_nombre);
  v_color := case when p_color is null then null else public._etiqueta_color(p_color) end;
  perform public._etiqueta_nombre_libre(v_nombre, null);
  if (select count(*) from public.etiquetas x where x.usuario_id = (select auth.uid())) >= 50 then
    raise exception 'Puedes tener hasta 50 etiquetas. Elimina una para crear otra.' using errcode = '22023', hint = 'nombre';
  end if;
  if v_color is null then
    select p.k into v_color
      from unnest(public._etiquetas_paleta()) with ordinality p (k, o)
     order by (select count(*) from public.etiquetas x where x.usuario_id = (select auth.uid()) and x.color = p.k), p.o
     limit 1;
  end if;
  begin
    insert into public.etiquetas (id, usuario_id, nombre, color, actualizado_en)
    values (p_id, (select auth.uid()), v_nombre, v_color, clock_timestamp())
    returning * into e;
  exception when unique_violation then
    -- El mismo id de otra persona (el candado es por persona): no se dice nada de ella.
    raise exception 'No pudimos crear esta etiqueta. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creada', 'etiqueta', public._etiqueta_json(e));
end;
$$;
revoke all on function public.etiqueta_crear(uuid, text, text) from public, anon;
grant execute on function public.etiqueta_crear(uuid, text, text) to authenticated;

-- Nulo = no cambia. Lo que ya está guardado responde `sin_cambios` antes de mirar la versión (un
-- reintento no choca consigo mismo).
create or replace function public.etiqueta_guardar(
  p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text default null, p_color text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.etiquetas; n public.etiquetas; v_nombre text; v_color text;
begin
  perform public.assert_activo();
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  perform public._etiquetas_candado();
  select * into e from public.etiquetas x where x.id = p_id and x.usuario_id = (select auth.uid()) for update;
  if not found then
    raise exception 'No encontramos esta etiqueta. Recarga para ver las tuyas.' using errcode = '42501';
  end if;
  v_nombre := case when p_nombre is null then e.nombre else public._etiqueta_nombre(p_nombre) end;
  v_color := case when p_color is null then e.color else public._etiqueta_color(p_color) end;
  if (v_nombre, v_color) is not distinct from (e.nombre, e.color) then
    return jsonb_build_object('resultado', 'sin_cambios', 'etiqueta', public._etiqueta_json(e));
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._etiqueta_conflicto(e.actualizado_en);
  end if;
  perform public._etiqueta_nombre_libre(v_nombre, e.id);
  update public.etiquetas x set
    nombre = v_nombre, color = v_color,
    actualizado_en = greatest(clock_timestamp(), e.actualizado_en + interval '1 microsecond')
  where x.id = e.id
  returning * into n;
  return jsonb_build_object('resultado', 'guardada', 'etiqueta', public._etiqueta_json(n));
end;
$$;
revoke all on function public.etiqueta_guardar(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.etiqueta_guardar(uuid, timestamptz, text, text) to authenticated;

-- Se va con sus asignaciones (cascada). Una que ya no está —borrada desde otra pestaña, o que nunca
-- fue tuya— responde `sin_cambios`: nada que hacer, y no se distingue lo ajeno. Devuelve la fila y a
-- cuántos leads (de los que ves) estaba puesta.
create or replace function public.etiqueta_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.etiquetas; v_leads int;
begin
  perform public.assert_activo();
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  perform public._etiquetas_candado();
  select * into e from public.etiquetas x where x.id = p_id and x.usuario_id = (select auth.uid()) for update;
  if not found then
    return jsonb_build_object('resultado', 'sin_cambios', 'etiqueta', null, 'leads', 0);
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._etiqueta_conflicto(e.actualizado_en);
  end if;
  select count(*) into v_leads from public.leads_etiquetas le
   where le.etiqueta_id = e.id and public.puede_lead(le.lead_id, 'leads.ver');
  delete from public.etiquetas x where x.id = e.id;
  return jsonb_build_object('resultado', 'eliminada', 'etiqueta', public._etiqueta_json(e), 'leads', v_leads);
end;
$$;
revoke all on function public.etiqueta_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.etiqueta_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecturas
-- ---------------------------------------------------------------------------
-- Las etiquetas de quien mira con a cuántos leads (de los que ve) están puestas: «Gestionar» y el
-- aviso al eliminar. La RLS de `etiquetas` da las propias y la de `leads`, los que ve (la papelera,
-- que alguien con permiso de vaciarla también lee, no cuenta).
create or replace view public.etiquetas_vista with (security_invoker = true) as
select e.id, e.nombre, e.color, e.creado_en, e.actualizado_en,
       (select count(*) from public.leads_etiquetas le join public.leads l on l.id = le.lead_id
         where le.etiqueta_id = e.id and l.eliminado_en is null)::int as leads
  from public.etiquetas e;
revoke all on public.etiquetas_vista from anon, authenticated;
grant select on public.etiquetas_vista to authenticated;
comment on view public.etiquetas_vista is 'Las etiquetas de quien mira, con a cuántos de los leads que ve están puestas.';

-- `leads_vista` suma `etiquetas`: las de quien mira en ese lead (nunca las de otra persona).
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
         (select count(*) from public.cotizaciones c where c.lead_id = l.id and c.eliminado_en is null) as cotizaciones_count,
         public.en_cartera(l.id) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas
  from public.leads l;
  grant select on public.leads_vista to authenticated;
end;
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;

select public._leads_vista_crear();

comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera. `en_cartera` = el lead está en la cartera de quien mira («míos» del listado). `es_favorito`, `esta_tachado` y `etiquetas` son las marcas de quien mira, nunca las de otra persona. security_invoker: la RLS de leads decide qué filas hay.';

-- La ficha suma las marcas de quien mira.
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
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from public.recordatorios r
       where r.lead_id = p_lead and r.usuario_id = (select auth.uid())
         and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;
revoke all on function public.lead_ficha(uuid) from public, anon;
grant execute on function public.lead_ficha(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- El permiso que lo gobierna
-- ---------------------------------------------------------------------------
update public.permisos
   set aplicado_en = 'puede_lead, lead_favorito_poner, lead_tachado_poner, lead_etiquetas_poner'
 where clave = 'leads.ver';
