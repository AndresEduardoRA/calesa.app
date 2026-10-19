-- Buscar un número de lead: con `leads.numero_global.ver`, el global y también los propios de cualquier creador (cierre de la búsqueda por número ajeno).
--
-- Hasta hoy `#30` resolvía un solo número: con el permiso el global, sin él el propio de quien busca (`docs/DECISIONES.md`, 9f-2). La dueña que escribía 30 no encontraba el lead de Berta cuyo
-- n.º propio es 30 (y su global 62); Berta sí. Ahora, con el permiso, 30 encuentra el global 30 **y** el propio 30 de cada creador, de los leads que la persona ya ve.
--
-- Una función de invocador, sin índice, trigger ni columna nuevos (el costo de escribir no cambia): el global por `leads_numeros_globales_numero_key` y, por cada persona del equipo (`perfiles`,
-- decenas), una bajada de `leads_numeros_propios_creador_idx (creado_por, numero)` — Postgres 17 no hace _skip scan_, así que `numero = n` solo no usaría ese índice y se le da el creador. Medido con
-- 62.000 y con 212.000 leads: 2,4 ms la dueña, 1,3 a 1,7 Ana, igual con los dos volúmenes (un índice sólo por `numero`: 0,7 ms, pero una entrada más por cada alta y fila importada).
--
-- Quién ve qué lo sigue decidiendo la policy de las dos copias, que es la regla (`tiene_permiso` en vivo y un lead que se ve): llamarla con `p_todos = true` sin el permiso devuelve sólo el propio de quien
-- llama (nunca el global ni el propio de otro: ningún oráculo); con el permiso revocado a mitad de sesión, lo mismo. `p_todos` sólo dice qué creadores se preguntan (todos o quien llama), no qué se ve.
-- Un número que no cabe en la columna (`integer`) o no es positivo no tiene propio: vacío, sin error. Como mucho 100 ids (un equipo de más de 99 personas con el mismo número propio
-- es el único modo de pasar: la URL del listado lleva los ids).

create or replace function public.leads_ids_del_numero(p_numero bigint, p_todos boolean)
returns uuid[] language sql stable set search_path = '' as $$
  select coalesce(array(
    select t.lead_id
      from (
        select g.lead_id, 0 as orden
          from public.leads_numeros_globales g
         where p_todos and g.numero = p_numero
        union all
        select n.lead_id, 1
          from (select p.id from public.perfiles p where p_todos
                union all
                select (select auth.uid()) where not p_todos) c
         cross join lateral (select np.lead_id
                               from public.leads_numeros_propios np
                              where np.creado_por = c.id and np.numero = p_numero
                                and p_numero between 1 and 2147483647) n
      ) t
     group by t.lead_id
     order by min(t.orden), t.lead_id
     limit 100), '{}'::uuid[])
$$;
revoke all on function public.leads_ids_del_numero(bigint, boolean) from public, anon;
grant execute on function public.leads_ids_del_numero(bigint, boolean) to authenticated;
comment on function public.leads_ids_del_numero(bigint, boolean) is 'Los ids de los leads que quien llama ve con ese número: con p_todos, el global y el propio de cualquier creador (sólo con leads.numero_global.ver; sin él, el propio de quien llama); sin p_todos, el propio de quien llama. Invocador: la policy de las copias decide. Como mucho 100. Lo usa la búsqueda del listado y la exportación.';
