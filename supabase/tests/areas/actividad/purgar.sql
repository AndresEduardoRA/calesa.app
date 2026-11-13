-- La purga diaria de la actividad (paso 9.01-1). No depende de otro archivo (`SOLO=areas/actividad/purgar.sql`).
--
-- Qué asegura:
--   T9.  `actividad-purgar` a las 03:25 UTC está en `cron.job` con su comando, y la app no ejecuta `actividad_purgar()`.
--   T10. La purga respeta `actividad_dias` y los 12 meses de `eventos_web`, y ya no toca `notificaciones` ni `visitados` (los purga notificaciones_purgar).

-- @test actividad: el job actividad-purgar está en cron.job y sólo lo ejecuta service_role (T9)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'actividad-purgar' and schedule = '25 3 * * *'
                 and command = 'select public.actividad_purgar()') then
    raise exception 'T9: falta el job actividad-purgar';
  end if;
  if has_function_privilege('authenticated', 'public.actividad_purgar()', 'execute') or has_function_privilege('anon', 'public.actividad_purgar()', 'execute') then
    raise exception 'T9: la app ejecuta actividad_purgar';
  end if;
  if not has_function_privilege('service_role', 'public.actividad_purgar()', 'execute') then raise exception 'T9: service_role no ejecuta actividad_purgar'; end if;
end $$;

-- @test actividad: la purga borra lo de más de actividad_dias y los eventos de más de 12 meses, y nada más (T10)
begin;
do $$
declare v_vieja bigint; v_nueva bigint; v_ev_viejo bigint; v_ev_nuevo bigint; v_n int; v_notif int; v_vis int;
begin
  update public.ajustes_empresa set actividad_dias = 3 where id = 1;
  insert into public.actividad (accion, tabla, registro_id, creado_en) values ('act.prueba', 'act_inventada', '1', now() - interval '5 days') returning id into v_vieja;
  insert into public.actividad (accion, tabla, registro_id, creado_en) values ('act.prueba', 'act_inventada', '2', now() - interval '1 day') returning id into v_nueva;
  insert into public.eventos_web (token, evento, creado_en) values ('act', 'page_view', now() - interval '13 months') returning id into v_ev_viejo;
  insert into public.eventos_web (token, evento, creado_en) values ('act', 'page_view', now() - interval '11 months') returning id into v_ev_nuevo;
  -- Una notificación leída y un visitado viejos: lo de notificaciones_purgar, que esta purga ya no toca.
  insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-4000-8000-00000009902a', 'act-purgar@ejemplo.com', '{"invitado": true}');
  insert into public.notificaciones (usuario_id, tipo, titulo, leida_en, creado_en)
  values ('00000000-0000-4000-8000-00000009902a', 'act', 'ACT vieja', now() - interval '200 days', now() - interval '200 days');
  insert into public.visitados (usuario_id, tipo, referencia_id, visto_en)
  values ('00000000-0000-4000-8000-00000009902a', 'lead', gen_random_uuid(), now() - interval '200 days');
  select count(*) into v_notif from public.notificaciones;
  select count(*) into v_vis from public.visitados;
  v_n := public.actividad_purgar();
  if v_n < 1 then raise exception 'T10: la purga dijo que borró %', v_n; end if;
  if exists (select 1 from public.actividad where id = v_vieja) then raise exception 'T10: quedó la actividad de hace 5 días'; end if;
  if not exists (select 1 from public.actividad where id = v_nueva) then raise exception 'T10: borró la actividad de ayer'; end if;
  if exists (select 1 from public.actividad where creado_en < now() - interval '3 days') then raise exception 'T10: quedó actividad de más de actividad_dias'; end if;
  if exists (select 1 from public.eventos_web where id = v_ev_viejo) then raise exception 'T10: quedó el evento de hace 13 meses'; end if;
  if not exists (select 1 from public.eventos_web where id = v_ev_nuevo) then raise exception 'T10: borró el evento de hace 11 meses'; end if;
  if (select count(*) from public.notificaciones) <> v_notif or (select count(*) from public.visitados) <> v_vis then
    raise exception 'T10: la purga tocó notificaciones o visitados'; end if;
end $$;
rollback;
