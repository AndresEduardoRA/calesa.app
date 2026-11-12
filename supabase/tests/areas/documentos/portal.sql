-- El portal del cliente muestra sólo los documentos de un tipo que hoy admite el portal (paso 6.05): `web.portal_snapshot()` y
-- `web.portal_documento_ruta()`. No depende de otro archivo (`SOLO=areas/documentos/portal.sql`). Cada bloque arma su terreno y lo revierte.
--
-- Qué asegura (C18, D13): un lead con acceso vigente y un vehículo con dos documentos visibles de dos tipos permitidos. Apagado el permiso de uno, el
-- snapshot lista uno y la ruta del otro da nula; al volver a permitirlo, sale de nuevo.

-- @test documentos portal: un tipo sin visible_portal_permitido no se muestra, y vuelve al permitirlo
begin;
do $$
declare
  u uuid := gen_random_uuid(); o uuid; l uuid; v uuid; t1 uuid; t2 uuid; d1 uuid; d2 uuid; v_en timestamptz := '2026-01-01 12:00:00+00'; s jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (u, u || '@ejemplo.com', '{"invitado": true}');
  insert into public.origenes (clave, nombre) values ('prueba_dc_portal', 'Prueba dc portal') returning id into o;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id)
  values ('DC portal', '73189901', u, (select id from public.origenes_lead where clave = 'web')) returning id into l;
  insert into public.accesos_portal (lead_id, codigo, clave_hash, otorgado_en) values (l, 'DC-ABCDE', 'x', v_en);
  insert into public.vehiculos (origen_id, titulo, lead_id) values (o, 'DC portal', l) returning id into v;
  insert into public.tipos_documento (flujo_id, nombre, visible_portal_permitido) values (null, 'DC portal uno', true) returning id into t1;
  insert into public.tipos_documento (flujo_id, nombre, visible_portal_permitido) values (null, 'DC portal dos', true) returning id into t2;
  insert into public.documentos (vehiculo_id, tipo_documento_id, visible_portal, ruta) values (v, t1, true, v || '/' || repeat('1', 64) || '.pdf') returning id into d1;
  insert into public.documentos (vehiculo_id, tipo_documento_id, visible_portal, ruta) values (v, t2, true, v || '/' || repeat('2', 64) || '.pdf') returning id into d2;

  s := web.portal_snapshot(l, v_en);
  if jsonb_array_length(s -> 'vehiculos' -> 0 -> 'documentos') <> 2 then raise exception 'con los dos permitidos no lista dos: %', s; end if;
  if web.portal_documento_ruta(l, v_en, d2) is null then raise exception 'con el tipo permitido no da la ruta'; end if;

  update public.tipos_documento set visible_portal_permitido = false where id = t2;
  s := web.portal_snapshot(l, v_en);
  if jsonb_array_length(s -> 'vehiculos' -> 0 -> 'documentos') <> 1 or (s -> 'vehiculos' -> 0 -> 'documentos' -> 0 ->> 'id')::uuid <> d1 then
    raise exception 'con un tipo sin permiso no lista sólo el otro: %', s;
  end if;
  if web.portal_documento_ruta(l, v_en, d2) is not null then raise exception 'la ruta de un tipo sin permiso no dio nula'; end if;
  if web.portal_documento_ruta(l, v_en, d1) is null then raise exception 'la ruta del tipo permitido dejó de salir'; end if;
  if not (select visible_portal from public.documentos where id = d2) then raise exception 'apagar el tipo tocó documentos.visible_portal'; end if;

  update public.tipos_documento set visible_portal_permitido = true where id = t2;
  if jsonb_array_length(web.portal_snapshot(l, v_en) -> 'vehiculos' -> 0 -> 'documentos') <> 2 or web.portal_documento_ruta(l, v_en, d2) is null then
    raise exception 'al volver a permitir el tipo no salió de nuevo';
  end if;
end $$;
rollback;
