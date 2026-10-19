-- @test auditoría de leads: el cinturón. Toda función que recibe un lead está auditada, con su clase
-- Lee el catálogo: una función «definer» que `authenticated` puede llamar y que recibe un lead
-- (un argumento `p_lead`, `p_leads`, `lead_id`… o de tipo `leads`) o que toca las tablas de leads, tiene
-- que figurar abajo con su clase. Una RPC nueva que no figure rompe `pnpm db:probar`: se audita (qué
-- exige, a quién le habla, con qué mensaje) y se agrega acá, y a la matriz si es de clase 1, 2 o 3.
--
-- Clases:  1 contenido y datos privados (cartera + permiso)   2 quién tiene el lead
--          3 papelera (permiso con su alcance)                L lectura (ver alcanza; la base recorta)
--          M marcas y recordatorios de quien mira             X excepción nombrada, con su motivo
do $$
declare
  v_auditadas constant jsonb := (select jsonb_object_agg(f, c) from (values
    ('lead_guardar(uuid,timestamp with time zone,jsonb)', '1'),
    ('cambiar_telefono_lead(uuid,timestamp with time zone,text,text)', '1'),
    ('verificar_telefono_de_lead(uuid,text,text)', '1'),
    ('lead_telefono_guardar(uuid,uuid,text,text,text,timestamp with time zone)', '1'),
    ('lead_telefono_quitar(uuid,uuid)', '1'),
    ('seguimiento_crear(uuid,uuid,jsonb,jsonb)', '1'),
    ('seguimiento_guardar(uuid,timestamp with time zone,jsonb)', '1'),
    ('seguimiento_eliminar(uuid,timestamp with time zone)', '1'),
    ('seguimiento_restaurar(uuid,timestamp with time zone)', '1'),
    ('recordatorio_crear(uuid,uuid,text,timestamp with time zone,uuid)', '1'),
    -- El acceso del cliente (parte 7b): la cartera y `leads.portal.gestionar`; el estado también (lleva el código).
    ('otorgar_portal(uuid,text,timestamp with time zone)', '1'),
    ('revocar_portal(uuid)', '1'),
    ('portal_desbloquear(uuid)', '1'),
    ('portal_estado(uuid)', '1'),
    ('vehiculo_vincular(uuid,timestamp with time zone,uuid)', '1'),
    ('vehiculo_interesado_marcar(uuid,uuid,text)', '1'),
    ('vehiculo_interesado_quitar(uuid,uuid)', '1'),
    -- Oportunidades (parte 7a): de su dueña, con la cartera del lead y `leads.editar`.
    ('oportunidad_crear(uuid,uuid,jsonb)', '1'),
    ('oportunidad_guardar(uuid,timestamp with time zone,jsonb)', '1'),
    ('oportunidad_mover(uuid,uuid,uuid,text)', '1'),
    ('oportunidad_eliminar(uuid,timestamp with time zone)', '1'),
    ('oportunidad_restaurar(uuid,timestamp with time zone)', '1'),
    ('lead_compartir(uuid,uuid)', '2'),
    ('lead_transferir(uuid,uuid,uuid)', '2'),
    ('lead_revocar_acceso(uuid,uuid)', '2'),
    ('lead_salir(uuid)', '2'),
    ('leads_papelera_enviar(uuid,uuid[])', '3'),
    ('leads_papelera_listar(timestamp with time zone,uuid,boolean,integer,integer)', '3'),
    ('leads_papelera_lote(uuid)', '3'),
    ('leads_papelera_restaurar(uuid,timestamp with time zone,uuid[])', '3'),
    ('leads_papelera_purgar(uuid,timestamp with time zone,uuid[])', '3'),
    ('papelera_enviar(tipo_lote_papelera,uuid[])', '3'),
    ('papelera_listar(tipo_lote_papelera)', '3'),
    ('papelera_restaurar(uuid)', '3'),
    ('papelera_purgar(uuid)', '3'),
    ('atributos_lead(uuid)', 'L'),
    ('telefono_lead(uuid)', 'L'),
    ('lead_telefonos(uuid)', 'L'),
    ('lead_cartera(uuid)', 'L'),
    ('lead_cartera_candidatos(uuid)', 'L'),
    ('en_cartera(uuid)', 'L'),
    ('lead_en_limbo(uuid)', 'L'),
    ('mis_leads()', 'L'),
    ('puede_lead(uuid,text)', 'L'),
    ('puede_actuar_lead(uuid,text)', 'L'),
    ('puede_vehiculo(uuid,text)', 'L'),
    ('puede_cotizacion(uuid,text)', 'L'),
    ('lead_favorito_poner(uuid,boolean)', 'M'),
    ('lead_tachado_poner(uuid,boolean)', 'M'),
    ('lead_etiquetas_poner(uuid,uuid[],boolean)', 'M'),
    ('etiqueta_eliminar(uuid,timestamp with time zone)', 'M'),
    ('recordatorio_guardar(uuid,timestamp with time zone,jsonb)', 'M'),
    ('recordatorio_completar(uuid,timestamp with time zone,boolean)', 'M'),
    ('recordatorio_eliminar(uuid,timestamp with time zone)', 'M'),
    ('recordatorio_restaurar(uuid,timestamp with time zone)', 'M'),
    ('crear_lead(uuid,jsonb,jsonb,jsonb)', 'X'),
    -- CSV (parte 8a): no reciben un lead sino filas. Importar es la clase de `crear_lead` (`leads.crear`, quien
    -- importa queda de dueña, nada se adopta del limbo y en masa sólo se dice «ya existe»); exportar es
    -- `leads.exportar` y lo que sale lo decide la consulta (`en_cartera`), no la RPC. Su matriz es «casos de CSV».
    ('leads_importar_lote(uuid,integer,jsonb)', 'X'),
    ('leads_importacion_terminar(uuid,integer,integer,uuid)', 'X'),
    ('leads_exportacion_registrar(integer,text[])', 'X'),
    -- Deshacer una importación (parte 8b): no es de clase 3 porque no la autoriza el permiso de la papelera sino
    -- haber hecho la importación, y sólo alcanza lo que sigue intacto (sólo suyo y sin tocar), en 24 h. La
    -- lista de recientes devuelve sólo las propias, con números. Su matriz es «casos de deshacer».
    ('leads_importacion_deshacer(uuid)', 'X'),
    ('leads_importaciones_recientes()', 'X'),
    ('web_confirmar_contacto(uuid,uuid)', 'X'),
    ('cotizacion_marcar_final(uuid)', 'X'),
    ('equipo_dar_de_baja(uuid)', 'X'),
    ('equipo_vista_previa_baja(uuid)', 'X'),
    ('lead_campo_impacto(uuid)', 'X'),
    ('empresa_con_datos_cargados()', 'X'),
    ('vehiculo_guardar(uuid,timestamp with time zone,jsonb)', 'X'),
    ('vehiculos_papelera_enviar(jsonb)', 'X'),
    ('vehiculos_papelera_listar(timestamp with time zone,uuid,boolean,integer,integer)', 'X'),
    ('vehiculos_papelera_lote(uuid)', 'X'),
    ('vehiculos_papelera_restaurar(uuid,timestamp with time zone,uuid[])', 'X'),
    ('vehiculos_papelera_purgar(uuid,timestamp with time zone,uuid[])', 'X'),
    ('lead_ficha(uuid)', 'L'),
    -- La búsqueda por candidatos (5a-fix-1b): lo que ve quien llama, ni una fila más (`_lead_visible_para()` con su sesión); el segundo paso es la vista de siempre, de invocador.
    ('leads_candidatos(jsonb)', 'L'),
    ('leads_vista_por_ids(uuid[])', 'L'),
    -- Un sí o un no sobre la propia cartera de quien llama (5a-5: por dónde leer «míos»); no recibe un lead ni devuelve un número.
    ('leads_cartera_corta()', 'L'),
    ('lead_seguimientos(uuid,timestamp with time zone,uuid,integer)', 'L'),
    ('lead_recordatorios(uuid,boolean,timestamp with time zone,uuid,integer)', 'L'),
    ('lead_seguimiento(uuid,uuid)', 'L'),
    ('vehiculo_vinculos(uuid)', 'L'),
    ('vehiculo_interesados(uuid)', 'L'),
    ('lead_vehiculos(uuid)', 'L'),
    ('vehiculos_para_lead(uuid,text)', 'L'),
    ('puede_evento(uuid)', 'L'),
    ('etiqueta_crear(uuid,text,text)', 'M'),
    -- Los embudos son de cada persona (excepción como las marcas: no reciben un lead; eliminar y guardar
    -- las etapas cuentan y borran sólo oportunidades propias ya eliminadas).
    ('embudo_por_defecto()', 'M'),
    ('embudo_crear(uuid,text)', 'M'),
    ('embudo_guardar(uuid,timestamp with time zone,text)', 'M'),
    ('embudo_eliminar(uuid,timestamp with time zone)', 'M'),
    ('embudo_etapas_guardar(uuid,timestamp with time zone,jsonb)', 'M'),
    -- Lecturas de oportunidades: la RLS da sólo las propias sobre leads vivos de la cartera.
    ('_mis_leads_vivos()', 'L'),
    ('_tarjeta_json(oportunidades,jsonb,jsonb)', 'L'),
    ('lead_oportunidades(uuid)', 'L'),
    ('etiqueta_guardar(uuid,timestamp with time zone,text,text)', 'M'),
    ('lead_campo_crear(text,text,tipo_campo,jsonb,boolean,text,boolean,boolean,boolean,jsonb,text)', 'X'),
    ('lead_campo_guardar(uuid,timestamp with time zone,jsonb)', 'X'),
    ('lead_campo_eliminar(uuid,timestamp with time zone)', 'X'),
    ('lead_campo_mover(uuid,timestamp with time zone,uuid)', 'X'),
    ('origen_lead_eliminar(uuid,timestamp with time zone)', 'X'),
    ('tipo_lead_eliminar(uuid,timestamp with time zone)', 'X'),
    ('origen_eliminar(uuid,timestamp with time zone)', 'X'),
    ('origenes_resumen()', 'X'),
    ('comprobante_emitir(uuid,text,jsonb)', 'X'),
    ('cotizacion_moderar(uuid,estado_cotizacion)', 'X'),
    ('evaluar_requisitos(uuid,uuid,uuid)', 'X'),
    ('margen_vehiculo(uuid)', 'X'),
    ('reasignar_tarea(uuid,uuid)', 'X'),
    ('storage_refcount(text,text)', 'X')
  ) t (f, c));
  r record; v_fallas text := '';
