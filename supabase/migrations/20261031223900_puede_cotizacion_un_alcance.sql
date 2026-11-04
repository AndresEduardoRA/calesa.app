-- `puede_cotizacion()` mira el alcance una sola vez (4.15-1, cierra 4-24).
--
-- La forma de la base (`cross join lateral (select alcance_de(…) as alcance)` y `a.alcance` nombrado dos veces) se aplana: para quien ve
-- «propios», `alcance_de` se evalúa dos veces por llamada (con «todos», una). Con la forma de `puede_vehiculo()` —el alcance como
-- argumento de un `case`— se evalúa una vez. La respuesta es la misma: «todos» ve, «propios» ve lo que creó o lo de su cartera, sin el
-- permiso o en la papelera no ve, y nunca es nula. La leen diez policies; su texto no cambia. Mismos grants (`create or replace`).

create or replace function public.puede_cotizacion(p_cot uuid, p_clave text) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce((
    select case public.alcance_de(p_clave, c.origen_id)
             when 'todos' then true
             when 'propios' then c.creado_por = (select auth.uid()) or public.en_cartera(c.lead_id)
             else false
           end
      from public.cotizaciones c
     where c.id = p_cot and c.eliminado_en is null
  ), false);
$$;
