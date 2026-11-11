-- La purga diaria de notificaciones y visitados (paso 7.01-1): `notificaciones_purgar()` y su job. No depende de otro archivo
-- (`SOLO=areas/notificaciones/purgar.sql`): cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   G1. Se van la leída y la accionada de 91 días y el visitado de 31; se quedan la no leída de 91, la leída de 89 y el visitado de 29.
--       Devuelve cuántas borró de cada tabla.
--   G2. El job `notificaciones-purgar` está en `cron.job`; ni `authenticated` ni `anon` ejecutan la función; `actividad_purgar` sigue sin job.

-- @test purgar: se van las leídas o accionadas de más de 90 días y los visitados de más de 30; lo demás se queda (G1)
begin;
do $$
declare a uuid := gen_random_uuid(); v jsonb; v_n int; v_v int;
  v_leida bigint; v_accionada bigint; v_abierta bigint; v_reciente bigint;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (a, a || '@ejemplo.com', '{"invitado": true}');
  insert into public.notificaciones (usuario_id, tipo, titulo, creado_en, leida_en) values (a, 'ng', 'Leída vieja', now() - interval '91 days', now() - interval '90 days') returning id into v_leida;
  insert into public.notificaciones (usuario_id, tipo, titulo, creado_en, accionada_en) values (a, 'ng', 'Accionada vieja', now() - interval '91 days', now() - interval '90 days') returning id into v_accionada;
  insert into public.notificaciones (usuario_id, tipo, titulo, creado_en) values (a, 'ng', 'Abierta vieja', now() - interval '91 days') returning id into v_abierta;
  insert into public.notificaciones (usuario_id, tipo, titulo, creado_en, leida_en) values (a, 'ng', 'Leída reciente', now() - interval '89 days', now() - interval '88 days') returning id into v_reciente;
  insert into public.visitados (usuario_id, tipo, referencia_id, visto_en) values
    (a, 'lead', '00000000-0000-0000-0000-0000000000a1', now() - interval '31 days'),
    (a, 'lead', '00000000-0000-0000-0000-0000000000a2', now() - interval '29 days');
  -- Lo que ya hubiera para purgar (de la semilla u otra prueba) también se cuenta.
  select count(*)::int into v_n from public.notificaciones where creado_en < now() - interval '90 days' and (leida_en is not null or accionada_en is not null);
  select count(*)::int into v_v from public.visitados where visto_en < now() - interval '30 days';
  v := public.notificaciones_purgar();
  if v <> jsonb_build_object('notificaciones', v_n, 'visitados', v_v) or v_n < 2 or v_v < 1 then raise exception 'devolvió %, se esperaba % y %', v, v_n, v_v; end if;
  if exists (select 1 from public.notificaciones where id in (v_leida, v_accionada)) then raise exception 'quedó una leída o accionada vieja'; end if;
  if (select count(*) from public.notificaciones where id in (v_abierta, v_reciente)) <> 2 then raise exception 'se fue la abierta vieja o la leída reciente'; end if;
  if exists (select 1 from public.visitados where usuario_id = a and referencia_id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'quedó el visitado de 31 días'; end if;
  if not exists (select 1 from public.visitados where usuario_id = a and referencia_id = '00000000-0000-0000-0000-0000000000a2') then raise exception 'se fue el visitado de 29 días'; end if;
  if public.notificaciones_purgar() <> '{"notificaciones": 0, "visitados": 0}'::jsonb then raise exception 'la segunda corrida borró algo'; end if;
end $$;
rollback;

-- @test purgar: el job notificaciones-purgar está en cron.job, la app no ejecuta la función y actividad_purgar sigue sin job (G2)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'notificaciones-purgar' and schedule = '45 3 * * *'
                 and command = 'select public.notificaciones_purgar()') then
    raise exception 'falta el job notificaciones-purgar';
  end if;
  if has_function_privilege('authenticated', 'public.notificaciones_purgar()', 'execute')
     or has_function_privilege('anon', 'public.notificaciones_purgar()', 'execute') then
    raise exception 'notificaciones_purgar() se puede ejecutar desde la app';
  end if;
  if exists (select 1 from cron.job where command ~ 'actividad_purgar') then raise exception 'actividad_purgar quedó programada'; end if;
end $$;