begin
  -- 1. Toda candidata está auditada.
  for r in
    select p.proname || '(' || array_to_string(p.proargtypes::regtype[], ',') || ')' as firma
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
      and (exists (select 1 from unnest(coalesce(p.proargnames, '{}')) a where a ~ '^p_leads?$|lead_id|^p_lead_')
        or exists (select 1 from unnest(p.proargtypes::regtype[]) t where t::text in ('leads', 'leads[]'))
        -- Una «definer» lee por encima de la RLS: también cuenta si nombra una tabla de leads (o con
        -- `lead_id`) en su cuerpo. Una de invocador la limita la RLS: sólo si recibe un lead.
        or (p.prosecdef and (p.prosrc ~ 'public\.(leads\w*|accesos_portal|oportunidades\w*|lotes_papelera|vehiculos_interesados|vehiculos_vinculos|seguimientos|recordatorios\w*|etiquetas\w*|pagos|tareas|eventos|mensajes|repuestos_proyectos|web_testimonios|cotizaciones)\M'
                             or p.prosrc ~ 'lead_id')))
    order by 1
  loop
    if not v_auditadas ? r.firma then
      v_fallas := v_fallas || E'\n  sin auditar: ' || r.firma;
    end if;
  end loop;
  -- 2. Nada de la lista quedó viejo: la firma existe, y es la única con ese nombre (una sobrecarga que
  --    sobrevivió a un cambio de parámetros sigue llamable).
  for r in select k as firma from jsonb_object_keys(v_auditadas) k loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname || '(' || array_to_string(p.proargtypes::regtype[], ',') || ')' = r.firma) then
      v_fallas := v_fallas || E'\n  en la lista y no existe (¿cambió la firma sin sacarla de acá?): ' || r.firma;
    elsif (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = split_part(r.firma, '(', 1)) > 1 then
      v_fallas := v_fallas || E'\n  tiene sobrecargas: ' || split_part(r.firma, '(', 1) || ' (¿falta un drop function de la firma vieja?)';
    end if;
  end loop;
  -- 3. Las de clase 1, 2 y 3 que reciben un lead pasaron por la matriz.
  if to_regclass('pg_temp.matriz_cubiertas') is null then
    v_fallas := v_fallas || E'\n  la matriz no corrió antes del cinturón';
  else
    for r in
      select p.proname, p.proname || '(' || array_to_string(p.proargtypes::regtype[], ',') || ')' as firma
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and exists (select 1 from unnest(coalesce(p.proargnames, '{}')) a where a ~ '^p_leads?$')
    loop
      if (v_auditadas ->> r.firma) in ('1', '2', '3')
         and not exists (select 1 from pg_temp.matriz_cubiertas c where c.rpc = r.proname) then
        v_fallas := v_fallas || E'\n  sin fila en la matriz de leads: ' || r.proname;
      end if;
    end loop;
    -- Las de oportunidades y embudos reciben su id, no el lead: igual pasan por su bloque de la matriz
    -- (las que escriben; las lecturas son de invocador y las limita la RLS).
    for r in
      select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname ~ '^(oportunidad|embudo)_' and p.prosecdef
        and has_function_privilege('authenticated', p.oid, 'execute')
    loop
      if not exists (select 1 from pg_temp.matriz_cubiertas c where c.rpc = r.proname) then
        v_fallas := v_fallas || E'\n  sin fila en la matriz de oportunidades y embudos: ' || r.proname;
      end if;
    end loop;
  end if;
  if v_fallas <> '' then
    raise exception 'La auditoría de leads no cierra:%', v_fallas;
  end if;
