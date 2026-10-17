-- La visibilidad de un lead, escrita una sola vez y en una forma que el planificador estima (9h). Tercera de tres partes:
-- `…001400` guardó la cartera y los atributos públicos en la fila, `…001500` cambia la privacidad por lotes.
--
-- Lo medido con 50.000 leads (`docs/DECISIONES.md`, 9h): la policy de `leads` se estimaba en un 0,37 % de la cartera viva
-- (188 filas; pasan 50.000 para la dueña y 2.400 para Ana). `(select alcance_de('leads.ver')) = 'todos'`, sola, es un
-- One-Time Filter; dentro de un `OR` es un `Param = const` sin estadísticas y vale 0,005, y `not (select lead_en_limbo(id))`
-- es un SubPlan por fila que vale 0,5. Con `limit 101` y ~150 estimadas, leer toda la cartera y ordenar le parecía tan
-- barato como caminar `leads_listado_idx` (518 ms la página 1 a 100 filas; 870 ms «míos» de la dueña; 4,4 s un filtro sin
-- resultados, con `atributos_lead()` en cada fila).
--
-- - `_lead_visible_para(eliminado_en, cartera, alcance, yo)` es la regla: vivo, fuera del limbo (cartera no vacía) y con
--   «todos», o con «propios» y en la cartera. SQL inmutable y sin `set`: se inlinea, así el planificador ve la expresión.
--   La usan la policy de `leads`, `puede_lead()` y `atributos_lead()`, que antes la repetían cada una a su manera.
-- - Se escribe `nullif(case … end, false) is not null` **a propósito**: un `is not null` sin estadísticas vale 0,995, lo
--   cierto para quien ve «todos», y para «propios» deja al planificador del lado seguro (caminar el índice y cortar). Con
--   el `case` a secas valía 0,5 y un filtro opaco (0,005) volvía a dejar la estimación bajo el límite.
-- - `leads_vista.en_cartera` y `telefono_visible` salen de la cartera de la fila, no de `en_cartera()` por fila, y la vista
--   suma `atributos_publicos` (para filtrar un campo público sin `atributos_lead()`). `authenticated` lee `cartera` (no da
--   nada que `leads_asesores` no dé ya de un lead que se ve) y `atributos_publicos` (lo que ya recibe quien ve el lead sin
--   la cartera); `atributos`, el teléfono y los números siguen sin grant.

do $$
begin
  if exists (select 1 from public.leads where cartera is null or atributos_publicos is null) then
    raise exception 'Quedan leads sin la cartera o sin los atributos públicos: llama select public._leads_derivados_rellenar(5000) hasta que devuelva 0 y vuelve a aplicar esta migración.';
  end if;
end $$;
alter table public.leads alter column cartera set default '{}', alter column cartera set not null;
alter table public.leads alter column atributos_publicos set default '{}'::jsonb, alter column atributos_publicos set not null;

-- La regla.
create or replace function public._lead_visible_para(p_eliminado_en timestamptz, p_cartera uuid[], p_alcance public.alcance_permiso, p_yo uuid)
returns boolean language sql immutable parallel safe as $$
  select p_eliminado_en is null
     and p_cartera <> '{}'
     and nullif(case p_alcance when 'todos' then true when 'propios' then p_yo = any (p_cartera) end, false) is not null
$$;
comment on function public._lead_visible_para(timestamptz, uuid[], public.alcance_permiso, uuid) is
  'La regla de quién ve un lead (9h): vivo, con alguien en la cartera y con «todos», o con «propios» y en la cartera. Se inlinea en la policy de leads; la usan también puede_lead() y atributos_lead(). La forma con nullif … is not null es para que el planificador la estime en ~1 (docs/DECISIONES.md, 9h).';

alter policy "leads: leer" on public.leads
  using (public._lead_visible_para(eliminado_en, cartera, (select public.alcance_de('leads.ver')), (select auth.uid())));

-- ¿Puedo hacer p_clave sobre este lead? La misma regla, con el alcance de esa clave.
create or replace function public.puede_lead(p_lead uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l
     where l.id = p_lead
       and public._lead_visible_para(l.eliminado_en, l.cartera, public.alcance_de(p_clave), (select auth.uid()))
  );
$$;

-- Los atributos que quien mira recibe de un lead: todos si es de su cartera; si no, sólo las claves que el layout conoce
-- como no privadas (falla cerrada); nada si no ve el lead. Misma semántica que antes, con la regla de arriba.
create or replace function public.atributos_lead(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  -- Fuera de la consulta: llamada desde adentro, la función SQL se vuelve a planificar en cada llamada (265 µs contra 66).
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_atributos jsonb;
  v_cartera boolean;
  v_visible boolean;
begin
  select l.atributos, v_yo = any (l.cartera), public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo)
    into v_atributos, v_cartera, v_visible
  from public.leads l
  where l.id = p_lead;
  if not found or not v_visible then
    return null;
  end if;
  if v_cartera then
    return v_atributos;
  end if;
  return coalesce((
    select jsonb_object_agg(e.key, e.value)
    from jsonb_each(v_atributos) e
    where exists (select 1 from public.leads_campos c where c.clave = e.key and not c.solo_cartera)
  ), '{}'::jsonb);
end;
$$;
alter function public.atributos_lead(uuid) cost 20000;
revoke all on function public.atributos_lead(uuid) from public, anon;
grant execute on function public.atributos_lead(uuid) to authenticated;

grant select (cartera, atributos_publicos) on table public.leads to authenticated;

create or replace function public._leads_vista_crear()
 returns void
 language plpgsql
 security definer
 set search_path = ''
as $$
begin
  drop view if exists public.leads_vista;
  create view public.leads_vista with (security_invoker = true) as
  select l.id,
         (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id) as numero,
         l.nombre, l.telefono_cc,
         public.telefono_lead(l.id) as telefono_principal,
         coalesce((select auth.uid()) = any (l.cartera), false) as telefono_visible,
         l.tipo, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
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
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;
select public._leads_vista_crear();
