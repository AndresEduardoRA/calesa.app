-- RLS y grants de TODAS las tablas de public. Escrito a mano.
-- Convención: _rls(tabla, select, insert, update, delete). Una expresión NULL = sin política
-- (la operación queda prohibida para authenticated). Las RPC SECURITY DEFINER escriben
-- igual: no necesitan política.

-- ---------------------------------------------------------------------------
-- Funciones de alcance por fila (STABLE DEFINER, envueltas en (select …) en las policies)
-- ---------------------------------------------------------------------------
create or replace function public.en_cartera(p_lead uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leads_asesores la where la.lead_id = p_lead and la.usuario_id = (select auth.uid()) and la.revocado_en is null);
$$;

create or replace function public.lead_en_limbo(p_lead uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.leads_asesores la where la.lead_id = p_lead and la.revocado_en is null);
$$;

-- ¿Puedo hacer p_clave sobre este lead? (vivo, no limbo, permiso + alcance)
create or replace function public.puede_lead(p_lead uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead and l.eliminado_en is null
      and not public.lead_en_limbo(l.id)
      and (public.alcance_de(p_clave) = 'todos' or (public.alcance_de(p_clave) = 'propios' and public.en_cartera(l.id)))
  );
$$;

create or replace function public.mis_leads()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select la.lead_id from public.leads_asesores la where la.usuario_id = (select auth.uid()) and la.revocado_en is null;
$$;

create or replace function public.puede_vehiculo(p_vehiculo uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vehiculos v
    where v.id = p_vehiculo and v.eliminado_en is null
      and (public.alcance_de(p_clave, v.origen_id) = 'todos'
        or (public.alcance_de(p_clave, v.origen_id) = 'propios' and (v.creado_por = (select auth.uid()) or v.lead_id in (select public.mis_leads()))))
  );
$$;

create or replace function public.puede_repuesto(p_item uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.repuestos_items i where i.id = p_item and i.eliminado_en is null and public.tiene_permiso(p_clave));
$$;

