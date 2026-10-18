-- Parte 9j (1 de 3): los tipos de lead son una tabla.
--
-- Hasta acá el tipo de un lead era el enum `tipo_lead` ('prospecto' | 'cliente') y sus nombres estaban escritos en el código.
-- Ahora `tipos_lead` (la tabla y la columna `leads.tipo_lead_id` viven en `schemas/05_leads/01_leads.sql`, y por eso en la
-- migración base) guarda los que la empresa configure, cada uno de una CLASE fija —«prospecto» o «cliente»— que no cambia.
-- Esta migración siembra los dos tipos de siempre con las mismas claves que tenía el enum (`prospecto`, `cliente`: las URL, las
-- vistas guardadas y las importaciones que los nombran siguen valiendo), da la lectura a quien tiene sesión, y deja la vista con la
-- columna nueva. Las RPC y los triggers van en `…002900`; el enum y la columna `tipo` se quitan en `…003000`.
--
-- Los leads que ya existieran: una base hecha con la base anterior no tiene esta tabla ni esta columna y no se actualiza con
-- migraciones sino con `pnpm db:reset` (docs/DECISIONES.md, 2026-10-15: con `db:reset` disponible no hace falta que la
-- migración convierta datos vivos; aún no hubo `db push`). Una base nueva nace sin leads.

insert into public.tipos_lead (clave, nombre, clase, orden)
values ('prospecto', 'Prospecto', 'prospecto', 10), ('cliente', 'Cliente', 'cliente', 20)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- Sólo lectura para la app (la escriben tipo_lead_*, en …002900)
-- ---------------------------------------------------------------------------
revoke all on table public.tipos_lead from anon, authenticated;
grant select, insert, update, delete on table public.tipos_lead to service_role;
grant select on table public.tipos_lead to authenticated;
drop policy if exists "tipos_lead: leer" on public.tipos_lead;
create policy "tipos_lead: leer" on public.tipos_lead for select to authenticated using (true);

-- La vista lee la columna con los derechos de quien mira (`security_invoker`).
grant select (tipo_lead_id) on table public.leads to authenticated;
create index if not exists leads_tipo_lead_id_idx on public.leads (tipo_lead_id);

-- ---------------------------------------------------------------------------
-- Un lead sin tipo recibe el de por defecto
-- ---------------------------------------------------------------------------
-- El tipo que propone el alta y que recibe un lead que llega sin tipo (una fila del CSV, una prueba, la semilla): el primero activo
-- de la clase «prospecto» por orden. Cambiar cuál es, es ordenar la lista.
create or replace function public._tipo_lead_por_defecto()
returns uuid language sql stable security definer set search_path = '' as $$
  select t.id from public.tipos_lead t where t.clase = 'prospecto' and t.activo order by t.orden, t.nombre limit 1;
$$;
revoke all on function public._tipo_lead_por_defecto() from public, anon, authenticated;

-- Va antes de `trg_lead_tipo_vigente` (`…002900`: que el tipo no esté apagado) por el orden alfabético de los nombres.
create or replace function public.lead_tipo_por_defecto()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo_lead_id is null then
    new.tipo_lead_id := public._tipo_lead_por_defecto();
    if new.tipo_lead_id is null then
      raise exception 'No hay un tipo de lead activo de la clase prospecto: activa uno en Configuración.' using errcode = '22023', hint = 'tipo_lead_id';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.lead_tipo_por_defecto() from public, anon, authenticated;
drop trigger if exists trg_lead_tipo_por_defecto on public.leads;
create trigger trg_lead_tipo_por_defecto before insert on public.leads
  for each row execute function public.lead_tipo_por_defecto();

-- ---------------------------------------------------------------------------
-- La vista suma `tipo_lead_id` (la columna `tipo` sigue hasta …003000, para que lo que la lee no se rompa a mitad de camino)
-- ---------------------------------------------------------------------------
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
         l.tipo, l.tipo_lead_id, l.origen_lead_id,
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
select public._leads_vista_crear();

-- ---------------------------------------------------------------------------
-- La versión de un lead la mueve también cambiar su tipo
-- ---------------------------------------------------------------------------
-- Las dos columnas hasta que `…003000` quite `tipo`: la versión es lo que el formulario de edición manda de vuelta, y un tipo
-- cambiado por otra pestaña tiene que dar conflicto.
create or replace function public.lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.tipo, new.tipo_lead_id, new.origen_lead_id, new.atributos, new.telefono_principal,
      new.telefono_cc, new.eliminado_en, new.lote_papelera_id)
     is distinct from
     (old.nombre, old.tipo, old.tipo_lead_id, old.origen_lead_id, old.atributos, old.telefono_principal,
      old.telefono_cc, old.eliminado_en, old.lote_papelera_id) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
