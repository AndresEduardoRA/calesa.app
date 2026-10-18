-- Parte 9j (3 de 3): se quita el enum `tipo_lead` y la columna `leads.tipo`.
--
-- Desde `…002900` nada de la app ni de la base los lee ni los escribe: el tipo de un lead es `leads.tipo_lead_id`, que apunta a
-- `tipos_lead`. Esta migración deja la vista y la versión del lead sin la columna vieja y la quita, junto con el enum que
-- `20261011000050_tipo_lead_legado.sql` creaba sólo para que las migraciones ya comprometidas se aplicaran tal como se escribieron.

-- La vista sin `tipo`
CREATE OR REPLACE FUNCTION public._leads_vista_crear()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  drop view if exists public.leads_vista;
  create view public.leads_vista with (security_invoker = true) as
  select l.id,
         (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id) as numero,
         l.nombre, l.telefono_cc,
         public.telefono_lead(l.id) as telefono_principal,
         coalesce((select auth.uid()) = any (l.cartera), false) as telefono_visible,
         l.tipo_lead_id, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null
                                                         and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])) as dueno_id,
         coalesce((select auth.uid()) = any (l.cartera), false) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas,
         (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio,
         (select np.creado_por from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio_de,
         (select coalesce((select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = np.creado_por), 'Otra persona')
            from public.leads_numeros_propios np
           where np.lead_id = l.id and np.creado_por <> (select auth.uid())) as numero_propio_creador,
         coalesce((select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                  (select np.numero::bigint from public.leads_numeros_propios np where np.lead_id = l.id)) as numero_visible,
         l.atributos_publicos
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
  comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera (atributos), y la copia de lo público (atributos_publicos, para filtrar un campo público). en_cartera = el lead está en la cartera de quien mira («míos»), de leads.cartera. Las marcas son de quien mira. security_invoker: la RLS de leads decide qué filas hay.';
end;
$function$;

revoke all on function public._leads_vista_crear() from public, anon, authenticated;
-- `drop view` + `create view`: la columna vieja deja de estar en la lista.
select public._leads_vista_crear();

-- La versión de un lead: su tipo es `tipo_lead_id`
create or replace function public.lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.tipo_lead_id, new.origen_lead_id, new.atributos, new.telefono_principal,
      new.telefono_cc, new.eliminado_en, new.lote_papelera_id)
     is distinct from
     (old.nombre, old.tipo_lead_id, old.origen_lead_id, old.atributos, old.telefono_principal,
      old.telefono_cc, old.eliminado_en, old.lote_papelera_id) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

-- La columna y el enum
revoke select (tipo) on table public.leads from authenticated;
alter table public.leads drop column tipo;
drop type public.tipo_lead;
