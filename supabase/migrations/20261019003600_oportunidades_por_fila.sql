-- La policy de `oportunidades` decide fila a fila, no con un arreglo de toda la cartera (cierre 5a-fix-4, `docs/PLAN.md` 5a-6).
--
-- Medido (`docs/RENDIMIENTO.md` › «Cierre 5a-fix-4», 212.000 leads): `lead_id = any((select _mis_leads_vivos())::uuid[])` armaba una vez por consulta la lista de los 80.000 leads vivos de
-- la cartera de la dueña (49,5 ms y 4.365 buffers, un `InitPlan`) y después el planificador, sin saber de cuántos eran, elegía un `Bitmap Index Scan` de `oportunidades_lead_id_idx` con esos
-- 80.000 valores para leer las 10.000 oportunidades de la dueña y ordenarlas: la primera página de una columna del kanban costaba 67 a 111 ms (presupuesto 100) aunque sólo se dibujen 51.
-- El costo era de quien mira (cuántos leads tiene), no de la columna.
--
-- Ahora la policy pregunta por cada oportunidad que sale: `_lead_vivo_en_mi_cartera(lead_id)` (una búsqueda por `leads_asesores_usuario_vigente_idx` y por la clave de `leads`). La condición
-- `usuario_id = auth.uid()` de la policy ya acota por persona antes de preguntar, así que el planificador camina `oportunidades_tablero_idx` en el orden del kanban y corta en 51:
-- el plan pasó de un `Bitmap Heap Scan` de 10.000 filas (4.655 buffers) a un `Index Scan` con `Limit 51` (420 buffers); 78,6 → 1,1 ms. El tablero 443 → 55 ms y la ficha 72 → 1,4.
--
-- La visibilidad no cambia: la misma regla de siempre (la oportunidad es de quien mira, no está eliminada, quien mira ve leads, y el lead está vivo y en su cartera vigente), sin la baja en
-- curso ni el limbo —el limbo ya no tiene cartera vigente, y la baja en curso sacaba a la persona de la cartera de otros, no la suya—. `oportunidades-policy.sql` compara lo que la policy
-- entrega con la regla escrita a mano, por persona. Lo que hoy no se ve sigue respondiendo como inexistente (las RPC de la matriz no cambian).

create or replace function public._lead_vivo_en_mi_cartera(p_lead uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leads_asesores la join public.leads l on l.id = la.lead_id
                  where la.lead_id = p_lead and la.usuario_id = (select auth.uid()) and la.revocado_en is null and l.eliminado_en is null)
$$;
revoke all on function public._lead_vivo_en_mi_cartera(uuid) from public, anon;
grant execute on function public._lead_vivo_en_mi_cartera(uuid) to authenticated;
comment on function public._lead_vivo_en_mi_cartera(uuid) is 'Si el lead está vivo y en la cartera vigente de quien llama. Es la mitad de la policy de oportunidades (la otra es que la oportunidad sea suya); se pregunta por fila para que el planificador pueda caminar oportunidades_tablero_idx y cortar (5a-6).';

drop policy if exists "oportunidades: leer" on public.oportunidades;
create policy "oportunidades: leer" on public.oportunidades for select to authenticated
  using (usuario_id = (select auth.uid())
         and eliminado_en is null
         and (select public.alcance_de('leads.ver')) is not null
         and public._lead_vivo_en_mi_cartera(lead_id));

-- Nadie más la usa: el arreglo de toda la cartera ya no se arma.
drop function if exists public._mis_leads_vivos();