end $$;

-- @test auditoría de leads: ningún permiso de acción se pregunta con puede_lead(), ni se escribe a mano
-- `puede_lead()` es para leer (`leads.ver`). Actuar es `puede_actuar_lead()` / `_lead_mio()`. Esto
-- recorre los cuerpos de las funciones y las policies, y los grants de escritura de las tablas de leads.
do $$
declare
  v_lecturas_con_accion constant text[] := array['lead_seguimientos', 'lead_recordatorios'];  -- sólo dicen si «puede» anotar o agendar; no escriben
  v_tablas constant text[] := array['leads', 'leads_asesores', 'leads_telefonos', 'accesos_portal', 'oportunidades',
    'oportunidades_historial', 'lotes_papelera', 'vehiculos_interesados', 'vehiculos_vinculos', 'seguimientos',
    'recordatorios', 'leads_favoritos', 'leads_tachados', 'etiquetas', 'leads_etiquetas', 'leads_campos'];
  r record; v_fallas text := '';
begin
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proname <> all (v_lecturas_con_accion)
      and exists (select 1 from regexp_matches(p.prosrc, 'puede_lead\([^)]*''(leads\.[a-z_.]+)''', 'g') m where m[1] <> 'leads.ver')
  loop
    v_fallas := v_fallas || E'\n  puede_lead() con un permiso de acción en la función ' || r.proname || ' (usa puede_actuar_lead o _lead_mio)';
  end loop;
  for r in
    select c.tablename, c.policyname from pg_policies c
    where c.schemaname = 'public'
      and (exists (select 1 from regexp_matches(coalesce(c.qual, '') || ' ' || coalesce(c.with_check, ''), 'puede_lead\([^)]*''(leads\.[a-z_.]+)''', 'g') m where m[1] <> 'leads.ver')
        or (coalesce(c.qual, '') || ' ' || coalesce(c.with_check, '')) ~ '(alcance_de|tiene_permiso)\(''leads\.(editar|compartir|transferir|eliminar|portal)')
  loop
    v_fallas := v_fallas || E'\n  puede_lead() con un permiso de acción en la policy «' || r.policyname || '»';
  end loop;
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc ~ '_lead_de_cartera\('
  loop
    v_fallas := v_fallas || E'\n  usa _lead_de_cartera(), que ya no existe: ' || r.proname;
  end loop;
  -- Ninguna tabla de leads se escribe directo desde la app: se escribe por RPC.
  for r in
    select g.table_name, g.privilege_type from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.grantee in ('authenticated', 'anon') and g.table_name = any (v_tablas)
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  loop
    v_fallas := v_fallas || E'\n  authenticated puede ' || r.privilege_type || ' sobre ' || r.table_name;
  end loop;
  for r in
    select g.table_name, g.column_name, g.privilege_type from information_schema.column_privileges g
    where g.table_schema = 'public' and g.grantee in ('authenticated', 'anon') and g.privilege_type in ('INSERT', 'UPDATE')
      and g.table_name = any (v_tablas)
    union all
    select g.table_name, g.column_name, g.privilege_type from information_schema.column_privileges g
    where g.table_schema = 'public' and g.grantee in ('authenticated', 'anon') and g.privilege_type = 'UPDATE'
      and g.table_name = 'cotizaciones' and g.column_name = 'lead_id'
  loop
    v_fallas := v_fallas || E'\n  authenticated puede ' || r.privilege_type || ' la columna ' || r.table_name || '.' || r.column_name;
  end loop;
  if v_fallas <> '' then
    raise exception 'La regla de las tres clases se rompió:%', v_fallas;
  end if;
