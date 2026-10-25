-- La policy de `cotizaciones` y `puede_cotizacion()` deciden fila a fila, no con un arreglo de toda la cartera (paso 4.10, prompt 1; `docs/PLAN.md`, «Lo que el
-- código de la Fase 0 trae y esta fase corrige»; `.claude/rules/escala.md`: «una policy no arma un arreglo de toda la cartera de quien mira»).
--
-- Hasta acá "cotizaciones: leer" y "cotizaciones: editar" preguntaban `lead_id in (select public.mis_leads())`: por consulta, Postgres armaba el conjunto
-- de todos los leads de la cartera de quien mira (80.000 la dueña con 212.000 leads) para saber si ESTA cotización cuelga de uno de ellos; y
-- `alcance_de('cotizaciones.ver', origen_id)` nombra una columna de la fila, así que corría dos veces por fila y cada vez leía los permisos de la persona.
-- Con 450.000 cotizaciones al año eso es lo que `escala.md` prohíbe. Ahora:
--
--   - Los orígenes donde se ve «todos» y donde se ve «propios» se calculan una vez por sentencia (`origenes_con_alcance()`, un InitPlan, como `vehiculos: leer`
--     de `…20261013000100`) y la fila sólo se compara con ellos.
--   - Lo «propio» es `creado_por = (select auth.uid())` o `en_cartera(lead_id)`: una búsqueda por `leads_asesores_usuario_vigente_idx`, que sólo corre en lo que no
--     es mío ni «todos». `en_cartera(lead)` ≡ `lead in (select mis_leads())` (las dos miran `leads_asesores` vigente de quien llama, sin mirar el lead): la visibilidad
--     no cambia. Al transferir un lead, la cartera nueva ve sus cotizaciones en el acto; quien se va, si queda como compartido, también las sigue viendo.
--   - La policy sigue escrita inline sobre las columnas, no con `puede_cotizacion(id)`: una función STABLE no ve la fila recién insertada (`insert … returning`) y
--     leería cada fila otra vez por su clave.
--
-- «cotizaciones: editar» conserva sus dos ramas, en USING y en WITH CHECK: la preventa por el alcance de `cotizaciones.editar`, y `cotizaciones.final.gestionar`
-- del origen (cualquier clase). La segunda nombraba una columna dentro de `tiene_permiso(…, origen_id)`: corría por fila; ahora es un arreglo de orígenes.
--
-- `puede_cotizacion(id, clave)` (la usan las RPC y las policies de storage y de las hijas) tiene la misma regla con `alcance_de` una sola vez y `en_cartera`.
--
-- Índices del listado (`order by creado_en desc, id desc`, cursor `(creado_en, id)`; el listado es del 4.16, la guarda de esta medición es la ruta que usará):
--   - `cotizaciones_listado_idx` camina todas, de la más nueva a la más vieja (la dueña y quien ve «todos»);
--   - `cotizaciones_creador_idx` pasa a llevar el `id` (sin él, `(creado_en, id) < cursor` no es una condición de índice): «Mías».

drop policy if exists "cotizaciones: leer" on public.cotizaciones;
create policy "cotizaciones: leer" on public.cotizaciones for select to authenticated using (
  eliminado_en is null
  and (
    origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'todos'))::uuid[])
    or (
      origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'propios'))::uuid[])
      and (creado_por = (select auth.uid()) or public.en_cartera(lead_id))
    )
  )
);

drop policy if exists "cotizaciones: editar" on public.cotizaciones;
create policy "cotizaciones: editar" on public.cotizaciones for update to authenticated
using (
  (
    eliminado_en is null and clase = 'preventa'
    and (
      origen_id = any ((select public.origenes_con_alcance('cotizaciones.editar', 'todos'))::uuid[])
      or (
        origen_id = any ((select public.origenes_con_alcance('cotizaciones.editar', 'propios'))::uuid[])
        and (creado_por = (select auth.uid()) or public.en_cartera(lead_id))
      )
    )
  )
  or origen_id = any ((select public.origenes_con_alcance('cotizaciones.final.gestionar', 'propios'))::uuid[])
)
with check (
  (
    eliminado_en is null and clase = 'preventa'
    and (
      origen_id = any ((select public.origenes_con_alcance('cotizaciones.editar', 'todos'))::uuid[])
      or (
        origen_id = any ((select public.origenes_con_alcance('cotizaciones.editar', 'propios'))::uuid[])
        and (creado_por = (select auth.uid()) or public.en_cartera(lead_id))
      )
    )
  )
  or origen_id = any ((select public.origenes_con_alcance('cotizaciones.final.gestionar', 'propios'))::uuid[])
);

create or replace function public.puede_cotizacion(p_cot uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select a.alcance = 'todos'
        or (a.alcance = 'propios' and (c.creado_por = (select auth.uid()) or public.en_cartera(c.lead_id)))
      from public.cotizaciones c
     cross join lateral (select public.alcance_de(p_clave, c.origen_id) as alcance) a
     where c.id = p_cot and c.eliminado_en is null
  ), false);
$$;
-- Las grants de `create or replace` se conservan (authenticated sí, anon y PUBLIC no).

create index if not exists cotizaciones_listado_idx on public.cotizaciones (creado_en desc, id desc) where eliminado_en is null;
drop index if exists public.cotizaciones_creador_idx;
create index cotizaciones_creador_idx on public.cotizaciones (creado_por, creado_en desc, id desc) where eliminado_en is null;
