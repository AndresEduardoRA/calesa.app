-- La cotización final como ancla de la limpieza automática (paso 4.25-1).
--
-- `_limpieza_ancla` dejaba el hueco con un comentario («una cotización final activa también es ancla»): un importado de subasta vencido, sin lead y con una
-- final, se iba a la papelera esa madrugada y se llevaba la final. Ahora una final con el predicado de `cotizaciones_final_por_vehiculo` (final, activa y
-- viva) ancla: `limpieza_el` da nulo y la limpieza lo salta y lo cuenta en `saltados.cotizacion_final`. Va después de la vitrina y antes de lo que la
-- papelera manual rechazaría; con lead sigue ganando 'vinculo'. Una final en la papelera, reportada o inválida no ancla.
-- Pruebas: `supabase/tests/areas/final/ancla-y-desvincular.sql` (A1, A2).

create or replace function public._limpieza_ancla(v public.vehiculos) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
begin
  if exists (select 1 from public.vehiculos_conservados c where c.vehiculo_id = v.id) then return 'conservar'; end if;
  if v.lead_id is not null then return 'vinculo'; end if;
  if v.fase_id is not null and exists (select 1 from public.fases f where f.id = v.fase_id and not f.es_inicial) then
    return 'fase';
  end if;
  -- Cuentan todas las filas, también las borradas: la purga las llevaría en cascada.
  if exists (select 1 from public.documentos d where d.vehiculo_id = v.id) then return 'documentos'; end if;
  if exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then return 'gastos'; end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) then return 'pagos'; end if;
  if v.publicado_web then return 'vitrina'; end if;
  -- Una cotización final activa y viva (el predicado de `cotizaciones_final_por_vehiculo`, que la sostiene).
  if exists (select 1 from public.cotizaciones c
              where c.vehiculo_id = v.id and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null) then
    return 'cotizacion_final';
  end if;
  -- Lo demás que la papelera manual rechaza (comprobante, declaración aduanera, repuestos): la
  -- limpieza nunca intenta lo que la puerta de siempre cerraría.
  if public._vehiculo_motivo_de_bloqueo(v, true) is not null then return 'bloqueo'; end if;
  return null;
end;
$$;

-- `create or replace` conserva los privilegios de la base; se repiten explícitos (redundante a propósito).
revoke all on function public._limpieza_ancla(public.vehiculos) from public, anon, authenticated;
grant execute on function public._limpieza_ancla(public.vehiculos) to service_role;
