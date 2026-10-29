-- Las vistas de la app (`security_invoker`) se leen y nunca se escriben, y anon no toca `public` (sólo el esquema `web`).
--
-- Los privilegios por defecto de Supabase les daban todo a anon y a authenticated: la escritura no llegaba a ninguna fila (la
-- vista corre con los derechos de quien la usa, y ninguno escribe las tablas de abajo), pero el privilegio estaba y
-- `supabase/tests/listado-cartera.sql` lo daba por cerrado. La prueba pasaba en PGlite, que no tiene esos privilegios por
-- defecto; lo destapó el aplastado de las migraciones, que los escribe explícitos (docs/PREPARACION.md, etapa 1).
-- La app sólo las lee con `.select()`: `leads_vista`, `leads_cartera_vista`, `etiquetas_vista`, `recordatorios_vista`
-- y `estado_cola_web`.

revoke all on public.leads_vista, public.leads_cartera_vista, public.etiquetas_vista, public.recordatorios_vista,
  public.estado_cola_web from anon;

revoke insert, update, delete, truncate, references, trigger, maintain on public.leads_vista, public.leads_cartera_vista,
  public.etiquetas_vista, public.recordatorios_vista, public.estado_cola_web from authenticated;

-- `_leads_vista_crear()` borra y recrea `leads_vista` y `leads_cartera_vista`: al recrearlas, los privilegios por defecto vuelven a
-- dárselo todo a anon y a authenticated. Desde aquí la función los quita cada vez (lo demás, igual que en la base).
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
         l.atributos_publicos
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
  -- Se lee, nunca se escribe, y anon no la toca: lo que darían los privilegios por defecto de Supabase al recrearla se quita aquí.
  revoke all on public.leads_vista from anon;
  revoke insert, update, delete, truncate, references, trigger, maintain on public.leads_vista from authenticated;
  comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera (atributos), y la copia de lo público (atributos_publicos, para filtrar un campo público). en_cartera = el lead está en la cartera de quien mira («míos»), de leads.cartera. Las marcas son de quien mira. security_invoker: la RLS de leads decide qué filas hay.';

  -- «Míos» por la cartera de quien mira: las mismas columnas, en el mismo orden, con `id` y `creado_en` de la fila de la cartera.
  select string_agg(
           case a.attname
             when 'id' then 'la.lead_id as id'
             when 'creado_en' then 'la.lead_creado_en as creado_en'
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
  comment on view public.leads_cartera_vista is 'leads_vista de los leads que están en la cartera de quien mira («míos»), recorridos por su cartera (leads_asesores_listado_idx) y no por la tabla: cuesta lo que pesa la cartera de quien mira, no cuántos leads hay (cierre 5a-fix-1a). Mismas columnas que leads_vista; id y creado_en salen de la fila de la cartera y en_cartera y telefono_visible son verdaderas por construcción. security_invoker: la regla de visibilidad (la policy de leads) se aplica igual. Lo que no es «míos» se lee de leads_vista.';
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
