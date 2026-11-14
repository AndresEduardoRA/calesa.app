-- De estos vehículos, cuáles tienen un lead que quien llama puede abrir: el aviso de «no se puede enviar a la papelera, está vinculado» ofrece
-- «Ver el lead» sólo si la ficha del lead se abre (`puede_lead(…, 'leads.ver')` es la misma regla que la policy de `leads`, que es la que
-- decide `lead_ficha()`). Calco de `vehiculos_editables()`: por clave primaria, a lo sumo 200 ids, nada de índice nuevo.
-- Su prueba: supabase/tests/areas/vehiculos/lead-visible.sql.

create or replace function public.vehiculos_con_lead_visible(p_ids uuid[]) returns setof uuid
  language sql stable security definer set search_path = ''
as $$
  select v.id
    from unnest(p_ids[1:200]) as x (id)
    join public.vehiculos v on v.id = x.id
   where v.eliminado_en is null
     and v.lead_id is not null
     and public.puede_vehiculo(v.id, 'vehiculos.ver')
     and public.puede_lead(v.lead_id, 'leads.ver');
$$;

revoke all on function public.vehiculos_con_lead_visible(uuid[]) from public, anon;
grant execute on function public.vehiculos_con_lead_visible(uuid[]) to authenticated, service_role;
