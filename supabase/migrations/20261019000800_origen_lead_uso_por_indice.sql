-- Orígenes del lead (9f-1), corrección de escala: «¿algún lead usa este origen?» camina el índice de la FK.
--
-- `leads_origen_lead_id_idx` existe (lo crea el bucle de claves foráneas de `…000900_indices.sql`), pero el
-- `exists (… where l.origen_lead_id = o.id)` de `_origenes_lead_json()` y el de `origen_lead_eliminar()` no lo
-- usaban: con el plan genérico (el que usa plpgsql tras unas llamadas) Postgres estima que `= $1` deja pasar
-- 1/n_distinct de la tabla (un quinto con cinco orígenes) y elige Seq Scan. Para un origen con un solo lead, o
-- sin ninguno, recorría los 62.000 leads del volumen (5 ms) y crece con la tabla.
--
-- La sonda por rango (`>= x and <= x`) dice lo mismo y la estimación deja de depender de los datos: un rango
-- sobre un valor desconocido se estima en un 0,5 % de la tabla, y el índice gana siempre (0,03 ms). Lo asserta
-- `supabase/tests/medir-escala.sql`. No hay índice nuevo.

create or replace function public._origenes_lead_json()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'clave', o.clave, 'nombre', o.nombre, 'activo', o.activo, 'orden', o.orden,
           'actualizado_en', o.actualizado_en,
           -- Sonda por rango sobre el índice de la FK (ver arriba): `= o.id` recorre `leads`.
           'con_leads', exists (select 1 from public.leads l where l.origen_lead_id >= o.id and l.origen_lead_id <= o.id)
         ) order by o.orden, o.nombre), '[]'::jsonb)
    from public.origenes_lead o;
$$;
revoke all on function public._origenes_lead_json() from public, anon, authenticated;

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
  -- Sonda por rango sobre el índice de la FK (ver arriba): `= p_id` recorre `leads` entera.
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