end $$;

-- @test auditoría de leads: ninguna función de leads la llama anon, y las de trigger no las llama nadie
do $$
declare r record; v_fallas text := '';
begin
  for r in
    select distinct p.proname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
      and c.relname in ('leads', 'leads_asesores', 'leads_telefonos', 'accesos_portal', 'oportunidades', 'oportunidades_historial',
        'lotes_papelera', 'vehiculos_interesados', 'vehiculos_vinculos', 'seguimientos', 'recordatorios', 'leads_favoritos',
        'leads_tachados', 'etiquetas', 'leads_etiquetas', 'leads_campos', 'vehiculos')
      and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
  loop
    v_fallas := v_fallas || E'\n  función de trigger de una tabla de leads llamable por la app: ' || r.proname;
  end loop;
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
      and (p.proname ~ 'lead|papelera|portal|vehiculo_vincular|vehiculo_interesado|telefono|en_cartera|mis_leads|seguimiento|recordatorio')
  loop
    v_fallas := v_fallas || E'\n  anon puede llamar ' || r.proname;
  end loop;
  -- Toda «definer» fija su search_path: una que no lo hace se puede secuestrar.
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    v_fallas := v_fallas || E'\n  función «definer» sin search_path: ' || r.proname;
  end loop;
  if v_fallas <> '' then
    raise exception 'La superficie de leads tiene un hueco:%', v_fallas;
  end if;
