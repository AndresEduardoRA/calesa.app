-- El listado «míos» por la cartera de quien mira (cierre 5a-fix-1a, `docs/PLAN.md` 5a-2).
--
-- Medido (`docs/RENDIMIENTO.md` › «Cierre 5a», A2 y «Cierre 5a-fix-1a»): la página 1 de una asesora con 3 leads descartaba 50.026
-- filas con 62.000 leads y 200.026 con 212.000 (18,5 → 62,8 ms). La policy de `leads` decide en tiempo de ejecución si la persona
-- ve «todos» o «propios» (`alcance` y `auth.uid()` son InitPlans), así que el plan genérico siempre camina `leads_listado_idx` con la
-- visibilidad como filtro y espera cortar enseguida: una persona con menos de una página lo camina entero. Reescribir la policy
-- no cambia eso (un plan genérico no cambia de camino al ejecutarse: medido, peor para todos).
--
-- Lo que sí se puede decidir antes de planear es la fuente. «Míos» (`en_cartera`) es lo que toda persona ve por defecto y lo que ve
-- siempre quien tiene «propios»; sus leads son las filas vigentes de `leads_asesores` de esa persona. Si esas filas llevan la fecha
-- de creación del lead y un índice por persona en el orden del listado, «míos» camina SU cartera y se corta en la página:
-- cuesta lo que pesa la cartera de quien mira, nunca la tabla.
--
-- - `leads_asesores.lead_creado_en`: copia de `leads.creado_en`. La llena un trigger al insertar y otro la sigue si el lead
--   cambia de fecha (nada lo hace hoy); nadie más la escribe.
-- - `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where
--   revocado_en is null`: `include` porque la policy de `leads_asesores` lee esas dos columnas; sin ellas el recorrido ordenado
--   va a la tabla por cada fila y, con una cartera grande, el planificador prefería un `Bitmap Heap Scan` y ordenar todo.
-- - `leads_cartera_vista`: `leads_vista` unida por `id` a las filas vigentes de quien mira. Es `security_invoker`: la regla de
--   visibilidad (`_lead_visible_para()`, la policy de `leads`) sigue aplicándose sola, una vez, y la policy de `leads_asesores`
--   también. Expone `la.lead_id` y `la.lead_creado_en` como `id` y `creado_en` (así el orden y el cursor caen en el índice
--   nuevo) y `true` en `en_cartera` y `telefono_visible`, que lo son por construcción: con la expresión original el planificador
--   estimaba que el filtro `en_cartera = true` descartaba filas y elegía ordenar todo el rango en vez de caminar el índice.
--   Nunca se une por `creado_en` (la estimación de la unión colapsa y el cursor no cruza de una columna a la otra).
-- - La lista de columnas de la vista nueva sale del catálogo, de `leads_vista`: se escribe una sola vez.

-- ---------------------------------------------------------------------------------------------------------------------
-- La columna y quien la llena
-- ---------------------------------------------------------------------------------------------------------------------
-- En una base viva (la base generada ya la trae).
alter table public.leads_asesores add column if not exists lead_creado_en timestamptz;

-- Se llena siempre desde el lead, aunque quien inserta mande otro valor. `security definer`: el lead recién creado todavía no
-- tiene cartera (`trg_lead_crear_dueno` inserta esta fila justo después) y la policy de `leads` no lo deja ver. Si el lead no
-- existe (la clave foránea va a fallar) se pone `now()` para que el error sea ése y no un nulo.
-- **`for no key update`**: si otra transacción cambia la fecha del lead a la vez (nada lo hace hoy), la inserción espera a que
-- confirme y lee la nueva; o la inserción va primero y quien cambia la fecha espera, y su trigger (`leads_creado_en_seguir`) ve
-- la fila ya confirmada. Sin el candado las dos pasaban a la vez y la copia quedaba vieja (`db:carreras`). No es `for share`: dos
-- inserciones del mismo lead que subieran después a `for update` (el trigger de la cartera) se interbloquearían. Las RPC que
-- escriben la cartera ya tienen el lead bloqueado `for update` (el mismo orden de siempre: `leads` y después `leads_asesores`).
create or replace function public.leads_asesores_creado_en()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select l.creado_en into new.lead_creado_en from public.leads l where l.id = new.lead_id for no key update;
  if not found then
    new.lead_creado_en := now();
  end if;
  return new;
