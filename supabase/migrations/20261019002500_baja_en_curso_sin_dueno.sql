-- Mientras una baja está en curso, los demás ven el estado final: quien está en baja ya no es el dueño (cierre 2, paso 0a).
--
-- El cierre 1 hizo que la regla de visibilidad, «Quién lo tiene», el limbo y la verificación del teléfono contaran a quien está
-- en una baja en curso como ya fuera (`_bajas_en_curso()`), pero tres lecturas seguían nombrándolo dueño: `leads_vista.dueno_id`,
-- `lead_ficha()` (la cabecera de la ficha de una asesora decía «Lo tiene Pía» mientras «Quién lo tiene» ya no la nombraba) y
-- `web.portal_snapshot()` (el asesor del portal, con su WhatsApp). Las tres llevan el mismo filtro.
--
-- Medir `dueno_id` (la medición del listado no lo pedía y la app sí) mostró que la página de la dueña con 62.000 leads cuesta
-- 30 ms y no los 12 que decía la medición: el subselect de `dueno_id` pasa por la policy de `leads_asesores`, que llamaba
-- `puede_lead()` y `en_cartera()` (dos funciones `definer`) por cada fila. La policy dice lo mismo con una sola subconsulta a
-- `leads` (cuya policy ya es la regla de visibilidad, `leads.ver`) y la copia de la cartera de la fila: devuelve exactamente las
-- mismas filas (misma huella md5 de toda la tabla para la dueña y para una asesora, medida antes de escribir esto) y la página
-- baja de 30 a 13 ms.

-- Quién ve una fila de `leads_asesores`: un lead que ve y, de él, el dueño vigente o la fila de una cartera a la que pertenece.
drop policy if exists "leads_asesores: leer" on public.leads_asesores;
create policy "leads_asesores: leer" on public.leads_asesores for select to authenticated
  using (exists (select 1 from public.leads l
                  where l.id = leads_asesores.lead_id
                    and ((leads_asesores.tipo_acceso = 'dueno' and leads_asesores.revocado_en is null)
                         or (select auth.uid()) = any (l.cartera))));

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
$$;
revoke all on function public._leads_vista_crear() from public, anon, authenticated;
select public._leads_vista_crear();

CREATE OR REPLACE FUNCTION public.lead_ficha(p_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
     and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
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
$function$;

CREATE OR REPLACE FUNCTION web.portal_snapshot(p_lead uuid, p_otorgado_en timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('nombre', l.nombre) from public.leads l where l.id = p_lead),
    'asesor', (select jsonb_build_object('nombre', p.nombre, 'whatsapp', p.whatsapp_web, 'avatar', p.avatar_ruta) from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id where la.lead_id = p_lead and la.tipo_acceso = 'dueno' and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])),
    'vehiculos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'anio', v.anio, 'vin_parcial', case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end,
        'imagenes', (select coalesce(jsonb_agg(i.ruta order by i.es_portada desc, i.orden), '[]'::jsonb) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'fase', case when f.visible_portal then jsonb_build_object('nombre', f.alias_portal, 'descripcion', f.descripcion_portal, 'desde', v.fase_desde) end,
        'linea_tiempo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', fz.alias_portal, 'en', h.creado_en) order by h.creado_en), '[]'::jsonb) from public.historial_fases h join public.fases fz on fz.id = h.a_fase_id where h.vehiculo_id = v.id and fz.visible_portal),
        'embarque', (select jsonb_build_object('zarpe', t.zarpe_el, 'eta', t.eta_el, 'arribo', t.arribo_el) from public.transportes t where t.vehiculo_id = v.id),
        'documentos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', td.nombre, 'estado', d.estado, 'fecha', d.creado_en)), '[]'::jsonb) from public.documentos d join public.tipos_documento td on td.id = d.tipo_documento_id where d.vehiculo_id = v.id and d.visible_portal and d.estado <> 'rechazado' and d.eliminado_en is null),
        'seguimientos', (select coalesce(jsonb_agg(jsonb_build_object('titulo', s.titulo, 'detalle', s.detalle_texto, 'en', s.ocurrido_en) order by s.ocurrido_en desc), '[]'::jsonb) from public.seguimientos s where s.lead_id = p_lead and s.vehiculo_id = v.id and s.visibilidad = 'publico' and s.eliminado_en is null),
        'pagos', (select coalesce(jsonb_agg(jsonb_build_object('concepto', pg.concepto, 'monto', pg.monto, 'moneda', pg.moneda, 'fecha', pg.fecha, 'confirmado', pg.confirmado) order by pg.fecha), '[]'::jsonb) from public.pagos pg where pg.vehiculo_id = v.id and pg.eliminado_en is null)
      )) from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.lead_id = p_lead and v.eliminado_en is null), '[]'::jsonb),
    -- Lo «Visible para el cliente» que no sale con un vehículo suyo: sin vehículo, o de uno que no está
    -- vinculado a este lead (un interés, uno que se desvinculó). No se nombra el vehículo. Las 30 más nuevas.
    'novedades', coalesce((select jsonb_agg(jsonb_build_object('titulo', n.titulo, 'detalle', n.detalle_texto, 'en', n.ocurrido_en) order by n.ocurrido_en desc, n.id)
      from (select s.id, s.titulo, s.detalle_texto, s.ocurrido_en from public.seguimientos s
            where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
              and (s.vehiculo_id is null or not exists (
                select 1 from public.vehiculos v where v.id = s.vehiculo_id and v.lead_id = p_lead and v.eliminado_en is null))
            order by s.ocurrido_en desc, s.id limit 30) n), '[]'::jsonb)
  );
end;
$function$;