-- Unidad = vehículo o repuesto. p_clave_v para vehículos (por origen), p_clave_r para repuestos.
create or replace function public.puede_unidad(p_vehiculo uuid, p_repuesto uuid, p_clave_v text, p_clave_r text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_vehiculo is not null then public.puede_vehiculo(p_vehiculo, p_clave_v)
              when p_repuesto is not null then public.puede_repuesto(p_repuesto, p_clave_r)
              else false end;
$$;

create or replace function public.puede_cotizacion(p_cot uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cotizaciones c
    where c.id = p_cot and c.eliminado_en is null
      and (public.alcance_de(p_clave, c.origen_id) = 'todos'
        or (public.alcance_de(p_clave, c.origen_id) = 'propios' and (c.creado_por = (select auth.uid()) or c.lead_id in (select public.mis_leads()))))
  );
$$;

create or replace function public.puede_configurar_flujo(p_flujo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.flujos f where f.id = p_flujo
      and case when f.ambito = 'repuestos' then public.tiene_permiso('repuestos.configurar')
               else public.tiene_permiso('flujos.configurar', f.origen_id) end
  );
$$;

create or replace function public.flujo_de_fase(p_fase uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select flujo_id from public.fases where id = p_fase;
$$;

create or replace function public.es_miembro(p_conversacion uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = (select auth.uid()));
$$;

create or replace function public.puede_evento(p_evento uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.eventos e
    where e.id = p_evento and e.eliminado_en is null
      and (e.creado_por = (select auth.uid()) or e.visibilidad = 'publico'
        or exists (select 1 from public.eventos_destinatarios d where d.evento_id = e.id and d.usuario_id = (select auth.uid()))
        or public.tiene_permiso('agenda.ver_todo'))
  );
$$;

do $$
declare f text;
begin
  for f in select unnest(array['en_cartera(uuid)','lead_en_limbo(uuid)','puede_lead(uuid,text)','mis_leads()','puede_vehiculo(uuid,text)','puede_repuesto(uuid,text)','puede_unidad(uuid,uuid,text,text)','puede_cotizacion(uuid,text)','puede_configurar_flujo(uuid)','flujo_de_fase(uuid)','es_miembro(uuid)','puede_evento(uuid)']) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helper de migración: crea las 4 políticas estándar de una tabla
-- ---------------------------------------------------------------------------
create or replace function public._rls(p_tabla text, p_select text, p_insert text, p_update text, p_delete text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('alter table public.%I enable row level security', p_tabla);
  execute format('revoke all on table public.%I from anon, authenticated', p_tabla);
  execute format('grant select, insert, update, delete on table public.%I to service_role', p_tabla);
  if p_select is not null then
    execute format('grant select on table public.%I to authenticated', p_tabla);
    execute format('create policy %I on public.%I for select to authenticated using (%s)', p_tabla || ': leer', p_tabla, p_select);
  end if;
  if p_insert is not null then
    execute format('grant insert on table public.%I to authenticated', p_tabla);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', p_tabla || ': crear', p_tabla, p_insert);
  end if;
  if p_update is not null then
    execute format('grant update on table public.%I to authenticated', p_tabla);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', p_tabla || ': editar', p_tabla, p_update, p_update);
  end if;
  if p_delete is not null then
    execute format('grant delete on table public.%I to authenticated', p_tabla);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', p_tabla || ': borrar', p_tabla, p_delete);
  end if;
end;
$$;

-- Papelera: una RESTRICTIVE que esconde lo borrado a TODO el mundo (la lista se lee por RPC).
create or replace function public._rls_papelera(p_tabla text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('create policy %I on public.%I as restrictive for all to authenticated using (eliminado_en is null)', p_tabla || ': fuera de la papelera', p_tabla);
end;
$$;

-- ---------------------------------------------------------------------------
-- equipo
-- ---------------------------------------------------------------------------
select public._rls('perfiles',
  '(select public.es_usuario_activo())',
  null,
  'id = (select auth.uid()) or (select public.tiene_permiso(''equipo.usuarios.gestionar''))',
  null);
revoke update on table public.perfiles from authenticated;
grant update (nombre, handle, avatar_ruta, telefono, cargo, bio, whatsapp_web, bio_web, especialidades, cargo_web, publico_web, ultimo_acceso_en) on table public.perfiles to authenticated;
-- activo, bloqueado*, baja*: sólo por RPC (equipo_bloquear, equipo_dar_de_baja).

select public._rls('roles', 'true', null,
  '(select public.tiene_permiso(''equipo.roles.gestionar'')) and (select public.rol_dominado(id))', null);
revoke update on table public.roles from authenticated;
grant update (nombre, descripcion, color, orden) on table public.roles to authenticated;

select public._rls('permisos', 'true', null, null, null);
select public._rls('roles_permisos', 'true', null, null, null);
select public._rls('usuarios_roles', 'true', null, null, null);
select public._rls('preferencias_usuario', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('vistas_guardadas', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('visitados', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');

-- ---------------------------------------------------------------------------
-- empresa
-- ---------------------------------------------------------------------------
-- Sólo lectura: todo lo que se escribe pasa por las RPC de `…001200_empresa.sql` (control de
-- versión, sello de quién cambió, guarda de la moneda base, un solo tipo de cambio por defecto).
select public._rls('ajustes_empresa', 'true', null, null, null);
select public._rls('monedas', 'true', null, null, null);
select public._rls('tipos_cambio', 'true', null, null, null);
select public._rls('tipos_cambio_historial', '(select public.tiene_permiso(''empresa.tipos_cambio.gestionar''))', null, null, null);
select public._rls('integraciones', 'true', null, null, null);

-- ---------------------------------------------------------------------------
-- orígenes
-- ---------------------------------------------------------------------------
-- Sólo lectura: orígenes, campos y categorías se escriben por las RPC de `…001400_origenes.sql`
-- (permiso, versión, reglas de uso). El layout de un origen con vehículos no se toca a mano.
select public._rls('origenes', 'true', null, null, null);
select public._rls('origenes_campos', 'true', null, null, null);
select public._rls('categorias', 'true', null, null, null);

-- ---------------------------------------------------------------------------
-- flujos (configuración: lectura para todos los activos; escritura sólo quien configura ese flujo)
-- ---------------------------------------------------------------------------
select public._rls('flujos', 'true', null, '(select public.puede_configurar_flujo(id))', null);
select public._rls('flujos_reglas', 'true', '(select public.puede_configurar_flujo(flujo_id))', '(select public.puede_configurar_flujo(flujo_id))', '(select public.puede_configurar_flujo(flujo_id))');
select public._rls('fases', 'true', '(select public.puede_configurar_flujo(flujo_id))', '(select public.puede_configurar_flujo(flujo_id))', null);
select public._rls('fases_transiciones', 'true', '(select public.puede_configurar_flujo(flujo_id))', '(select public.puede_configurar_flujo(flujo_id))', '(select public.puede_configurar_flujo(flujo_id))');
select public._rls('fases_roles', 'true', '(select public.puede_configurar_flujo(public.flujo_de_fase(fase_id)))', null, '(select public.puede_configurar_flujo(public.flujo_de_fase(fase_id)))');
select public._rls('fases_transiciones_roles', 'true',
  '(select public.puede_configurar_flujo((select t.flujo_id from public.fases_transiciones t where t.id = transicion_id)))', null,
  '(select public.puede_configurar_flujo((select t.flujo_id from public.fases_transiciones t where t.id = transicion_id)))');
select public._rls('fases_requisitos', 'true', '(select public.puede_configurar_flujo(public.flujo_de_fase(fase_id)))', '(select public.puede_configurar_flujo(public.flujo_de_fase(fase_id)))', '(select public.puede_configurar_flujo(public.flujo_de_fase(fase_id)))');
select public._rls('tipos_documento', 'true',
  'flujo_id is null and (select public.tiene_permiso(''logistica.catalogos.gestionar'')) or flujo_id is not null and (select public.puede_configurar_flujo(flujo_id))',
  'flujo_id is null and (select public.tiene_permiso(''logistica.catalogos.gestionar'')) or flujo_id is not null and (select public.puede_configurar_flujo(flujo_id))',
  null);
select public._rls('historial_fases',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.ver'', ''repuestos.ver''))', null, null, null);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
select public._rls('origenes_lead', 'true', '(select public.tiene_permiso(''leads.configurar''))', '(select public.tiene_permiso(''leads.configurar''))', '(select public.tiene_permiso(''leads.configurar''))');
select public._rls('tipos_seguimiento', 'true', '(select public.tiene_permiso(''leads.configurar''))', '(select public.tiene_permiso(''leads.configurar''))', '(select public.tiene_permiso(''leads.configurar''))');
select public._rls('lotes_papelera', 'creado_por = (select auth.uid()) or (select public.tiene_permiso(''vehiculos.papelera.purgar''))', null, null, null);

select public._rls('leads',
  'eliminado_en is null and not (select public.lead_en_limbo(id)) and ((select public.alcance_de(''leads.ver'')) = ''todos'' or ((select public.alcance_de(''leads.ver'')) = ''propios'' and id in (select public.mis_leads())))',
  null,                                                   -- crear: RPC crear_lead (verifica teléfono)
  'eliminado_en is null and not (select public.lead_en_limbo(id)) and ((select public.alcance_de(''leads.editar'')) = ''todos'' or ((select public.alcance_de(''leads.editar'')) = ''propios'' and id in (select public.mis_leads())))',
  null);
select public._rls_papelera('leads');
-- El teléfono principal NO se lee de la tabla: la app usa leads_vista (enmascara salvo cartera).
revoke select on table public.leads from authenticated;
grant select (id, numero, nombre, telefono_cc, tipo, origen_lead_id, edad, ciudad, pais, direccion, genero, notas, creado_por, ultimo_seguimiento_en, eliminado_en, lote_papelera_id, creado_en, actualizado_en) on table public.leads to authenticated;
revoke update on table public.leads from authenticated;
grant update (nombre, tipo, origen_lead_id, edad, ciudad, pais, direccion, genero, notas) on table public.leads to authenticated;

select public._rls('leads_telefonos', '(select public.puede_lead(lead_id, ''leads.ver''))', '(select public.puede_lead(lead_id, ''leads.editar''))', '(select public.puede_lead(lead_id, ''leads.editar''))', '(select public.puede_lead(lead_id, ''leads.editar''))');
select public._rls('leads_asesores', '(select public.puede_lead(lead_id, ''leads.ver''))', null, null, null);
select public._rls('leads_favoritos', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid()) and (select public.puede_lead(lead_id, ''leads.ver''))', null, 'usuario_id = (select auth.uid())');
select public._rls('leads_tachados', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid()) and (select public.puede_lead(lead_id, ''leads.ver''))', null, 'usuario_id = (select auth.uid())');
select public._rls('etiquetas', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('leads_etiquetas',
  'exists (select 1 from public.etiquetas e where e.id = etiqueta_id and e.usuario_id = (select auth.uid()))',
  'exists (select 1 from public.etiquetas e where e.id = etiqueta_id and e.usuario_id = (select auth.uid())) and (select public.puede_lead(lead_id, ''leads.ver''))',
  null,
  'exists (select 1 from public.etiquetas e where e.id = etiqueta_id and e.usuario_id = (select auth.uid()))');
select public._rls('seguimientos',
  'eliminado_en is null and (select public.puede_lead(lead_id, ''leads.ver'')) and (usuario_id = (select auth.uid()) or visibilidad = ''publico'' or (select public.alcance_de(''leads.ver'')) = ''todos'')',
  'usuario_id = (select auth.uid()) and (select public.puede_lead(lead_id, ''leads.editar''))',
  'usuario_id = (select auth.uid())',
  null);
select public._rls('recordatorios', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('embudos', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('embudos_etapas',
  'exists (select 1 from public.embudos e where e.id = embudo_id and e.usuario_id = (select auth.uid()))',
  'exists (select 1 from public.embudos e where e.id = embudo_id and e.usuario_id = (select auth.uid()))',
  'exists (select 1 from public.embudos e where e.id = embudo_id and e.usuario_id = (select auth.uid()))',
  'exists (select 1 from public.embudos e where e.id = embudo_id and e.usuario_id = (select auth.uid()))');
select public._rls('oportunidades',
  'eliminado_en is null and (usuario_id = (select auth.uid()) or (select public.alcance_de(''leads.ver'')) = ''todos'') and (select public.puede_lead(lead_id, ''leads.ver''))',
  'usuario_id = (select auth.uid()) and (select public.puede_lead(lead_id, ''leads.editar''))',
  'usuario_id = (select auth.uid())',
  null);
select public._rls('oportunidades_historial', 'exists (select 1 from public.oportunidades o where o.id = oportunidad_id and (o.usuario_id = (select auth.uid()) or (select public.alcance_de(''leads.ver'')) = ''todos''))', null, null, null);
select public._rls('accesos_portal', '(select public.puede_lead(lead_id, ''leads.portal.gestionar''))', null, null, null);
revoke select on table public.accesos_portal from authenticated;
grant select (lead_id, codigo, habilitado, debe_cambiar_clave, intentos_fallidos, bloqueado_hasta, ultimo_ingreso_en, otorgado_por, otorgado_en, revocado_por, revocado_en) on table public.accesos_portal to authenticated;

-- ---------------------------------------------------------------------------
-- vehículos
-- ---------------------------------------------------------------------------
-- Las políticas de la fila propia se escriben INLINE (no con puede_vehiculo(id)): una función
-- STABLE no ve la fila recién insertada en un INSERT … RETURNING.
select public._rls('vehiculos',
  'eliminado_en is null and ((select public.alcance_de(''vehiculos.ver'', origen_id)) = ''todos'' or ((select public.alcance_de(''vehiculos.ver'', origen_id)) = ''propios'' and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))))',
  'creado_por = (select auth.uid()) and (select public.tiene_permiso(''vehiculos.crear'', origen_id))',
  'eliminado_en is null and ((select public.alcance_de(''vehiculos.editar'', origen_id)) = ''todos'' or ((select public.alcance_de(''vehiculos.editar'', origen_id)) = ''propios'' and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))))',
  null);
select public._rls_papelera('vehiculos');
revoke update on table public.vehiculos from authenticated;
grant update (categoria_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, kilometraje, atributos, subasta_en, subasta_fin_en, subasta_zona, estado_subasta, apibara_sync_en, apibara_raw, lead_id) on table public.vehiculos to authenticated;
-- fase_id, publicado_web, precio_web*, eliminado_*: sólo por RPC.

select public._rls('vehiculos_imagenes', '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.ver''))', '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.editar''))', '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.editar''))', '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.editar''))');
-- La versión de las fotos se lee si se ve el vehículo (la subconsulta corre con su RLS); la escriben las RPC de fotos.
select public._rls('vehiculos_imagenes_version', 'exists (select 1 from public.vehiculos v where v.id = vehiculo_id)', null, null, null);
select public._rls('vehiculos_interesados',
  '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.ver'')) and (select public.puede_lead(lead_id, ''leads.ver''))',
  'usuario_id = (select auth.uid()) and (select public.puede_vehiculo(vehiculo_id, ''vehiculos.ver'')) and (select public.puede_lead(lead_id, ''leads.editar''))',
  null,
  '(select public.puede_lead(lead_id, ''leads.editar''))');
select public._rls('vehiculos_vinculos', '(select public.puede_vehiculo(vehiculo_id, ''vehiculos.ver''))', null, null, null);
select public._rls('cola_gc_storage', null, null, null, null);

-- ---------------------------------------------------------------------------
-- cotizaciones
-- ---------------------------------------------------------------------------
select public._rls('formulas', 'true', null, null, null);              -- escritura: RPC formula_*
select public._rls('plantillas_tarjeta', 'true', null, null, null);    -- escritura: RPC plantilla_*
select public._rls('tablas_referencia', 'true', 'origen_id is null and (select public.tiene_permiso(''cotizaciones.configurar'')) or (select public.tiene_permiso(''cotizaciones.configurar'', origen_id))', '(select public.tiene_permiso(''cotizaciones.configurar'', origen_id))', '(select public.tiene_permiso(''cotizaciones.configurar'', origen_id))');
select public._rls('tablas_referencia_filas', 'true',
  'exists (select 1 from public.tablas_referencia t where t.id = tabla_id and (select public.tiene_permiso(''cotizaciones.configurar'', t.origen_id)))',
  'exists (select 1 from public.tablas_referencia t where t.id = tabla_id and (select public.tiene_permiso(''cotizaciones.configurar'', t.origen_id)))',
  'exists (select 1 from public.tablas_referencia t where t.id = tabla_id and (select public.tiene_permiso(''cotizaciones.configurar'', t.origen_id)))');

select public._rls('cotizaciones',
  'eliminado_en is null and ((select public.alcance_de(''cotizaciones.ver'', origen_id)) = ''todos'' or ((select public.alcance_de(''cotizaciones.ver'', origen_id)) = ''propios'' and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))))',
  'creado_por = (select auth.uid()) and (select public.tiene_permiso(''cotizaciones.crear'', origen_id)) and clase = ''preventa''',
  '(eliminado_en is null and clase = ''preventa'' and ((select public.alcance_de(''cotizaciones.editar'', origen_id)) = ''todos'' or ((select public.alcance_de(''cotizaciones.editar'', origen_id)) = ''propios'' and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))))) or (select public.tiene_permiso(''cotizaciones.final.gestionar'', origen_id))',
  null);
select public._rls_papelera('cotizaciones');
revoke update on table public.cotizaciones from authenticated;
grant update (lead_id, vehiculo_id, titulo, plantilla_id, valores, fuentes, tipos_cambio, totales, total_base, moneda_mostrar, modo_tc, notas, clase) on table public.cotizaciones to authenticated;

select public._rls('cotizaciones_revisiones', '(select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))', null, null, null);
select public._rls('cotizaciones_comentarios',
  '(select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))',
  'usuario_id = (select auth.uid()) and (select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))',
  'usuario_id = (select auth.uid()) or (select public.tiene_permiso(''cotizaciones.moderar''))',
  null);
select public._rls('cotizaciones_adjuntos',
  '(select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))',
  'subido_por = (select auth.uid()) and (select public.puede_cotizacion(cotizacion_id, ''cotizaciones.editar''))',
  null,
  'subido_por = (select auth.uid()) or (select public.tiene_permiso(''cotizaciones.moderar''))');
select public._rls('cotizaciones_reportes',
  'usuario_id = (select auth.uid()) or (select public.tiene_permiso(''cotizaciones.moderar''))',
  'usuario_id = (select auth.uid()) and (select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))',
  null, 'usuario_id = (select auth.uid())');
select public._rls('cotizaciones_favoritos', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid()) and (select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))', null, 'usuario_id = (select auth.uid())');
select public._rls('comprobantes_contadores', '(select public.tiene_permiso(''cotizaciones.comprobantes.emitir''))', null, null, null);
select public._rls('comprobantes', '(select public.puede_cotizacion(cotizacion_id, ''cotizaciones.ver''))', null, null, null);

-- ---------------------------------------------------------------------------
-- repuestos
-- ---------------------------------------------------------------------------
select public._rls('repuestos_catalogos', 'true', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))');
select public._rls('repuestos_proyectos', 'eliminado_en is null and (select public.tiene_permiso(''repuestos.ver''))', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''repuestos.editar''))', '(select public.tiene_permiso(''repuestos.editar''))', null);
select public._rls('repuestos_items', 'eliminado_en is null and (select public.tiene_permiso(''repuestos.ver''))', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''repuestos.editar''))', '(select public.tiene_permiso(''repuestos.editar''))', null);
revoke update on table public.repuestos_items from authenticated;
grant update (descripcion, tipo_pieza_id, condicion_id, pais_origen_id, modo_transporte_id, cantidad, precio_cliente, moneda, tracking, en_stock_desde, notas) on table public.repuestos_items to authenticated;
select public._rls('repuestos_items_imagenes', '(select public.tiene_permiso(''repuestos.ver''))', '(select public.tiene_permiso(''repuestos.editar''))', '(select public.tiene_permiso(''repuestos.editar''))', '(select public.tiene_permiso(''repuestos.editar''))');
select public._rls('repuestos_stock_movimientos', '(select public.tiene_permiso(''repuestos.ver''))', 'usuario_id = (select auth.uid()) and (select public.tiene_permiso(''repuestos.editar''))', null, null);
select public._rls('repuestos_compras', 'eliminado_en is null and (select public.tiene_permiso(''repuestos.costos.ver''))', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''repuestos.costos.editar''))', '(select public.tiene_permiso(''repuestos.costos.editar''))', null);
select public._rls('repuestos_cotizador_config', '(select public.tiene_permiso(''repuestos.cotizar'')) or (select public.tiene_permiso(''repuestos.configurar''))', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''repuestos.configurar''))', null, null);
select public._rls('repuestos_tramos_logistica', '(select public.tiene_permiso(''repuestos.cotizar'')) or (select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))');
select public._rls('repuestos_cajas', '(select public.tiene_permiso(''repuestos.cotizar'')) or (select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))', '(select public.tiene_permiso(''repuestos.configurar''))');
select public._rls('repuestos_cotizaciones', '(select public.tiene_permiso(''repuestos.cotizar'')) or (select public.tiene_permiso(''repuestos.costos.ver''))', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''repuestos.cotizar''))', 'estado = ''borrador'' and (select public.tiene_permiso(''repuestos.cotizar''))', null);
select public._rls('repuestos_cotizaciones_lineas',
  'exists (select 1 from public.repuestos_cotizaciones c where c.id = cotizacion_id) and ((select public.tiene_permiso(''repuestos.cotizar'')) or (select public.tiene_permiso(''repuestos.costos.ver'')))',
  'exists (select 1 from public.repuestos_cotizaciones c where c.id = cotizacion_id and c.estado = ''borrador'') and (select public.tiene_permiso(''repuestos.cotizar''))',
  'exists (select 1 from public.repuestos_cotizaciones c where c.id = cotizacion_id and c.estado = ''borrador'') and (select public.tiene_permiso(''repuestos.cotizar''))',
  'exists (select 1 from public.repuestos_cotizaciones c where c.id = cotizacion_id and c.estado = ''borrador'') and (select public.tiene_permiso(''repuestos.cotizar''))');

-- ---------------------------------------------------------------------------
-- logística
-- ---------------------------------------------------------------------------
select public._rls('documentos',
  'eliminado_en is null and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.ver'', ''repuestos.ver''))',
  'subido_por = (select auth.uid()) and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.documentos.subir'', ''repuestos.documentos.subir''))',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.documentos.aprobar'', ''repuestos.documentos.aprobar'')) or (subido_por = (select auth.uid()) and estado in (''pendiente'', ''subido''))',
  null);
