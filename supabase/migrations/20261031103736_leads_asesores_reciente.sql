-- «Míos» del panel del cliente (4.14-3a), por lo más reciente: el último seguimiento vivo del lead o, sin ninguno, su alta.
--
-- `leads_asesores.lead_reciente_en` es una copia en la cartera de `coalesce(leads.ultimo_seguimiento_en, leads.creado_en)`, como
-- `lead_creado_en` lo es de `leads.creado_en`: sirve para recorrer la cartera de una persona ordenada por lo reciente con un índice
-- (`leads_asesores_reciente_idx`) y sin leer `leads`. Nunca es nula. La llena el `before insert` (con el lead tomado `for no key update`)
-- y la sigue `leads_reciente_seguir()` en TODAS las filas del lead, también las revocadas: compartir revive una fila por
-- `on conflict do update`, y ahí lo que calcula el `before insert` se descarta. Nadie más la escribe (la guarda del trigger).
-- Las dos vistas la exponen como `reciente_en`. Ninguna policy, grant de la app ni RPC nueva.

alter table public.leads_asesores add column lead_reciente_en timestamptz;

comment on column public.leads_asesores.lead_reciente_en is
  'Copia de coalesce(leads.ultimo_seguimiento_en, leads.creado_en): lo más reciente del lead, para ordenar la cartera de una persona (leads_asesores_reciente_idx). Está en todas las filas del lead, también las revocadas. La mantienen triggers; nadie la escribe.';

-- El relleno: invocador, sin `execute` para la app, y la llama la migración una vez. Devuelve cuántas filas cambió; llamada otra vez no cambia nada.
create function public._leads_asesores_reciente_rellenar() returns integer
  language plpgsql
  set search_path = ''
as $$
declare n integer;
begin
  update public.leads_asesores la set lead_reciente_en = coalesce(l.ultimo_seguimiento_en, l.creado_en)
    from public.leads l
   where l.id = la.lead_id and la.lead_reciente_en is distinct from coalesce(l.ultimo_seguimiento_en, l.creado_en);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public._leads_asesores_reciente_rellenar() from public, anon, authenticated;

comment on function public._leads_asesores_reciente_rellenar() is
  'Relleno de leads_asesores.lead_reciente_en (paso 4.14-3a) con lo reciente de su lead. La llama la migración una vez, con trg_leads_asesores_cartera_cambio apagado (el relleno no cambia quién tiene qué lead).';

-- Sin el recálculo de la cartera: encendido, el `update` de toda la cartera tomaría todos los leads `for update` y recalcularía todas las carteras para nada.
alter table public.leads_asesores disable trigger trg_leads_asesores_cartera_cambio;
select public._leads_asesores_reciente_rellenar();
alter table public.leads_asesores enable trigger trg_leads_asesores_cartera_cambio;

alter table public.leads_asesores alter column lead_reciente_en set not null;

-- Al entrar a la cartera: lo reciente del lead, en la misma lectura que ya hacía para el alta.
create or replace function public.leads_asesores_creado_en() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  select l.creado_en, coalesce(l.ultimo_seguimiento_en, l.creado_en) into new.lead_creado_en, new.lead_reciente_en
    from public.leads l where l.id = new.lead_id for no key update;
  if not found then
    new.lead_creado_en := now();
    new.lead_reciente_en := now();
  end if;
  return new;
end;
$$;

-- Nadie la escribe a mano: sólo los triggers, que corren a profundidad 2 o más.
create or replace function public.leads_asesores_creado_en_guarda() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if pg_trigger_depth() < 2 then
    if new.lead_id is distinct from old.lead_id or new.lead_creado_en is distinct from old.lead_creado_en then
      raise exception 'La fecha de creación del lead en la cartera sigue a la del lead: no se cambia a mano.' using errcode = '23514';
    end if;
    if new.lead_reciente_en is distinct from old.lead_reciente_en then
      raise exception 'Lo reciente del lead en la cartera sigue al lead: no se cambia a mano.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger trg_leads_asesores_creado_en_guarda
  before update of lead_id, lead_creado_en, lead_reciente_en on public.leads_asesores
  for each row execute function public.leads_asesores_creado_en_guarda();

-- Al cambiar el lead: la copia sigue a lo reciente en todas las filas de su cartera (también las revocadas).
create function public.leads_reciente_seguir() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  update public.leads_asesores set lead_reciente_en = coalesce(new.ultimo_seguimiento_en, new.creado_en)
   where lead_id = new.id and lead_reciente_en is distinct from coalesce(new.ultimo_seguimiento_en, new.creado_en);
  return null;
end;
$$;

revoke all on function public.leads_reciente_seguir() from public, anon, authenticated;

create trigger trg_leads_reciente_seguir
  after update of ultimo_seguimiento_en, creado_en on public.leads
  for each row
  when (coalesce(old.ultimo_seguimiento_en, old.creado_en) is distinct from coalesce(new.ultimo_seguimiento_en, new.creado_en))
  execute function public.leads_reciente_seguir();

