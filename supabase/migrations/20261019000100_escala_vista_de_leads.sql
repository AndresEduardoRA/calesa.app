-- Escala (9e): filtrar la lista de leads con decenas de miles de leads.
--
-- Medido con 50.000 leads como la dueña («todos», `pnpm db:medir:volumen`): filtrar por un atributo que
-- coincide con un cuarto de los leads tardaba 3,8 s, «sólo favoritos» 321 ms y filtrar por una etiqueta
-- 667 ms, aunque la primera página sin filtro tarda 9 ms. No era el índice sino el plan: la vista
-- calcula `atributos` con `atributos_lead(id)` (un plpgsql `security definer` que mira el alcance, la
-- cartera y el limbo: unos 75 µs por llamada, medidos), y Postgres la tomaba por una función barata
-- (`COST` 100 = 0,25 unidades). Con ese costo le convenía leer todos los leads, calcular `atributos`
-- en cada uno y ordenar, en vez de caminar `leads_listado_idx` en orden y cortar en cuanto juntara 51
-- coincidencias. Con el costo verdadero (`COST` 20000) elige caminar el índice: un atributo que
-- coincide con un cuarto pasa de 3,8 s a 25 ms, «sólo favoritos» a 30 ms, una etiqueta a 85 ms.
-- Lo que no se puede evitar es que un filtro que no coincide con nadie recorra la cartera visible
-- entera (75 µs por lead): queda anotado en `docs/RENDIMIENTO.md` con su presupuesto.
--
-- `cotizaciones_count` sale de la vista: nadie la lee y era un `count(*)` por fila escondido.
-- La RLS de `leads` y las funciones que recortan teléfono y atributos no cambian.

alter function public.atributos_lead(uuid) cost 20000;

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
         public.en_cartera(l.id) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas
  from public.leads l;
  grant select on public.leads_vista to authenticated;
end;
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;

select public._leads_vista_crear();
