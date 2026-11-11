-- La puerta de `notificaciones` (paso 7.01-1): toda fila entra por un `before insert` que la descarta si el destinatario está de baja, bloqueado o no
-- tiene perfil; `notificar()` conserva su firma y nadie de la app inserta. No depende de otro archivo (`SOLO=areas/notificaciones/puerta.sql`): cada
-- bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. B no lee, no marca leída ni borra la de A; A la lee.
--   P2. `authenticated` no inserta ni ejecuta `notificar()` (tampoco `anon`).
--   P3. Antispam: dos avisos iguales dejan uno; con el primero accionado, el siguiente entra.
--   P4. Baja y bloqueado no reciben, ni por `notificar()` ni por un insert directo (como el de `alertas_demora`); un uuid sin perfil no entra y no falla.
--   P5. Los dos índices de la lista con sus columnas y su predicado; la tabla en la publicación `supabase_realtime`.

create or replace function pg_temp.np_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.np_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Un aviso por la función de siempre (como la llama el job, con los derechos de la base).
create or replace function pg_temp.np_avisar(p_quien uuid, p_ref uuid, p_tipo text default 'np_prueba') returns void language sql as $f$
  select public.notificar(p_quien, p_tipo, 'Aviso de prueba', null, 'np', p_ref, '/inicio', true);
$f$;

