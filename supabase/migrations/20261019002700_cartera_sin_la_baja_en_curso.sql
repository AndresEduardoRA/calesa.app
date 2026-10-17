-- La policy de `leads_asesores` no entrega la fila de quien está en una baja en curso (cierre 3, paso 0a).
--
-- `docs/DECISIONES.md` (cierre 2, 0a) decía que la policy evitaba que la fila de quien está en baja se leyera por otro camino. No
-- lo hacía, ni la de `…001300` ni la de `…002500`: ninguna miraba `_bajas_en_curso()`. Con una baja a medias, una asesora que
-- comparte el lead con quien se va leía en `leads_asesores` (que `authenticated` puede leer por PostgREST) su fila de dueño
-- vigente, mientras `leads_vista.dueno_id`, la ficha y el portal ya no la nombraban.
--
-- El filtro es un InitPlan sobre una tabla casi vacía (`equipo_bajas` sin terminar): se evalúa una vez por sentencia y cada fila
-- sólo compara. Las funciones `definer` que leen la tabla (`lead_cartera`, `_lead_dueno`) filtran por sí mismas.
drop policy if exists "leads_asesores: leer" on public.leads_asesores;
create policy "leads_asesores: leer" on public.leads_asesores for select to authenticated
  using (leads_asesores.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
         and exists (select 1 from public.leads l
                      where l.id = leads_asesores.lead_id
                        and ((leads_asesores.tipo_acceso = 'dueno' and leads_asesores.revocado_en is null)
                             or (select auth.uid()) = any (l.cartera))));