end $$;

-- @test auditoría de leads: lead_id en otras tablas sólo de un lead que se ve
do $$
declare r record; v_fallas text := '';
begin
  -- Toda tabla con una FK a `leads` que `authenticated` puede escribir tiene el trigger que exige ver el
  -- lead (o es de las que una policy ya mira: cotizaciones, oportunidades sin grant).
  for r in
    select c.conrelid::regclass::text as tabla
    from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'public.leads'::regclass
      and c.conrelid::regclass::text not in ('leads_asesores', 'leads_telefonos', 'leads_favoritos', 'leads_tachados',
          'leads_etiquetas', 'seguimientos', 'recordatorios', 'accesos_portal', 'oportunidades', 'vehiculos_interesados',
          'vehiculos_vinculos', 'cotizaciones', 'vehiculos', 'solicitudes_contacto_web')
      and exists (select 1 from information_schema.column_privileges g
                  where g.table_schema = 'public' and g.table_name = c.conrelid::regclass::text and g.grantee = 'authenticated'
                    and g.column_name = 'lead_id' and g.privilege_type in ('INSERT', 'UPDATE'))
      and not exists (select 1 from pg_trigger t where t.tgrelid = c.conrelid and t.tgname = 'trg_lead_visible')
  loop
    v_fallas := v_fallas || E'\n  se escribe lead_id sin mirar el lead en ' || r.tabla;
  end loop;
  if v_fallas <> '' then raise exception 'lead_id sin guardia:%', v_fallas; end if;