select public._rls('puertos', 'true', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))');
select public._rls('navieras', 'true', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))');
select public._rls('categorias_gasto', 'true', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))', '(select public.tiene_permiso(''logistica.catalogos.gestionar''))');
select public._rls('transportes',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.ver'', ''repuestos.ver''))',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.transporte.editar'', ''repuestos.editar''))',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.transporte.editar'', ''repuestos.editar''))',
  null);
select public._rls('flujos_transporte_oferta', 'true', '(select public.puede_configurar_flujo(flujo_id))', null, '(select public.puede_configurar_flujo(flujo_id))');
select public._rls('declaraciones_aduana', '(select public.tiene_permiso(''logistica.ver''))', '(select public.tiene_permiso(''logistica.aduana.gestionar''))', '(select public.tiene_permiso(''logistica.aduana.gestionar''))', null);
select public._rls('declaraciones_vehiculos', '(select public.puede_vehiculo(vehiculo_id, ''logistica.ver''))', '(select public.tiene_permiso(''logistica.aduana.gestionar'')) and (select public.puede_vehiculo(vehiculo_id, ''logistica.ver''))', '(select public.tiene_permiso(''logistica.aduana.gestionar''))', null);
select public._rls('gastos',
  'eliminado_en is null and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.gastos.ver'', ''repuestos.costos.ver''))',
  'creado_por = (select auth.uid()) and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.gastos.editar'', ''repuestos.costos.editar''))',
  '(select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.gastos.editar'', ''repuestos.costos.editar''))',
  null);
