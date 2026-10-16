-- Escala (9e): favoritos y tachados de `leads_vista` como unión, no como subselect de la lista de columnas.
--
-- Con el `COST` verdadero de `atributos_lead()` (`…20261019000100`) el planificador ya camina el índice del
-- listado, pero quedaba un caso caro y muy común: **quien no tiene ningún tachado**. El aviso de tachados
-- ocultos (en cada carga de `/leads`) pregunta `esta_tachado = true … limit 51`, y como `esta_tachado` era un
-- `exists (select …)` dentro de la lista de columnas, Postgres no lo podía volver una unión: caminaba toda la
-- cartera visible buscando 51 que no existen (61 ms con 7.000 leads, ~300 ms con 50.000). Lo mismo con «sólo
-- favoritos» de quien no tiene ninguno.
--
-- `es_favorito` y `esta_tachado` salen de un `left join` por la clave primaria `(lead_id, usuario_id)` de
-- `leads_favoritos` y `leads_tachados` de quien mira: un filtro sobre ellos se vuelve una unión (o una
-- anti-unión) y arranca por la tabla chica. Misma semántica: a lo sumo una fila por lead y persona.
-- Medido con 50.000 leads: sin tachados, 61 → 0,2 ms (b1) y la página 1 igual. (Sin el `COST` verdadero esta
-- unión era frágil —un filtro mal estimado elegía un `Nested Loop` con un `Seq Scan` por fila—; con él, no.)
-- `db:medir:volumen` asserta el tiempo de esos casos.

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
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
         public.en_cartera(l.id) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
end;
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;

select public._leads_vista_crear();
