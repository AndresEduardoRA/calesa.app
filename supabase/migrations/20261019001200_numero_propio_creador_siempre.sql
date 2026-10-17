-- El nombre de quien creó el lead cuando el número propio que se ve no es de quien mira: nunca nulo.
-- Antes llegaba nulo si el creador tenía el nombre en blanco o ya no tenía perfil, y la pantalla leía nulo como
-- «es tuyo» («Tu n.º 2» sobre un lead de Ana). Ahora nulo quiere decir sólo una cosa: el propio es de quien mira.
-- `leads_vista` lo calcula como subconsulta de la lista de columnas (después del límite, sólo para las filas que salen).
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
         public.en_cartera(l.id) as telefono_visible,
         l.tipo, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
         public.en_cartera(l.id) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas,
         (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio,
         (select np.creado_por from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio_de,
         (select coalesce((select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = np.creado_por), 'Otra persona')
            from public.leads_numeros_propios np
           where np.lead_id = l.id and np.creado_por <> (select auth.uid())) as numero_propio_creador,
         coalesce((select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                  (select np.numero::bigint from public.leads_numeros_propios np where np.lead_id = l.id)) as numero_visible
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
end;
$$;
select public._leads_vista_crear();

-- La ficha repite lo de la vista (una sola regla): el nombre que calculó `leads_vista`.
create or replace function public.lead_ficha(p_lead uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'numero_propio', v.numero_propio, 'numero_propio_de', v.numero_propio_de,
    'numero_propio_creador', v.numero_propio_creador,
    'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    -- Hasta 101 (el aviso dice «más de 100»); índice `vehiculos_lead_idx`.
    'vehiculos_vinculados', (select count(*) from (select 1 from public.vehiculos x where x.lead_id = p_lead limit 101) q),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;
