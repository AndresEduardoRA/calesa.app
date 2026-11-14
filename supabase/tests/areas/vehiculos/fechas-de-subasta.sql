-- Editar las fechas de la subasta (A4b): `vehiculo_guardar` escribe `subasta_en` y `subasta_fin_en` sólo en un origen de subasta, como
-- instante con su zona; null las borra. No depende de otro archivo (`SOLO=areas/vehiculos/fechas-de-subasta.sql`).
--
-- Qué asegura:
--   FS1. En un origen de subasta guarda las dos fechas (el instante, no la hora del servidor) y null las borra.
--   FS2. Un texto sin zona, una fecha que no existe o un cierre antes del inicio se rechazan, con el campo en `hint`.
--   FS3. En un origen que no es de subasta, las fechas no se escriben.
--   FS4. `_vehiculo_instante` es privada.

create or replace function pg_temp.fs_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fs_' || substr(v_id::text, 1, 8), 'FS ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'vehiculos.ver', 'todos'), (v_rol, 'vehiculos.editar', 'todos');
  return v_id;
end $f$;

-- Guarda como esa persona y devuelve {ok} o {error, hint}.
create or replace function pg_temp.fs_guardar(p_quien uuid, p_vehiculo uuid, p_datos jsonb) returns jsonb language plpgsql as $f$
declare v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.vehiculo_guardar(p_vehiculo, (select actualizado_en from public.vehiculos where id = p_vehiculo), p_datos);
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'hint', v_h);
  end;
  reset role;
  return '{"ok": true}'::jsonb;
end $f$;

-- @test fechas de subasta: se guardan como instante y null las borra; lo inválido se rechaza con su campo (FS1, FS2)
begin;
do $$
declare q uuid; o uuid; v uuid; r jsonb;
begin
  perform pg_temp.fs_persona();   -- con `SOLO=`, la primera cuenta nace dueña
  q := pg_temp.fs_persona();
  insert into public.origenes (clave, nombre, tipo) values ('fs_' || substr(gen_random_uuid()::text, 1, 8), 'FS subasta', 'subasta') returning id into o;
  insert into public.vehiculos (origen_id, titulo) values (o, 'FS Copart') returning id into v;
  set local timezone = 'Asia/Tokyo';   -- la hora del servidor no interviene
  r := pg_temp.fs_guardar(q, v, '{"subasta_en": "2026-03-08T14:30:00Z", "subasta_fin_en": "2026-03-08T11:30:00-05:00"}');
  if r <> '{"ok": true}' then raise exception 'FS1: no guardó: %', r; end if;
  if (select (subasta_en, subasta_fin_en) from public.vehiculos where id = v)
     is distinct from ('2026-03-08 14:30:00+00'::timestamptz, '2026-03-08 16:30:00+00'::timestamptz) then
    raise exception 'FS1: guardó otra cosa: %', (select (subasta_en, subasta_fin_en) from public.vehiculos where id = v);
  end if;
  r := pg_temp.fs_guardar(q, v, '{"subasta_fin_en": null}');
  if r <> '{"ok": true}' or (select subasta_fin_en from public.vehiculos where id = v) is not null then raise exception 'FS1: null no borró: %', r; end if;
  r := pg_temp.fs_guardar(q, v, '{"subasta_en": "2026-03-08T14:30"}');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'subasta_en' then raise exception 'FS2: sin zona: %', r; end if;
  r := pg_temp.fs_guardar(q, v, '{"subasta_en": "2026-02-30T10:00:00Z"}');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'subasta_en' then raise exception 'FS2: fecha que no existe: %', r; end if;
  r := pg_temp.fs_guardar(q, v, '{"subasta_en": 5}');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'subasta_en' then raise exception 'FS2: un número: %', r; end if;
  r := pg_temp.fs_guardar(q, v, '{"subasta_fin_en": "2026-03-08T10:00:00Z"}');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'subasta_fin_en' then raise exception 'FS2: cierre antes del inicio: %', r; end if;
  if (select subasta_en from public.vehiculos where id = v) <> '2026-03-08 14:30:00+00'::timestamptz then raise exception 'FS2: un rechazo cambió la fecha'; end if;
end $$;
rollback;

-- @test fechas de subasta: en un origen que no es de subasta no se escriben (FS3)
begin;
do $$
declare q uuid; o uuid; v uuid; r jsonb;
begin
  perform pg_temp.fs_persona();
  q := pg_temp.fs_persona();
  insert into public.origenes (clave, nombre, tipo) values ('fs_' || substr(gen_random_uuid()::text, 1, 8), 'FS manual', 'manual') returning id into o;
  insert into public.vehiculos (origen_id, titulo) values (o, 'FS Corolla') returning id into v;
  r := pg_temp.fs_guardar(q, v, '{"subasta_en": "2026-03-08T14:30:00Z"}');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'subasta_en' then raise exception 'FS3: %', r; end if;
  if (select subasta_en from public.vehiculos where id = v) is not null then raise exception 'FS3: escribió la fecha'; end if;
  -- Lo demás sigue igual: guardar el título sin fechas no las pide.
  r := pg_temp.fs_guardar(q, v, '{"titulo": "FS Corolla 2020"}');
  if r <> '{"ok": true}' then raise exception 'FS3: el título: %', r; end if;
end $$;
rollback;

-- @test fechas de subasta: el lector del instante es privado (FS4)
begin;
do $$
begin
  if has_function_privilege('authenticated', 'public._vehiculo_instante(jsonb, text, text)', 'execute') then
    raise exception 'FS4: _vehiculo_instante no es privada';
  end if;
end $$;
rollback;
