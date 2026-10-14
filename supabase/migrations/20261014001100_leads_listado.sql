-- Listado de leads (Fase 3, parte 3).
--
-- 1. `leads_vista.en_cartera`: quién tiene el lead en su cartera (dueño, compartido o adoptado). Es
--    lo que significa «míos» en el listado: la misma regla que decide el teléfono completo
--    (`en_cartera()`), dicha con su nombre para que la pantalla no dependa de que dos reglas
--    coincidan por casualidad. Lo que ve cada quien lo sigue decidiendo la RLS de `leads`.
-- 2. `leads_listado_idx`: el orden del listado (`creado_en desc, id desc`) para los leads vivos.
--    Bajo RLS un filtro sobre `atributos` o `nombre` no usa un índice propio (`ilike` y `@>` no
--    son leakproof); lo que lo hace barato es caminar este índice en orden y cortar en la página.

create index if not exists leads_listado_idx
  on public.leads (creado_en desc, id desc)
  where eliminado_en is null;

-- La definición de la vista, con la columna nueva al final. Se vuelve a crear con la misma
-- función de siempre: es la única definición de `leads_vista`.
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
         public.en_cartera(l.id) as en_cartera
  from public.leads l;
  grant select on public.leads_vista to authenticated;
end;
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;

select public._leads_vista_crear();

comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera. `en_cartera` = el lead está en la cartera de quien mira («míos» del listado). security_invoker: la RLS de leads decide qué filas hay.';