-- «Míos» por lo más reciente: la página de quien mira por `leads_cartera_vista order by reciente_en desc, id desc`, con y sin cursor, sin ordenar.
create index leads_asesores_reciente_idx on public.leads_asesores (usuario_id, lead_reciente_en desc, lead_id desc) where revocado_en is null;

comment on table public.leads_asesores is 'Cartera: quién tiene acceso a qué lead y cómo (dueño, compartido, adoptado del limbo). Un lead tiene a lo sumo un dueño vigente. lead_creado_en y lead_reciente_en son copias de leads.creado_en y de coalesce(leads.ultimo_seguimiento_en, leads.creado_en) para ordenar la cartera de una persona sin recorrer leads (las mantienen triggers; nadie las escribe).';

-- Las dos vistas, con `reciente_en` (el resto de la función, igual que en 20261028181638).
CREATE OR REPLACE FUNCTION "public"."_leads_vista_crear"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare v_columnas text;
begin
  drop function if exists public.leads_vista_por_ids(uuid[]);
  drop view if exists public.leads_cartera_vista;
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
         l.atributos_publicos,
         coalesce(l.ultimo_seguimiento_en, l.creado_en) as reciente_en
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
  -- Se lee, nunca se escribe, y anon no la toca: lo que darían los privilegios por defecto de Supabase al recrearla se quita aquí.
  revoke all on public.leads_vista from anon;
  revoke insert, update, delete, truncate, references, trigger, maintain on public.leads_vista from authenticated;
  comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera (atributos), y la copia de lo público (atributos_publicos, para filtrar un campo público). en_cartera = el lead está en la cartera de quien mira («míos»), de leads.cartera. reciente_en = el último seguimiento vivo del lead o, sin ninguno, su alta (el orden de «míos» del panel del cliente). Las marcas son de quien mira. security_invoker: la RLS de leads decide qué filas hay.';

  -- «Míos» por la cartera de quien mira: las mismas columnas, en el mismo orden, con `id` y `creado_en` de la fila de la cartera.
  select string_agg(
           case a.attname
             when 'id' then 'la.lead_id as id'
             when 'creado_en' then 'la.lead_creado_en as creado_en'
             when 'reciente_en' then 'la.lead_reciente_en as reciente_en'
             when 'en_cartera' then 'true as en_cartera'
             when 'telefono_visible' then 'true as telefono_visible'
             else 'v.' || quote_ident(a.attname)
           end, ', ' order by a.attnum)
    into v_columnas
    from pg_attribute a
   where a.attrelid = 'public.leads_vista'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'create view public.leads_cartera_vista with (security_invoker = true) as select ' || v_columnas
       || ' from public.leads_asesores la join public.leads_vista v on v.id = la.lead_id'
       || ' where la.usuario_id = (select auth.uid()) and la.revocado_en is null';
  revoke all on public.leads_cartera_vista from anon;
  grant select on public.leads_cartera_vista to authenticated;
  revoke insert, update, delete, truncate, references, trigger, maintain on public.leads_cartera_vista from authenticated;
  comment on view public.leads_cartera_vista is 'leads_vista de los leads que están en la cartera de quien mira («míos»), recorridos por su cartera (leads_asesores_listado_idx por el alta, leads_asesores_reciente_idx por lo reciente) y no por la tabla: cuesta lo que pesa la cartera de quien mira, no cuántos leads hay (cierre 5a-fix-1a). Mismas columnas que leads_vista; id, creado_en y reciente_en salen de la fila de la cartera (lead_creado_en y lead_reciente_en, copias que mantienen triggers) y en_cartera y telefono_visible son verdaderas por construcción. security_invoker: la regla de visibilidad (la policy de leads) se aplica igual. Lo que no es «míos» se lee de leads_vista.';
  -- La página de una búsqueda por candidatos (5a-fix-1b): `leads_vista` de los leads con esos ids. Invocador y SQL puro, `stable`, sin `strict`, sin `set` y sin
  -- `security definer`: así Postgres la inlinea en la consulta de PostgREST y los filtros, el cursor, el orden y el límite que le suma la app se empujan adentro
  -- (las columnas caras sólo se calculan para las filas que salen). Con cualquiera de esas cinco cosas deja de inlinearse y calcula todas las filas de los ids.
  -- Una prueba del catálogo (`busqueda-leads.sql`) falla si pierde esa forma. La RLS de `leads` decide, como siempre, qué filas hay.
  create function public.leads_vista_por_ids(p_leads uuid[]) returns setof public.leads_vista
    language sql stable as $por_ids$ select * from public.leads_vista v where v.id = any (p_leads) $por_ids$;
  revoke all on function public.leads_vista_por_ids(uuid[]) from public, anon;
  grant execute on function public.leads_vista_por_ids(uuid[]) to authenticated;
  comment on function public.leads_vista_por_ids(uuid[]) is 'leads_vista de los leads con esos ids (el segundo paso de la búsqueda por candidatos, 5a-fix-1b). Invocador: la RLS de leads decide qué filas hay. Se inlinea en la consulta de PostgREST: no le pongas strict, search_path, security definer ni volatile.';
end;
$_$;

select public._leads_vista_crear();
