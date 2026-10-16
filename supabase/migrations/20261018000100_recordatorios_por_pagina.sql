-- Parte 9d-2: los recordatorios de un lead se leen por páginas, y el aviso de vencidos no cuenta.
--
-- Antes, la ficha y el drawer leían `recordatorios_vista … order by recordar_en limit 100`: los 100 de
-- fecha más vieja, completados incluidos (con muchos completados viejos no llegaba ningún pendiente) y
-- sin decir que cortaba. Ahora son dos listas por cursor, cada una con su índice:
--   · pendientes: `recordar_en asc, id asc` (los vencidos quedan primero, el más viejo arriba);
--   · completados: `completado_en desc, id desc`, que se leen sólo al abrir su plegado.
-- El cursor es una comparación de filas: PostgREST sólo sabe escribirlo como `or()`, que no es
-- condición de índice (una página profunda recorrería lo anterior); por eso es una RPC, sobre la
-- tabla y no sobre la vista (la vista no deja usar el índice por persona y lead).
--
-- `lead_ficha().recordatorios_vencidos` deja de ser `count(*)`: cuenta hasta 21 y la pantalla dice
-- «más de 20» (el número exacto crecía con el total).

-- Pendientes del lead, de quien mira: también sostienen el aviso de vencidos de la ficha.
create index if not exists recordatorios_lead_pendientes_idx
  on public.recordatorios (usuario_id, lead_id, recordar_en, id)
  where completado_en is null and eliminado_en is null;
-- Completados del lead, de quien mira, el último completado arriba.
create index if not exists recordatorios_lead_completados_idx
  on public.recordatorios (usuario_id, lead_id, completado_en desc, id desc)
  where completado_en is not null and eliminado_en is null;

-- Una página de los recordatorios de quien mira sobre un lead (invoker: la RLS deja sólo los suyos y
-- vivos). Un lead que no ve (la RLS de `leads`, mirada una vez) no trae ninguno. Sin conteo: `hay_mas`
-- sale de pedir uno de más. `puedo_agendar` es la regla de agendar (cartera y `leads.editar`; la base
-- vuelve a mirar al crear) y `hay_completados` dice si mostrar el plegado (un `exists`). Cada fila
-- tiene la forma de `recordatorios_vista`.
-- Índices: `recordatorios_lead_pendientes_idx` y `recordatorios_lead_completados_idx`. Con y sin
-- cursor son consultas distintas a propósito: un `p_desde is null or (…)` o un `coalesce` en el
-- cursor dejan de ser condición de índice en el plan genérico y una página profunda recorre todo lo
-- anterior (medido en `supabase/tests/medir-volumen.sql`).
create or replace function public.lead_recordatorios(p_lead uuid, p_completados boolean default false,
                                                     p_desde_en timestamptz default null,
                                                     p_desde_id uuid default null, p_tamano int default 20)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tamano int := least(greatest(coalesce(p_tamano, 20), 1), 50);
  v_yo uuid := (select auth.uid());
  v_lead record;
  v_filas public.recordatorios[];
  v_json jsonb;
  v_hay_completados boolean;
begin
  select l.id, l.nombre, l.numero into v_lead from public.leads l where l.id = p_lead;
  if not found then
    return jsonb_build_object('recordatorios', '[]'::jsonb, 'hay_mas', false, 'hay_completados', false,
                              'puedo_agendar', false);
  end if;
  if coalesce(p_completados, false) then
    if p_desde_en is null then
      select array_agg(x.r order by (x.r).completado_en desc, (x.r).id desc) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null
         order by r.completado_en desc, r.id desc limit v_tamano + 1) x;
    else
      select array_agg(x.r order by (x.r).completado_en desc, (x.r).id desc) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null
           and (r.completado_en, r.id) < (p_desde_en, p_desde_id)
         order by r.completado_en desc, r.id desc limit v_tamano + 1) x;
    end if;
    v_hay_completados := true;
  else
    if p_desde_en is null then
      select array_agg(x.r order by (x.r).recordar_en, (x.r).id) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is null and r.eliminado_en is null
         order by r.recordar_en, r.id limit v_tamano + 1) x;
    else
      select array_agg(x.r order by (x.r).recordar_en, (x.r).id) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is null and r.eliminado_en is null
           and (r.recordar_en, r.id) > (p_desde_en, p_desde_id)
         order by r.recordar_en, r.id limit v_tamano + 1) x;
    end if;
    v_hay_completados := exists (
      select 1 from public.recordatorios r
       where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null);
  end if;
  -- La forma de `recordatorios_vista`; la RLS de `vehiculos` vacía el join si quien mira no lo ve.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', u.id, 'titulo', u.titulo, 'recordar_en', u.recordar_en, 'notificado_en', u.notificado_en,
           'completado_en', u.completado_en, 'creado_en', u.creado_en, 'actualizado_en', u.actualizado_en,
           'lead_id', v_lead.id, 'lead_nombre', v_lead.nombre, 'lead_numero', v_lead.numero,
           'vehiculo_id', v.id, 'vehiculo_titulo', v.titulo, 'vehiculo_numero', v.numero,
           'vehiculo_oculto', u.vehiculo_id is not null and v.id is null) order by u.ordinality), '[]'::jsonb)
    into v_json
    from unnest(v_filas[1:v_tamano]) with ordinality as u
    left join public.vehiculos v on v.id = u.vehiculo_id;
  return jsonb_build_object(
    'recordatorios', v_json, 'hay_mas', coalesce(cardinality(v_filas), 0) > v_tamano,
    'hay_completados', v_hay_completados,
    'puedo_agendar', public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar'));
end;
$$;
revoke all on function public.lead_recordatorios(uuid, boolean, timestamptz, uuid, int) from public, anon;
grant execute on function public.lead_recordatorios(uuid, boolean, timestamptz, uuid, int) to authenticated;

-- La ficha, igual que en `…20261015000600_vehiculos_del_lead.sql` salvo los vencidos: hasta 21 (la
-- pantalla dice «más de 20»), con `recordatorios_lead_pendientes_idx` (el `order by` lo elige: sin él,
-- el planificador puede tomar el de la FK y recorrer los completados del lead).
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
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    'vehiculos_vinculados', (select count(*) from public.vehiculos x where x.lead_id = p_lead),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;
revoke all on function public.lead_ficha(uuid) from public, anon;
grant execute on function public.lead_ficha(uuid) to authenticated;
