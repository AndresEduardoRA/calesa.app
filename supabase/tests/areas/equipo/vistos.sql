-- «Visto» por persona y módulo: `visto_registrar()`, `vistos_de()`, `vistos_purgar()` y la RLS de `vistos`. No depende de otro archivo
-- (`SOLO=areas/equipo/vistos.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   VI1. Nadie lee ni borra lo visto de otra persona; `authenticated` no escribe la tabla directo.
--   VI2. Registrar dos veces dentro de 30 s escribe una sola vez; el mismo registro en otro módulo es otra fila.
--   VI3. Con «Vistos» apagado no se escribe nada.
--   VI4. `vistos_de` trae sólo los ids pedidos (hasta 100) y el último visto del módulo.
--   VI5. La purga respeta la retención de cada persona (7 días por defecto, 30 si la eligió).
--   VI6. La preferencia sólo acepta días de la lista.
--   VI7. Con 20.000 filas, una nueva no entra; una ya vista sí mueve su hora.

create or replace function pg_temp.vi_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

create or replace function pg_temp.vi_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end $f$;

-- @test vistos: cada persona ve y borra sólo lo suyo, y nadie escribe la tabla directo (VI1)
begin;
do $$
declare a uuid; b uuid; x uuid := gen_random_uuid(); n int;
begin
  perform pg_temp.vi_persona();
  a := pg_temp.vi_persona();
  b := pg_temp.vi_persona();
  perform pg_temp.vi_como(a);
  perform public.visto_registrar('vehiculos', 'vehiculo', x);
  reset role;
  perform pg_temp.vi_como(b);
  select count(*) into n from public.vistos;
  if n <> 0 then raise exception 'VI1: b lee lo de a (%)', n; end if;
  delete from public.vistos where referencia_id = x;
  reset role;
  if not exists (select 1 from public.vistos where usuario_id = a and referencia_id = x) then
    raise exception 'VI1: b borró lo de a';
  end if;
  perform pg_temp.vi_como(b);
  begin
    insert into public.vistos (usuario_id, modulo, tipo, referencia_id) values (b, 'leads', 'lead', x);
    raise exception 'VI1: authenticated escribió directo';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;
rollback;

-- @test vistos: el antirrebote escribe una vez y el módulo separa (VI2), y apagado no escribe (VI3)
begin;
do $$
declare a uuid; x uuid := gen_random_uuid(); r1 boolean; r2 boolean; n int;
begin
  perform pg_temp.vi_persona();
  a := pg_temp.vi_persona();
  perform pg_temp.vi_como(a);
  r1 := public.visto_registrar('vehiculos', 'vehiculo', x);
  r2 := public.visto_registrar('vehiculos', 'vehiculo', x);
  perform public.visto_registrar('logistica', 'vehiculo', x);
  reset role;
  if not r1 or r2 then raise exception 'VI2: antirrebote (% %)', r1, r2; end if;
  select count(*) into n from public.vistos where usuario_id = a and referencia_id = x;
  if n <> 2 then raise exception 'VI2: el módulo separa: %', n; end if;

  insert into public.preferencias_usuario (usuario_id, clave, valor) values (a, 'vistos', '{"activado": false}');
  perform pg_temp.vi_como(a);
  r1 := public.visto_registrar('leads', 'lead', gen_random_uuid());
  reset role;
  if r1 or exists (select 1 from public.vistos where usuario_id = a and modulo = 'leads') then
    raise exception 'VI3: apagado escribió';
  end if;
end $$;
rollback;

-- @test vistos: vistos_de trae los ids pedidos y el último del módulo (VI4)
begin;
do $$
declare a uuid; x uuid := gen_random_uuid(); y uuid := gen_random_uuid(); z uuid := gen_random_uuid(); r jsonb;
begin
  perform pg_temp.vi_persona();
  a := pg_temp.vi_persona();
  insert into public.vistos (usuario_id, modulo, tipo, referencia_id, visto_en) values
    (a, 'leads', 'lead', x, now() - interval '2 hours'),
    (a, 'leads', 'lead', y, now() - interval '1 hour'),
    (a, 'leads', 'lead', z, now());
  perform pg_temp.vi_como(a);
  r := public.vistos_de('leads', 'lead', array[x, y]);
  reset role;
  if jsonb_array_length(r -> 'vistos') <> 2 or (r ->> 'ultimo')::uuid <> z then
    raise exception 'VI4: %', r;
  end if;
end $$;
rollback;

-- @test vistos: la purga respeta la retención de cada persona (VI5) y la preferencia sólo acepta días de la lista (VI6)
begin;
do $$
declare a uuid; b uuid; x uuid := gen_random_uuid();
begin
  perform pg_temp.vi_persona();
  a := pg_temp.vi_persona();
  b := pg_temp.vi_persona();
  insert into public.preferencias_usuario (usuario_id, clave, valor) values (b, 'vistos', '{"dias": 30}');
  insert into public.vistos (usuario_id, modulo, tipo, referencia_id, visto_en) values
    (a, 'leads', 'lead', x, now() - interval '10 days'),
    (b, 'leads', 'lead', x, now() - interval '10 days'),
    (b, 'leads', 'lead', gen_random_uuid(), now() - interval '40 days');
  perform public.vistos_purgar();
  if exists (select 1 from public.vistos where usuario_id = a) then raise exception 'VI5: a conserva lo de hace 10 días'; end if;
  if (select count(*) from public.vistos where usuario_id = b) <> 1 then raise exception 'VI5: b debía conservar sólo lo de hace 10 días'; end if;
  begin
    update public.preferencias_usuario set valor = '{"dias": 15}' where usuario_id = b and clave = 'vistos';
    raise exception 'VI6: aceptó 15 días';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- @test vistos: el techo de 20.000 por persona frena lo nuevo y deja mover lo ya visto (VI7)
begin;
do $$
declare a uuid; x uuid; r boolean;
begin
  perform pg_temp.vi_persona();
  a := pg_temp.vi_persona();
  insert into public.vistos (usuario_id, modulo, tipo, referencia_id, visto_en)
  select a, 'leads', 'lead', gen_random_uuid(), now() - interval '1 day' from generate_series(1, 20000);
  select referencia_id into x from public.vistos where usuario_id = a limit 1;
  perform pg_temp.vi_como(a);
  r := public.visto_registrar('leads', 'lead', gen_random_uuid());
  if r then raise exception 'VI7: entró una nueva sobre el techo'; end if;
  r := public.visto_registrar('leads', 'lead', x);
  if not r then raise exception 'VI7: no movió la hora de una ya vista'; end if;
  reset role;
end $$;
rollback;
