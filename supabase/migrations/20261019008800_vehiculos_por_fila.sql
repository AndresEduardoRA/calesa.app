-- La policy `vehiculos: leer` y `puede_vehiculo()` deciden fila a fila, no con un arreglo de toda la cartera (paso 4.11; `docs/PLAN.md`, «Lo que el código de la Fase 0
-- trae y esta fase corrige»; `.claude/rules/escala.md`: «una policy no arma un arreglo de toda la cartera de quien mira»). Es el gemelo de `…20261019007000` (cotizaciones).
--
-- La policy de `…20261013000100` ya calculaba los orígenes una vez por sentencia; le quedaba `lead_id in (select public.mis_leads())`: la primera vez que una fila llegaba a
-- esa rama (lo «propio» que no es mío), Postgres armaba el hash de TODOS los leads de la cartera de quien mira. Con Beto («propios», 50.000 leads en su cartera) una página
-- de vehículos de su cartera costaba 39,6 ms y 676 buffers con 50.000 o con 250.000 vehículos (crece con la cartera, no con N). `puede_vehiculo()` además nombraba
-- `alcance_de()` dos veces y armaba el mismo arreglo en cada llamada: 35,9 ms. Ahora (`supabase/tests/medir-vehiculos-lectura.sql`):
--
--   - Los orígenes donde se ve «todos» y «propios» siguen calculándose una vez por sentencia (`origenes_con_alcance()`, dos InitPlan).
--   - Lo «propio» es `creado_por = (select auth.uid())` o `en_cartera(lead_id)`: una búsqueda por `leads_asesores_usuario_vigente_idx` en esa fila. `en_cartera(lead)` ≡
--     `lead in (select mis_leads())` (las dos miran `leads_asesores` vigente de quien llama, sin mirar el lead): nadie ve más ni menos (`vehiculos-visibilidad.sql` lo compara
--     con una copia de la definición vieja). Quien se va de un lead y queda como compartido lo sigue viendo, como en cotizaciones.
--   - `lead_id is not null and …`: `en_cartera()` es `security definer` (no se inlinea) y casi todo vehículo no tiene lead; sin la guarda, cada fila sin lead que no es mía
--     pagaría una llamada entera donde la vieja hacía un sondeo de hash. Es equivalente (`en_cartera(null)` es falso).
--   - La policy sigue escrita inline sobre las columnas, no con `puede_vehiculo(id)`: una función STABLE no ve la fila recién insertada (`insert … returning`) y leería cada
--     fila otra vez por su clave.
--
-- `puede_vehiculo(p_vehiculo, p_clave)` conserva firma y semántica (la llaman las RPC de vehículos y de cotizaciones, `puede_unidad` y las policies de las tablas hijas y de
-- storage): `alcance_de` una sola vez y `en_cartera`. El alcance va como el argumento de un `case` simple, que se evalúa una vez: el `cross join lateral (select
-- alcance_de(…))` del gemelo lo aplana Postgres y vuelve a evaluar `alcance_de` en cada comparación (dos veces para quien ve «propios»), y un `offset 0` que lo impida
-- lo rechaza la guarda de `escala.sql` (ninguna función pagina con `offset`).
--
-- Inventario (solo lectura, antes de editar): en lo que gobierna vehículos, sus fotos, sus notas y la papelera, `mis_leads()` aparecía sólo en estas dos. Lo demás hereda la
-- policy por RLS (fotos, versión de fotos, `lead_vehiculos`, `vehiculos_para_lead`, la ficha, seguimientos y recordatorios del lead, el tablero) o pasa por
-- `puede_vehiculo()`; la papelera se lee por funciones `definer` que no miran la cartera.

drop policy if exists "vehiculos: leer" on public.vehiculos;
create policy "vehiculos: leer" on public.vehiculos for select to authenticated using (
  eliminado_en is null
  and (
    origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'todos'))::uuid[])
    or (
      origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'propios'))::uuid[])
      and (creado_por = (select auth.uid()) or (lead_id is not null and public.en_cartera(lead_id)))
    )
  )
);

create or replace function public.puede_vehiculo(p_vehiculo uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case public.alcance_de(p_clave, v.origen_id)
             when 'todos' then true
             when 'propios' then v.creado_por = (select auth.uid()) or (v.lead_id is not null and public.en_cartera(v.lead_id))
             else false
           end
      from public.vehiculos v
     where v.id = p_vehiculo and v.eliminado_en is null
  ), false);
$$;
-- Las grants de `create or replace` se conservan (authenticated sí, anon y PUBLIC no).