end $$;

-- @test auditoría de leads: lo del esquema web que recibe un lead es sólo de service_role, y el acceso del cliente se lee por RPC
-- El portal del cliente (Fase 8) llama a `web.portal_*` con service_role desde sus route handlers. Una
-- función de `web` que recibe un lead (o, «definer», nombra una tabla de leads) y que `anon` o
-- `authenticated` pueden llamar le daría a cualquiera lo que ve el cliente (parte 7b).
do $$
declare r record; v_fallas text := '';
begin
  for r in
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as firma,
           has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'web' and p.prokind = 'f'
      and (exists (select 1 from unnest(coalesce(p.proargnames, '{}')) a where a ~ '^p_leads?$|lead_id|^p_lead_')
        or exists (select 1 from unnest(p.proargtypes::regtype[]) t where t::text in ('leads', 'leads[]'))
        or (p.prosecdef and p.prosrc ~ 'public\.(leads\w*|accesos_portal|oportunidades\w*|seguimientos|recordatorios\w*|etiquetas\w*)\M'))
  loop
    if r.anon or r.auth then
      v_fallas := v_fallas || E'\n  ' || r.firma || ' la puede llamar ' || case when r.anon then 'anon' else 'authenticated' end;
    end if;
  end loop;
  -- Las cuatro del portal existen con su firma (el contrato con la Fase 8) y service_role las llama.
  for r in select f from (values ('web.portal_login(text,text)'), ('web.portal_snapshot(uuid,timestamp with time zone)'),
      ('web.portal_documento_ruta(uuid,timestamp with time zone,uuid)'), ('web.portal_cambiar_clave(uuid,timestamp with time zone,text,text)')) x (f)
  loop
    if to_regprocedure(r.f) is null then
      v_fallas := v_fallas || E'\n  el contrato del portal cambió: no existe ' || r.f;
    elsif not has_function_privilege('service_role', to_regprocedure(r.f), 'execute') then
      v_fallas := v_fallas || E'\n  service_role no puede llamar ' || r.f;
    end if;
  end loop;
  -- La tabla del acceso no la lee la app: el código sale por `portal_estado`, el hash por nada.
  if has_table_privilege('authenticated', 'public.accesos_portal', 'select')
     or has_any_column_privilege('authenticated', 'public.accesos_portal', 'select')
     or has_any_column_privilege('anon', 'public.accesos_portal', 'select') then
    v_fallas := v_fallas || E'\n  la app puede leer accesos_portal directo';
  end if;
  -- Los ayudantes del portal y el generador de códigos son sólo de las funciones «definer».
  for r in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname ~ '^_portal_' or p.proname = 'codigo_dictable')
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
  loop
    v_fallas := v_fallas || E'\n  la app puede llamar ' || r.proname;
  end loop;
  if v_fallas <> '' then
    raise exception 'El acceso del cliente tiene un hueco:%', v_fallas;
  end if;
end $$;