end;
$$;
revoke all on function public.leads_asesores_creado_en() from public, anon, authenticated;
drop trigger if exists trg_leads_asesores_creado_en on public.leads_asesores;
create trigger trg_leads_asesores_creado_en before insert on public.leads_asesores
  for each row execute function public.leads_asesores_creado_en();

-- Lo que ya existía. Sin el trigger de la cartera: recalcularla en cada lead que se toca no cambia nada y tarda (una base
-- viva grande lo notaría); la fecha no entra en lo que ese trigger calcula.
do $$
begin
  if exists (select 1 from public.leads_asesores where lead_creado_en is null) then
    alter table public.leads_asesores disable trigger trg_leads_asesores_cartera_cambio;
    update public.leads_asesores la set lead_creado_en = l.creado_en
      from public.leads l where l.id = la.lead_id and la.lead_creado_en is null;
    alter table public.leads_asesores enable trigger trg_leads_asesores_cartera_cambio;
  end if;
end $$;
alter table public.leads_asesores alter column lead_creado_en set not null;

-- Si un lead cambia de fecha de creación, su copia lo sigue. Es el único camino que escribe la columna después del insert.
create or replace function public.leads_creado_en_seguir()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads_asesores set lead_creado_en = new.creado_en where lead_id = new.id;
  return null;
end;
$$;
revoke all on function public.leads_creado_en_seguir() from public, anon, authenticated;
drop trigger if exists trg_leads_creado_en_seguir on public.leads;
create trigger trg_leads_creado_en_seguir after update of creado_en on public.leads
  for each row when (old.creado_en is distinct from new.creado_en) execute function public.leads_creado_en_seguir();

-- Nadie más la cambia (ni el lead al que apunta una fila). Dentro de otro trigger (`pg_trigger_depth() > 1`) sí: es el de arriba.
create or replace function public.leads_asesores_creado_en_guarda()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() < 2 and (new.lead_id is distinct from old.lead_id or new.lead_creado_en is distinct from old.lead_creado_en) then
    raise exception 'La fecha de creación del lead en la cartera sigue a la del lead: no se cambia a mano.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.leads_asesores_creado_en_guarda() from public, anon, authenticated;
drop trigger if exists trg_leads_asesores_creado_en_guarda on public.leads_asesores;
create trigger trg_leads_asesores_creado_en_guarda before update of lead_id, lead_creado_en on public.leads_asesores
  for each row execute function public.leads_asesores_creado_en_guarda();

-- ---------------------------------------------------------------------------------------------------------------------
-- El índice
-- ---------------------------------------------------------------------------------------------------------------------
create index if not exists leads_asesores_listado_idx
  on public.leads_asesores (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en)
  where revocado_en is null;

-- ---------------------------------------------------------------------------------------------------------------------
-- Las dos vistas, de una sola función (la de siempre más la de «míos»)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._leads_vista_crear()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_columnas text;
begin
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
  comment on view public.leads_cartera_vista is 'leads_vista de los leads que están en la cartera de quien mira («míos»), recorridos por su cartera (leads_asesores_listado_idx) y no por la tabla: cuesta lo que pesa la cartera de quien mira, no cuántos leads hay (cierre 5a-fix-1a). Mismas columnas que leads_vista; id y creado_en salen de la fila de la cartera y en_cartera y telefono_visible son verdaderas por construcción. security_invoker: la regla de visibilidad (la policy de leads) se aplica igual. Lo que no es «míos» se lee de leads_vista.';
end;
$function$;

revoke all on function public._leads_vista_crear() from public, anon, authenticated;
select public._leads_vista_crear();

analyze public.leads_asesores;