select public._rls('pagos',
  'eliminado_en is null and ((vehiculo_id is not null and (select public.puede_vehiculo(vehiculo_id, ''logistica.pagos.ver''))) or (proyecto_repuestos_id is not null and (select public.tiene_permiso(''repuestos.costos.ver''))))',
  'creado_por = (select auth.uid()) and ((vehiculo_id is not null and (select public.puede_vehiculo(vehiculo_id, ''logistica.pagos.editar''))) or (proyecto_repuestos_id is not null and (select public.tiene_permiso(''repuestos.costos.editar''))))',
  'not confirmado and ((vehiculo_id is not null and (select public.puede_vehiculo(vehiculo_id, ''logistica.pagos.editar''))) or (proyecto_repuestos_id is not null and (select public.tiene_permiso(''repuestos.costos.editar''))))',
  null);
revoke update on table public.pagos from authenticated;
grant update (lead_id, concepto, moneda, monto, tipo_cambio_aplicado, monto_base, metodo, fecha, comprobante_ruta, notas) on table public.pagos to authenticated;
select public._rls('notas',
  'eliminado_en is null and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.ver'', ''repuestos.ver''))',
  'autor_id = (select auth.uid()) and (select public.puede_unidad(vehiculo_id, repuesto_id, ''logistica.ver'', ''repuestos.ver''))',
  'autor_id = (select auth.uid())',
  null);