-- @test auditoría de leads: «intacto» mira todo lo que cuelga de un lead, y la versión todo su contenido
-- Deshacer una importación (parte 8b) manda a la papelera sólo lo que nadie tocó. Una tabla nueva con FK a
-- `leads`, o una columna nueva de `leads`, rompe esto hasta decidir si cuenta como «tocado».
do $$
declare
  -- cuenta: tener una fila ahí es haber hecho algo con el lead (`_lead_motivo_para_deshacer` la mira).
  -- marca: lo de quien mira (no cuenta). vinculo: el propio vínculo de la importación.
  -- copia: la escribe el trigger de `leads` al crear (los números que se leen, 9f-2): no cuenta.
  v_fk constant jsonb := '{
    "leads_asesores": "cuenta", "seguimientos": "cuenta", "recordatorios": "cuenta", "leads_telefonos": "cuenta",
    "vehiculos": "cuenta", "vehiculos_interesados": "cuenta", "vehiculos_vinculos": "cuenta", "oportunidades": "cuenta",
    "accesos_portal": "cuenta", "cotizaciones": "cuenta", "pagos": "cuenta", "eventos": "cuenta", "tareas": "cuenta",
    "mensajes": "cuenta", "repuestos_proyectos": "cuenta", "web_testimonios": "cuenta", "solicitudes_contacto_web": "cuenta",
    "leads_favoritos": "marca", "leads_tachados": "marca", "leads_etiquetas": "marca",
    "importaciones_leads": "vinculo", "leads_numeros_globales": "copia", "leads_numeros_propios": "copia"}';
  -- version: la mueve `lead_version()`. derivada: la escribe otra tabla o un trigger a partir de algo que ya cuenta (la
  -- cartera, de `leads_asesores`; los atributos públicos, de `atributos`: 9h). fija: no cambia.
  v_columnas constant jsonb := '{
    "nombre": "version", "tipo": "version", "tipo_lead_id": "version", "origen_lead_id": "version", "atributos": "version",
    "telefono_principal": "version", "telefono_cc": "version", "eliminado_en": "version", "lote_papelera_id": "version",
    "eliminado_por": "derivada", "ultimo_seguimiento_en": "derivada", "cartera": "derivada", "atributos_publicos": "derivada",
    "id": "fija", "numero": "fija", "numero_propio": "fija", "creado_por": "fija", "creado_en": "fija", "actualizado_en": "fija"}';
  v_motivo text := pg_get_functiondef('public._lead_motivo_para_deshacer(uuid,uuid)'::regprocedure);
  v_version text := (select p.prosrc from pg_proc p where p.oid = 'public.lead_version()'::regprocedure);
  r record; v_fallas text := '';
begin
  for r in
    select distinct c.conrelid::regclass::text as tabla from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'public.leads'::regclass
  loop
    if not v_fk ? r.tabla then
      v_fallas := v_fallas || E'\n  tabla nueva con FK a leads, sin decidir si cuenta para deshacer una importación: ' || r.tabla;
    elsif v_fk ->> r.tabla = 'cuenta' and position(('public.' || r.tabla || ' ') in v_motivo) = 0 then
      v_fallas := v_fallas || E'\n  _lead_motivo_para_deshacer no mira ' || r.tabla;
    end if;
  end loop;
  for r in select k from jsonb_object_keys(v_fk) k loop
    if not exists (select 1 from pg_constraint c where c.contype = 'f' and c.confrelid = 'public.leads'::regclass
                    and c.conrelid::regclass::text = r.k) then
      v_fallas := v_fallas || E'\n  en la lista y ya sin FK a leads: ' || r.k;
    end if;
  end loop;
  for r in
    select a.attname::text as columna from pg_attribute a
    where a.attrelid = 'public.leads'::regclass and a.attnum > 0 and not a.attisdropped
  loop
    if not v_columnas ? r.columna then
      v_fallas := v_fallas || E'\n  columna nueva de leads, sin decidir si mueve la versión: ' || r.columna;
    elsif v_columnas ->> r.columna = 'version' and position(('new.' || r.columna) in v_version) = 0 then
      v_fallas := v_fallas || E'\n  lead_version() no mira ' || r.columna;
    end if;
  end loop;
  if v_fallas <> '' then
    raise exception 'Deshacer una importación no ve todo lo que cuelga de un lead:%', v_fallas;
  end if;
end $$;