create or replace function pg_temp.np_cuantas(p_quien uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where usuario_id = p_quien;
$f$;

-- @test notificaciones: B no lee, no marca leída ni borra la de A; A la lee (P1)
begin;
do $$
declare a uuid := pg_temp.np_persona(); b uuid := pg_temp.np_persona(); v_id bigint; r jsonb;
begin
  perform pg_temp.np_avisar(a, gen_random_uuid());
  select id into v_id from public.notificaciones where usuario_id = a;
  r := pg_temp.np_corre(b, 'select to_jsonb(count(*)) from public.notificaciones');
  if r <> '0'::jsonb then raise exception 'B lee las de A: %', r; end if;
  r := pg_temp.np_corre(b, format('with u as (update public.notificaciones set leida_en = now() where id = %s returning 1) select to_jsonb(count(*)) from u', v_id));
  if r <> '0'::jsonb then raise exception 'B marcó leída la de A: %', r; end if;
  r := pg_temp.np_corre(b, format('with d as (delete from public.notificaciones where id = %s returning 1) select to_jsonb(count(*)) from d', v_id));
  if r <> '0'::jsonb then raise exception 'B borró la de A: %', r; end if;
  if (select leida_en from public.notificaciones where id = v_id) is not null then raise exception 'la de A quedó leída'; end if;
  r := pg_temp.np_corre(a, 'select to_jsonb(count(*)) from public.notificaciones');
  if r <> '1'::jsonb then raise exception 'A no lee la suya: %', r; end if;
end $$;
rollback;

-- @test notificaciones: authenticated no inserta ni ejecuta notificar(), y anon tampoco (P2)
begin;
do $$
declare a uuid := pg_temp.np_persona(); r jsonb;
  v_fn constant text := 'public.notificar(uuid, text, text, text, text, uuid, text, boolean)';
begin
  if has_table_privilege('authenticated', 'public.notificaciones', 'insert') then raise exception 'authenticated puede insertar'; end if;
  if has_table_privilege('anon', 'public.notificaciones', 'insert') then raise exception 'anon puede insertar'; end if;
  if has_function_privilege('authenticated', v_fn, 'execute') then raise exception 'authenticated ejecuta notificar()'; end if;
  if has_function_privilege('anon', v_fn, 'execute') then raise exception 'anon ejecuta notificar()'; end if;
  r := pg_temp.np_corre(a, format($s$insert into public.notificaciones (usuario_id, tipo, titulo) values (%L, 'np', 'x') returning to_jsonb(id)$s$, a));
  if r ->> 'error' is distinct from '42501' then raise exception 'el insert de A no da 42501: %', r; end if;
  r := pg_temp.np_corre(a, format($s$select to_jsonb(public.notificar(%L, 'np', 'x', null, null, null, null, false))$s$, a));
  if r ->> 'error' is distinct from '42501' then raise exception 'notificar() como A no da 42501: %', r; end if;
  if pg_temp.np_cuantas(a) <> 0 then raise exception 'algo entró'; end if;
end $$;
rollback;

-- @test notificaciones: antispam, dos avisos iguales dejan uno y con el primero accionado el siguiente entra (P3)
begin;
do $$
declare a uuid := pg_temp.np_persona(); v_ref uuid := gen_random_uuid();
begin
  perform pg_temp.np_avisar(a, v_ref);
  perform pg_temp.np_avisar(a, v_ref);
  if pg_temp.np_cuantas(a) <> 1 then raise exception 'el antispam dejó %', pg_temp.np_cuantas(a); end if;
  update public.notificaciones set accionada_en = now() where usuario_id = a;
  perform pg_temp.np_avisar(a, v_ref);
  if pg_temp.np_cuantas(a) <> 2 then raise exception 'con la primera accionada quedaron %', pg_temp.np_cuantas(a); end if;
end $$;
rollback;

-- @test notificaciones: baja y bloqueado no reciben, ni por notificar() ni por insert directo; una activa sí; sin perfil no entra ni falla (P4)
begin;
do $$
declare activa uuid := pg_temp.np_persona(); baja uuid := pg_temp.np_persona(); bloqueada uuid := pg_temp.np_persona(); q uuid;
begin
  update public.perfiles set activo = false, baja_en = now() where id = baja;
  update public.perfiles set bloqueado = true, bloqueado_en = now() where id = bloqueada;
  foreach q in array array[activa, baja, bloqueada] loop
    perform pg_temp.np_avisar(q, gen_random_uuid());
    -- Como lo hacen `alertas_demora` y los turnos web: un insert directo, sin `notificar()`.
    insert into public.notificaciones (usuario_id, tipo, titulo, referencia_tipo, referencia_id, ruta, requiere_accion)
    values (q, 'np_directo', 'Directo', 'np', gen_random_uuid(), '/inicio', false);
  end loop;
  if pg_temp.np_cuantas(activa) <> 2 then raise exception 'la activa recibió %', pg_temp.np_cuantas(activa); end if;
  if pg_temp.np_cuantas(baja) <> 0 then raise exception 'la de baja recibió %', pg_temp.np_cuantas(baja); end if;
  if pg_temp.np_cuantas(bloqueada) <> 0 then raise exception 'la bloqueada recibió %', pg_temp.np_cuantas(bloqueada); end if;
  q := gen_random_uuid();
  perform pg_temp.np_avisar(q, gen_random_uuid());
  insert into public.notificaciones (usuario_id, tipo, titulo) values (q, 'np_directo', 'Directo');
  if pg_temp.np_cuantas(q) <> 0 then raise exception 'entró una sin perfil'; end if;
  if has_function_privilege('authenticated', 'public.notificaciones_puerta()', 'execute')
     or has_function_privilege('anon', 'public.notificaciones_puerta()', 'execute') then
    raise exception 'la puerta se puede ejecutar desde la app';
  end if;
end $$;
rollback;

-- @test notificaciones: los dos índices de la lista, con sus columnas y el predicado del parcial (P5)
do $$
declare v text;
begin
  select indexdef into v from pg_indexes where schemaname = 'public' and indexname = 'notificaciones_usuario_fecha_idx';
  if v is null or v not like '%(usuario_id, creado_en DESC, id DESC)' then raise exception 'falta o cambió notificaciones_usuario_fecha_idx: %', v; end if;
  select indexdef into v from pg_indexes where schemaname = 'public' and indexname = 'notificaciones_por_accionar_idx';
  if v is null or v not like '%(usuario_id, creado_en DESC, id DESC) WHERE (requiere_accion AND (accionada_en IS NULL))' then
    raise exception 'falta o cambió notificaciones_por_accionar_idx: %', v;
  end if;
end $$;

-- @test notificaciones: la tabla está en la publicación supabase_realtime; leads y cotizaciones siguen fuera (P5)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones') then
    raise exception 'notificaciones no está en supabase_realtime';
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('leads', 'cotizaciones')) then
    raise exception 'leads o cotizaciones quedaron publicadas';
  end if;
end $$;