-- ---------------------------------------------------------------------------
-- agenda
-- ---------------------------------------------------------------------------
select public._rls('eventos', '(select public.puede_evento(id))', 'creado_por = (select auth.uid()) and (visibilidad = ''privado'' or (select public.tiene_permiso(''agenda.eventos.publicar'')))', 'creado_por = (select auth.uid())', null);
select public._rls('eventos_destinatarios', '(select public.puede_evento(evento_id))', 'exists (select 1 from public.eventos e where e.id = evento_id and e.creado_por = (select auth.uid()))', null, 'exists (select 1 from public.eventos e where e.id = evento_id and e.creado_por = (select auth.uid()))');
select public._rls('tareas',
  'eliminado_en is null and (responsable_id = (select auth.uid()) or creado_por = (select auth.uid()) or (select public.tiene_permiso(''agenda.ver_todo'')))',
  'creado_por = (select auth.uid()) and (responsable_id = (select auth.uid()) or (select public.tiene_permiso(''agenda.tareas.asignar'')))',
  'responsable_id = (select auth.uid()) or creado_por = (select auth.uid())',
  null);
revoke update on table public.tareas from authenticated;
grant update (titulo, descripcion, vence_en, estado, lead_id, vehiculo_id, cotizacion_id, completada_en, eliminado_en) on table public.tareas to authenticated;

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------
select public._rls('conversaciones',
  '(select public.es_miembro(id)) or (es_global and (select public.tiene_permiso(''chat.global'')))',
  'creado_por = (select auth.uid()) and (select public.tiene_permiso(''chat.participar'')) and not es_global',
  'creado_por = (select auth.uid()) and tipo = ''grupo''',
  null);
select public._rls('conversaciones_miembros',
  '(select public.es_miembro(conversacion_id))',
  'exists (select 1 from public.conversaciones c where c.id = conversacion_id and (c.creado_por = (select auth.uid()) or (c.es_global and usuario_id = (select auth.uid()) and (select public.tiene_permiso(''chat.global'')))))',
  'usuario_id = (select auth.uid())',
  'usuario_id = (select auth.uid()) or exists (select 1 from public.conversaciones c where c.id = conversacion_id and c.creado_por = (select auth.uid()) and c.tipo = ''grupo'')');
revoke update on table public.conversaciones_miembros from authenticated;
grant update (ultimo_leido_en, silenciada) on table public.conversaciones_miembros to authenticated;
select public._rls('mensajes',
  '(select public.es_miembro(conversacion_id))',
  'autor_id = (select auth.uid()) and (select public.es_miembro(conversacion_id)) and (select public.tiene_permiso(''chat.participar''))',
  'autor_id = (select auth.uid()) or (select public.tiene_permiso(''chat.moderar''))',
  null);
revoke update on table public.mensajes from authenticated;
grant update (cuerpo, editado_en, eliminado_en) on table public.mensajes to authenticated;
select public._rls('mensajes_menciones',
  'exists (select 1 from public.mensajes m where m.id = mensaje_id and (select public.es_miembro(m.conversacion_id)))',
  'exists (select 1 from public.mensajes m where m.id = mensaje_id and m.autor_id = (select auth.uid()))',
  null, null);

-- ---------------------------------------------------------------------------
-- notificaciones, actividad
-- ---------------------------------------------------------------------------
select public._rls('notificaciones', 'usuario_id = (select auth.uid())', null, 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
revoke update on table public.notificaciones from authenticated;
grant update (leida_en, accionada_en) on table public.notificaciones to authenticated;
select public._rls('suscripciones_push', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())', 'usuario_id = (select auth.uid())');
select public._rls('actividad', '(select public.tiene_permiso(''actividad.ver''))', null, null, null);

-- ---------------------------------------------------------------------------
-- web
-- ---------------------------------------------------------------------------
select public._rls('ajustes_web', 'true', null, '(select public.tiene_permiso(''web.ajustes.gestionar''))', null);
select public._rls('web_categorias_guias', 'true', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))');
select public._rls('web_guias', 'true', 'creado_por = (select auth.uid()) and (select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))');
select public._rls('web_faqs', 'true', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))');
select public._rls('web_testimonios', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))', '(select public.tiene_permiso(''web.contenido.gestionar''))');
select public._rls('cola_web_asesores', 'true', null, 'usuario_id = (select auth.uid()) or (select public.tiene_permiso(''web.cola.gestionar''))', null);
revoke update on table public.cola_web_asesores from authenticated;
grant update (disponible) on table public.cola_web_asesores to authenticated;
-- habilitado, max_abiertas, prioridad, orden: por RPC cola_web_configurar (web.cola.gestionar).
select public._rls('solicitudes_contacto_web', 'usuario_id = (select auth.uid()) or (select public.tiene_permiso(''web.cola.gestionar''))', null, null, null);
select public._rls('eventos_web', null, null, null, null);

-- ---------------------------------------------------------------------------
-- datos
-- ---------------------------------------------------------------------------
select public._rls('importaciones', 'usuario_id = (select auth.uid()) or (select public.tiene_permiso(''datos.importar.todo''))', 'usuario_id = (select auth.uid())', null, 'usuario_id = (select auth.uid())');

-- Verificación: ninguna tabla de public sin RLS.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'Tabla sin RLS: public.%', t;
  end loop;
end $$;

drop function public._rls(text, text, text, text, text);
drop function public._rls_papelera(text);
