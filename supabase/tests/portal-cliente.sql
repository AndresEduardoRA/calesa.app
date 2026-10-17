-- @test portal del cliente: personas, leads y ayudantes
-- El acceso del cliente (Fase 3, parte 7b): las RPC del equipo y el contrato de `web.portal_*` con la
-- Fase 8. Corre después de la matriz (usa sus personas y `pg_temp.como`/`espero`/`bien`). PGlite no trae
-- pgcrypto: `crypt` es un doble (lo de bcrypt real, el costo y el tiempo, lo mira `pnpm db:carreras`).
--   0050 dueño de los leads «Portal …» (asesor «propios», con `leads.portal.gestionar`)
--   0051 compartido en «Portal P1» (igual)     0070 compartido en «Portal P1», sin `leads.portal.gestionar`
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000070', 'portal-sin-permiso@ejemplo.com', '{"invitado": true}');
insert into public.roles (clave, nombre) values ('humo_portal_sin_permiso', 'Portal sin permiso');
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.clave, 'propios' from public.roles r cross join (values ('leads.ver'), ('leads.editar')) x (clave)
where r.clave = 'humo_portal_sin_permiso';
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-000000000070', id from public.roles where clave = 'humo_portal_sin_permiso';
update public.perfiles set invitacion_aceptada_en = now(), nombre = 'Sin Portal' where id = '00000000-0000-0000-0000-000000000070';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000050', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Portal P1', '78100001'), ('Portal P2', '78100002'), ('Portal P3', '78100003'),
      ('Portal P4', '78100004'), ('Portal P5', '78100005')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
select l.id, u.id, 'compartido', '00000000-0000-0000-0000-000000000050'
from public.leads l cross join (values ('00000000-0000-0000-0000-000000000051'::uuid), ('00000000-0000-0000-0000-000000000070')) u (id)
where l.nombre = 'Portal P1';

-- Corre una sentencia con un rol de la base (service_role, anon, authenticated) y devuelve cómo terminó.
create or replace function pg_temp.con_rol(p_rol text, p_sql text) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  execute format('set local role %I', p_rol);
  begin
    execute p_sql into v;
    reset role;
    return jsonb_build_object('ok', true, 'valor', v);
  exception when others then
    reset role;
    return jsonb_build_object('ok', false, 'estado', sqlstate, 'mensaje', sqlerrm);
  end;
end $$;
-- Otorga como una persona y devuelve el resultado (falla si no sale bien).
create or replace function pg_temp.otorgar(p_persona text, p_lead uuid, p_clave text) returns jsonb language plpgsql as $$
begin
  return pg_temp.bien(pg_temp.como(p_persona, format('select public.otorgar_portal(%L, %L, %L::timestamptz)', p_lead, p_clave,
    (select a.otorgado_en from public.accesos_portal a where a.lead_id = p_lead)))) -> 'valor';
end $$;
-- Un login con service_role: la fila que devuelve (o null).
create or replace function pg_temp.login(p_codigo text, p_clave text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  r := pg_temp.con_rol('service_role', format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from web.portal_login(%L, %L) x', p_codigo, p_clave));
  if not (r ->> 'ok')::boolean then raise exception 'el login falló con un error (debía ser vacío): %', r; end if;
  return r -> 'valor' -> 0;
end $$;
select set_config('portal.p1', (select id::text from public.leads where nombre = 'Portal P1'), false);
select set_config('portal.p2', (select id::text from public.leads where nombre = 'Portal P2'), false);
select set_config('portal.p3', (select id::text from public.leads where nombre = 'Portal P3'), false);
select set_config('portal.p4', (select id::text from public.leads where nombre = 'Portal P4'), false);
select set_config('portal.p5', (select id::text from public.leads where nombre = 'Portal P5'), false);

-- @test portal del cliente: otorgar, generar la clave, volver a otorgar con versión y el estado
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u51 constant text := '00000000-0000-0000-0000-000000000051';
  u70 constant text := '00000000-0000-0000-0000-000000000070';
  p1 uuid := current_setting('portal.p1')::uuid; r jsonb; o1 jsonb; o2 jsonb; e jsonb;
begin
  -- Sin acceso: el estado lo dice, y la versión esperada es nula.
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p1))) -> 'valor';
  if e <> '{"estado": "sin_acceso"}'::jsonb then raise exception 'sin acceso: %', e; end if;
  -- Generada: diez símbolos del alfabeto, una sola vez en la respuesta.
  o1 := pg_temp.otorgar(u50, p1, null);
  if o1 ->> 'clave' !~ '^[2-9A-HJ-NP-Z]{10}$' then raise exception 'clave generada: %', o1; end if;
  if o1 ->> 'codigo' !~ '^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$' then raise exception 'código: %', o1; end if;
  if extract(microseconds from (o1 ->> 'otorgado_en')::timestamptz)::bigint % 1000 <> 0 then
    raise exception 'otorgado_en con microsegundos (no sobrevive a un Date de JS): %', o1; end if;
  -- Otra pestaña que cree que no hay acceso, o una persona con la versión vieja: PT409 con quién y cuándo.
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p1, 'otra-clave-1'));
  perform pg_temp.espero(r, 'PT409', 'Ya lo otorgaste hace un momento desde otra ventana. Recarga para ver el código nuevo.', 'otorgar sin ver el vigente');
  r := pg_temp.como(u51, format('select public.otorgar_portal(%L, %L, %L::timestamptz)', p1, 'otra-clave-1', (o1 ->> 'otorgado_en')::timestamptz - interval '1 second'));
  perform pg_temp.espero(r, 'PT409', 'Ya lo otorgó Dueño Matriz hace un momento. Recarga para ver el código nuevo.', 'otorgar con la versión vieja');
  -- Con la versión que ve, el compartido lo vuelve a otorgar con una clave escrita: código nuevo, versión nueva, sin clave en la respuesta.
  o2 := pg_temp.otorgar(u51, p1, 'Ñandú-2026 ✓ clave');
  if o2 ? 'clave' then raise exception 'devolvió la clave escrita: %', o2; end if;
  if o2 ->> 'codigo' = o1 ->> 'codigo' then raise exception 'volver a otorgar no cambió el código'; end if;
  if (o2 ->> 'otorgado_en')::timestamptz <= (o1 ->> 'otorgado_en')::timestamptz then raise exception 'la versión no avanzó'; end if;
  -- El estado: el código y quién; nunca el hash ni la clave.
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p1))) -> 'valor';
  if e ->> 'estado' <> 'activo' or e ->> 'codigo' <> o2 ->> 'codigo' or e -> 'otorgado_por' ->> 'nombre' <> 'Compartido Matriz'
     or (e ->> 'otorgado_en')::timestamptz <> (o2 ->> 'otorgado_en')::timestamptz or not (e ->> 'debe_cambiar_clave')::boolean then
    raise exception 'estado: %', e; end if;
  if e ? 'clave' or e ? 'clave_hash' or e::text ~ '\$2[aby]\$|Ñandú' or e::text like '%' || (o1 ->> 'clave') || '%' then
    raise exception 'el estado filtra la clave: %', e; end if;
  -- La constancia: otorgado y reotorgado con los códigos, nunca la clave.
  if (select count(*) from public.actividad where registro_id = p1::text and accion = 'portal.otorgado') <> 1
     or (select detalle ->> 'codigo_anterior' from public.actividad where registro_id = p1::text and accion = 'portal.reotorgado') <> o1 ->> 'codigo' then
    raise exception 'actividad: %', (select jsonb_agg(to_jsonb(a)) from public.actividad a where registro_id = p1::text); end if;
  if exists (select 1 from public.actividad a where to_jsonb(a)::text like '%' || (o1 ->> 'clave') || '%' or to_jsonb(a)::text like '%Ñandú%') then
    raise exception 'una clave quedó en actividad'; end if;
  if exists (select 1 from public.actividad a where a.tabla = 'accesos_portal' and a.accion like 'accesos_portal.%') then
    raise exception 'el trigger genérico sigue escribiendo accesos_portal en actividad'; end if;
  -- Con la cartera pero sin `leads.portal.gestionar`: como si no existiera.
  r := pg_temp.como(u70, format('select public.portal_estado(%L)', p1));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'la cartera sin el permiso vio el estado');
  r := pg_temp.como(u70, format('select public.otorgar_portal(%L, %L, %L::timestamptz)', p1, 'clave-larga-9', (o2 ->> 'otorgado_en')));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'la cartera sin el permiso otorgó');
  r := pg_temp.como(u70, format('select public.revocar_portal(%L)', p1));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'la cartera sin el permiso revocó');
  r := pg_temp.como(u70, format('select public.portal_desbloquear(%L)', p1));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'la cartera sin el permiso desbloqueó');
end $$;

-- @test portal del cliente: la regla de la clave y los códigos que se generan
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p2 uuid := current_setting('portal.p2')::uuid; r jsonb; v_c text; i int;
begin
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p2, 'corta'));
  perform pg_temp.espero(r, '22023', 'La clave necesita al menos 8 caracteres.', 'clave corta');
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p2, repeat('a', 65)));
  perform pg_temp.espero(r, '22023', 'La clave puede tener hasta 64 caracteres.', 'clave de 65');
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p2, repeat('ñ', 40)));
  perform pg_temp.espero(r, '22023', 'La clave es demasiado larga: usa menos tildes o símbolos.', 'clave de más de 72 bytes');
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p2, E'clave-con\tTab'));
  perform pg_temp.espero(r, '22023', 'La clave no puede llevar saltos de línea ni tabulaciones.', 'clave con un control');
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p2, '        '));
  if not (r ->> 'ok')::boolean then raise exception 'ocho espacios son una clave (no se recorta): %', r; end if;
  if exists (select 1 from public.accesos_portal where lead_id = p2 and clave_hash like '%corta%') then raise exception 'la clave en claro'; end if;
  -- Mil claves y mil códigos: siempre dentro del alfabeto.
  for i in 1..1000 loop
    v_c := public.codigo_dictable(10);
    if v_c !~ '^[2-9A-HJ-NP-Z]{10}$' then raise exception 'fuera del alfabeto: %', v_c; end if;
  end loop;
  -- El índice sin guion: dos accesos no comparten código, ni escrito con otro prefijo de igual largo.
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, %L::timestamptz)', p2, 'clave-larga-p2',
    (select otorgado_en from public.accesos_portal where lead_id = p2)));
  begin
    insert into public.accesos_portal (lead_id, codigo, clave_hash)
    values (current_setting('portal.p3')::uuid, (select codigo from public.accesos_portal where lead_id = p2), 'x');
    raise exception 'dos accesos con el mismo código';
  exception when unique_violation then null; end;
end $$;

-- @test portal del cliente: dos mil accesos, ningún código repetido
-- Los leads se escriben directo (con `crear_lead` el bloque tardaba ~50 s); los accesos, por la RPC.
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.leads (nombre, telefono_principal) select 'Portal masivo ' || g, (79200000 + g)::text from generate_series(1, 2000) g;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
select id, '00000000-0000-0000-0000-000000000050', 'dueno' from public.leads where nombre like 'Portal masivo %'
on conflict do nothing;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000050', false);
set role authenticated;
do $$ declare v_id uuid; begin
  for v_id in select id from public.leads_vista where nombre like 'Portal masivo %' loop
    perform public.otorgar_portal(v_id, 'clave-masiva-1', null);
  end loop;
end $$;
reset role;
do $$ declare n int; d int; begin
  select count(*), count(distinct replace(codigo, '-', '')) into n, d from public.accesos_portal a join public.leads l on l.id = a.lead_id
  where l.nombre like 'Portal masivo %' and a.codigo ~ '^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$';
  if n <> 2000 or d <> 2000 then raise exception 'códigos: % accesos, % distintos', n, d; end if;
  delete from public.leads where nombre like 'Portal masivo %';
end $$;

-- @test portal del cliente: una colisión del código se reintenta
do $do$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p3 uuid := current_setting('portal.p3')::uuid; p4 uuid := current_setting('portal.p4')::uuid; o jsonb; r jsonb; v_cod text;
begin
  o := pg_temp.otorgar(u50, p3, 'clave-larga-p3');
  v_cod := split_part(o ->> 'codigo', '-', 2);
  -- El generador devuelve primero el código que ya existe y después otro: el segundo intento gana.
  execute format($f$create or replace function public.codigo_dictable(p_largo int default 5) returns text language plpgsql set search_path = '' as $b$
    begin
      if p_largo = 5 and coalesce(current_setting('portal.colision', true), '') = '' then
        perform set_config('portal.colision', 'usada', true);
        return %L;
      end if;
      return 'ZZZZZ';
    end $b$$f$, v_cod);
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, null)', p4, 'clave-larga-p4'));
  if not (r ->> 'ok')::boolean or split_part(r -> 'valor' ->> 'codigo', '-', 2) <> 'ZZZZZ' then
    raise exception 'la colisión no se reintentó: %', r; end if;
  -- Si nunca sale uno libre, se rinde con un mensaje y no deja nada a medias.
  execute format($f$create or replace function public.codigo_dictable(p_largo int default 5) returns text language plpgsql set search_path = '' as $b$
    begin return %L; end $b$$f$, v_cod);
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L, %L::timestamptz)', p4, 'clave-larga-p4',
    (select otorgado_en from public.accesos_portal where lead_id = p4)));
  perform pg_temp.espero(r, 'P0001', 'No pudimos generar un código. Vuelve a intentarlo.', 'veinte colisiones');
  raise exception 'deshacer el generador' using errcode = 'P0998';
exception when sqlstate 'P0998' then null;
end $do$;

-- @test portal del cliente: revocar y desbloquear, idempotentes, y quién lo otorgó si ya no está
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p2 uuid := current_setting('portal.p2')::uuid; o jsonb; e jsonb; r jsonb; i int;
begin
  o := pg_temp.otorgar(u50, p2, 'clave-larga-p2');
  -- Bloqueado por cinco fallos: el estado lo dice; desbloquear lo limpia una vez.
  for i in 1..5 loop perform pg_temp.login(o ->> 'codigo', 'mala'); end loop;
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e ->> 'estado' <> 'bloqueado' or (e ->> 'bloqueado_hasta')::timestamptz <= now() then raise exception 'bloqueado: %', e; end if;
  perform pg_temp.bien(pg_temp.como(u50, format('select public.portal_desbloquear(%L)', p2)));
  perform pg_temp.bien(pg_temp.como(u50, format('select public.portal_desbloquear(%L)', p2)));
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e ->> 'estado' <> 'activo' or e ? 'bloqueado_hasta' and e ->> 'bloqueado_hasta' is not null then raise exception 'desbloqueado: %', e; end if;
  if (select count(*) from public.actividad where registro_id = p2::text and accion = 'portal.desbloqueado') <> 1 then
    raise exception 'desbloquear dos veces dejó otra constancia'; end if;
  if pg_temp.login(o ->> 'codigo', 'clave-larga-p2') is null then raise exception 'desbloqueado no entra'; end if;
  -- Revocar dos veces: una constancia; el estado dice quién; desbloquear un revocado no hace nada.
  perform pg_temp.bien(pg_temp.como(u50, format('select public.revocar_portal(%L)', p2)));
  perform pg_temp.bien(pg_temp.como(u50, format('select public.revocar_portal(%L)', p2)));
  if (select count(*) from public.actividad where registro_id = p2::text and accion = 'portal.revocado') <> 1 then
    raise exception 'revocar dos veces dejó otra constancia'; end if;
  perform pg_temp.bien(pg_temp.como(u50, format('select public.portal_desbloquear(%L)', p2)));
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e ->> 'estado' <> 'revocado' or e -> 'revocado_por' ->> 'nombre' <> 'Dueño Matriz' or e ->> 'codigo' <> o ->> 'codigo' then
    raise exception 'revocado: %', e; end if;
  -- Volver a otorgar un revocado, con la versión que se ve.
  o := pg_temp.otorgar(u50, p2, 'clave-larga-p2b');
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e ->> 'estado' <> 'activo' or e ? 'revocado_por' and e -> 'revocado_por' <> 'null'::jsonb then raise exception 'reotorgado: %', e; end if;
  -- Quien lo otorgó se dio de baja: se nombra y se dice. Si la cuenta se borra, el acceso sigue sin nombre.
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000071', 'portal-se-va@ejemplo.com');
  update public.perfiles set nombre = 'Rosa Ida', baja_en = now(), activo = false where id = '00000000-0000-0000-0000-000000000071';
  update public.accesos_portal set otorgado_por = '00000000-0000-0000-0000-000000000071', revocado_por = '00000000-0000-0000-0000-000000000071' where lead_id = p2;
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e -> 'otorgado_por' <> '{"nombre": "Rosa Ida", "de_baja": true}'::jsonb then raise exception 'de baja: %', e; end if;
  delete from auth.users where id = '00000000-0000-0000-0000-000000000071';
  e := pg_temp.bien(pg_temp.como(u50, format('select public.portal_estado(%L)', p2))) -> 'valor';
  if e ->> 'estado' <> 'activo' or e -> 'otorgado_por' <> 'null'::jsonb then raise exception 'cuenta borrada: %', e; end if;
end $$;

-- @test portal del cliente: web.portal_* sólo con service_role
do $$ declare
  p1 uuid := current_setting('portal.p1')::uuid; v_en timestamptz := (select otorgado_en from public.accesos_portal where lead_id = p1);
  rol text; r jsonb; f text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    foreach f in array array[
      format('select to_jsonb(x) from web.portal_login(%L, %L) x', 'XXX-22222', 'clave-larga'),
      format('select web.portal_snapshot(%L, %L::timestamptz)', p1, v_en),
      format('select to_jsonb(web.portal_documento_ruta(%L, %L::timestamptz, %L))', p1, v_en, gen_random_uuid()),
      format('select to_jsonb(web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))', p1, v_en, 'a', 'clave-larga-nueva')] loop
      r := pg_temp.con_rol(rol, f);
      perform pg_temp.espero(r, '42501', 'permission denied%', rol || ' llamó a ' || left(f, 40));
    end loop;
  end loop;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p1, v_en));
  if not (r ->> 'ok')::boolean or r -> 'valor' -> 'cliente' ->> 'nombre' <> 'Portal P1' then raise exception 'service_role: %', r; end if;
  -- Con la baja de quien lo tiene en curso, el portal ya no nombra a esa persona como asesor (el estado final: sin dueño).
  if jsonb_typeof(r -> 'valor' -> 'asesor') <> 'object' then raise exception 'el portal no nombra a quien tiene el lead: %', r -> 'valor' -> 'asesor'; end if;
  insert into public.equipo_bajas (usuario_id)
  select la.usuario_id from public.leads_asesores la where la.lead_id = p1 and la.tipo_acceso = 'dueno' and la.revocado_en is null;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p1, v_en));
  delete from public.equipo_bajas where terminada_en is null;
  if jsonb_typeof(r -> 'valor' -> 'asesor') <> 'null' then raise exception 'el portal nombra a quien está en baja: %', r -> 'valor' -> 'asesor'; end if;
end $$;

-- @test portal del cliente: el login sin oráculo, lo que teclea el cliente y el bloqueo que no se alarga
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p5 uuid := current_setting('portal.p5')::uuid; o jsonb; l jsonb; v_cod text; v_lote uuid := gen_random_uuid(); r jsonb;
  v_hasta timestamptz; i int; v_antes public.accesos_portal; v_despues public.accesos_portal;
begin
  o := pg_temp.otorgar(u50, p5, 'clave-larga-p5');
  v_cod := o ->> 'codigo';
  -- Bien, y tecleado en minúsculas, con espacios, sin guion y con 1 y 0 por I y O.
  l := pg_temp.login(v_cod, 'clave-larga-p5');
  if l ->> 'nombre' <> 'Portal P5' or (l ->> 'otorgado_en')::timestamptz <> (o ->> 'otorgado_en')::timestamptz
     or not (l ->> 'debe_cambiar_clave')::boolean or (l ->> 'lead_id')::uuid <> p5 then raise exception 'login: %', l; end if;
  if pg_temp.login('  ' || lower(replace(v_cod, '-', ' ')) || ' ', 'clave-larga-p5') is null then raise exception 'con minúsculas y espacios: %', v_cod; end if;
  if pg_temp.login(replace(v_cod, '-', ''), 'clave-larga-p5') is null then raise exception 'sin guion'; end if;
  if pg_temp.login(translate(v_cod, 'IO', '10'), 'clave-larga-p5') is null then raise exception 'con 1 y 0'; end if;
  if pg_temp.login(v_cod, 'CLAVE-LARGA-P5') is not null then raise exception 'la clave no distingue mayúsculas'; end if;
  update public.accesos_portal set intentos_fallidos = 0 where lead_id = p5;
  -- Clave errónea, código inexistente, basura: la misma respuesta (vacía) y ningún error.
  if pg_temp.login(v_cod, 'mala-mala') is not null or pg_temp.login('ZZZ-ZZZZZ', 'clave-larga-p5') is not null
     or pg_temp.login(repeat('x', 500), repeat('y', 500)) is not null or pg_temp.login(null, null) is not null then
    raise exception 'un fallo no fue vacío'; end if;
  -- Cinco fallos bloquean y vuelven a cero; con el bloqueo, ni la buena entra, y los fallos no lo alargan.
  update public.accesos_portal set intentos_fallidos = 0 where lead_id = p5;
  for i in 1..5 loop perform pg_temp.login(v_cod, 'mala-' || i); end loop;
  select bloqueado_hasta into v_hasta from public.accesos_portal where lead_id = p5 and intentos_fallidos = 0;
  if v_hasta is null or v_hasta <= now() + interval '14 minutes' then raise exception 'cinco fallos no bloquearon 15 min'; end if;
  if pg_temp.login(v_cod, 'clave-larga-p5') is not null then raise exception 'bloqueado y entró'; end if;
  for i in 1..7 loop perform pg_temp.login(v_cod, 'mala-' || i); end loop;
  select * into v_despues from public.accesos_portal where lead_id = p5;
  if v_despues.bloqueado_hasta <> v_hasta or v_despues.intentos_fallidos <> 0 then raise exception 'el bloqueo se alargó o contó: %', to_jsonb(v_despues); end if;
  -- Al vencer, un fallo es el primero (no vuelve a bloquear).
  update public.accesos_portal set bloqueado_hasta = now() - interval '1 second' where lead_id = p5;
  perform pg_temp.login(v_cod, 'mala');
  select * into v_despues from public.accesos_portal where lead_id = p5;
  if v_despues.intentos_fallidos <> 1 or v_despues.bloqueado_hasta is not null then raise exception 'vencido: %', to_jsonb(v_despues); end if;
  -- En la papelera (el acceso se revoca) y aunque alguien lo reabra a mano: vacío, sin contar ni anotar el ingreso.
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, p5));
  if (r -> 'valor' ->> 'portal_revocados')::int <> 1 then raise exception 'la papelera no revocó: %', r; end if;
  update public.accesos_portal set habilitado = true where lead_id = p5;
  select * into v_antes from public.accesos_portal where lead_id = p5;
  if pg_temp.login(v_cod, 'clave-larga-p5') is not null or pg_temp.login(v_cod, 'mala') is not null then raise exception 'entró con el lead en la papelera'; end if;
  select * into v_despues from public.accesos_portal where lead_id = p5;
  if v_despues.ultimo_ingreso_en is distinct from v_antes.ultimo_ingreso_en or v_despues.intentos_fallidos <> v_antes.intentos_fallidos then
    raise exception 'el lead en la papelera contó o anotó'; end if;
  update public.accesos_portal set habilitado = false where lead_id = p5;
  -- Restaurar no reabre.
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 1 then raise exception 'restaurar: %', r; end if;
  if pg_temp.login(v_cod, 'clave-larga-p5') is not null then raise exception 'restaurar reabrió el portal'; end if;
end $$;

-- @test portal del cliente: la sesión se corta al revocar, al volver a otorgar y con la papelera
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p3 uuid := current_setting('portal.p3')::uuid; o jsonb; l jsonb; v_en timestamptz; v_doc uuid; v_veh uuid; r jsonb;
  v_lote uuid := gen_random_uuid();
begin
  -- Un vehículo vinculado con un documento visible.
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id)
  select id, 'Portal vehículo', u50::uuid, p3 from public.origenes where clave = 'oficina' returning id into v_veh;
  insert into public.documentos (vehiculo_id, tipo_documento_id, visible_portal, ruta)
  select v_veh, id, true, 'privado/' || v_veh || '/factura.pdf' from public.tipos_documento order by orden limit 1 returning id into v_doc;
  o := pg_temp.otorgar(u50, p3, 'clave-larga-p3');
  l := pg_temp.login(o ->> 'codigo', 'clave-larga-p3');
  v_en := (l ->> 'otorgado_en')::timestamptz;
  -- Con la sesión vigente, todo responde.
  r := pg_temp.con_rol('service_role', format('select jsonb_build_object(''s'', web.portal_snapshot(%L, %L::timestamptz), ''d'', web.portal_documento_ruta(%L, %L::timestamptz, %L))', p3, v_en, p3, v_en, v_doc));
  if r -> 'valor' -> 's' is null or r -> 'valor' ->> 'd' is null or jsonb_array_length(r -> 'valor' -> 's' -> 'vehiculos') <> 1 then raise exception 'vigente: %', r; end if;
  -- Otra versión (la de una cookie vieja, o una inventada): nada.
  r := pg_temp.con_rol('service_role', format('select jsonb_build_object(''s'', web.portal_snapshot(%L, %L::timestamptz), ''d'', web.portal_documento_ruta(%L, %L::timestamptz, %L))', p3, v_en - interval '1 millisecond', p3, v_en + interval '1 millisecond', v_doc));
  if r -> 'valor' <> '{"s": null, "d": null}'::jsonb then raise exception 'otra versión: %', r; end if;
  -- Revocar corta la sesión abierta: snapshot, documento y cambiar la clave.
  perform pg_temp.bien(pg_temp.como(u50, format('select public.revocar_portal(%L)', p3)));
  r := pg_temp.con_rol('service_role', format('select jsonb_build_object(''s'', web.portal_snapshot(%L, %L::timestamptz), ''d'', web.portal_documento_ruta(%L, %L::timestamptz, %L), ''c'', web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))',
    p3, v_en, p3, v_en, v_doc, p3, v_en, 'clave-larga-p3', 'clave-nueva-p3'));
  if r -> 'valor' <> '{"s": null, "d": null, "c": false}'::jsonb then raise exception 'revocado: %', r; end if;
  -- Volver a otorgar: la sesión vieja no vale, la nueva sí.
  o := pg_temp.otorgar(u50, p3, 'clave-larga-p3b');
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p3, v_en));
  if r -> 'valor' <> 'null'::jsonb then raise exception 'la sesión vieja sobrevivió a volver a otorgar: %', r; end if;
  l := pg_temp.login(o ->> 'codigo', 'clave-larga-p3b');
  v_en := (l ->> 'otorgado_en')::timestamptz;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p3, v_en));
  if r -> 'valor' = 'null'::jsonb then raise exception 'la sesión nueva no vale'; end if;
  -- Enviar el lead a la papelera: nada (ni los vehículos). Primero se desvincula el vehículo (si no, no entra).
  update public.vehiculos set lead_id = null where id = v_veh;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, p3));
  if not (r ->> 'ok')::boolean then raise exception 'papelera: %', r; end if;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p3, v_en));
  if r -> 'valor' <> 'null'::jsonb then raise exception 'la papelera no cortó la sesión: %', r; end if;
  -- Aunque alguien reabra el acceso a mano, con el lead en la papelera no hay nada.
  update public.accesos_portal set habilitado = true where lead_id = p3;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p3, v_en));
  if r -> 'valor' <> 'null'::jsonb then raise exception 'lead en la papelera con el acceso reabierto: %', r; end if;
  update public.accesos_portal set habilitado = false where lead_id = p3;
  perform pg_temp.bien(pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote)));
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p3, v_en));
  if r -> 'valor' <> 'null'::jsonb then raise exception 'restaurar reabrió la sesión: %', r; end if;
end $$;

-- @test portal del cliente: cambiar la clave cuenta intentos, sigue la regla y no corta la sesión
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p4 uuid := current_setting('portal.p4')::uuid; o jsonb; l jsonb; v_en timestamptz; r jsonb; i int; a public.accesos_portal;
begin
  o := pg_temp.otorgar(u50, p4, 'clave-larga-p4');
  l := pg_temp.login(o ->> 'codigo', 'clave-larga-p4');
  v_en := (l ->> 'otorgado_en')::timestamptz;
  -- La nueva sigue la regla (sólo se mira con la actual correcta: si no, es un fallo más).
  r := pg_temp.con_rol('service_role', format('select to_jsonb(web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))', p4, v_en, 'clave-larga-p4', 'corta'));
  perform pg_temp.espero(r, '22023', 'La clave necesita al menos 8 caracteres.', 'cambiar a una clave corta');
  -- Bien: deja de pedir el cambio, la sesión sigue y la nueva entra.
  r := pg_temp.con_rol('service_role', format('select to_jsonb(web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))', p4, v_en, 'clave-larga-p4', 'mi-clave-nueva'));
  if r -> 'valor' <> 'true'::jsonb then raise exception 'cambiar: %', r; end if;
  if (select debe_cambiar_clave from public.accesos_portal where lead_id = p4) then raise exception 'sigue pidiendo el cambio'; end if;
  r := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p4, v_en));
  if r -> 'valor' = 'null'::jsonb then raise exception 'cambiar la clave cortó la sesión'; end if;
  if pg_temp.login(o ->> 'codigo', 'mi-clave-nueva') is null or pg_temp.login(o ->> 'codigo', 'clave-larga-p4') is not null then
    raise exception 'la clave nueva no reemplazó a la vieja'; end if;
  -- Cinco fallos con la actual bloquean: ni el cambio ni el login pasan, aunque la actual sea la buena.
  for i in 1..5 loop
    r := pg_temp.con_rol('service_role', format('select to_jsonb(web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))', p4, v_en, 'mala-' || i, 'otra-clave-nueva'));
    if r -> 'valor' <> 'false'::jsonb then raise exception 'un fallo de cambiar: %', r; end if;
  end loop;
  select * into a from public.accesos_portal where lead_id = p4;
  if a.bloqueado_hasta is null or a.bloqueado_hasta <= now() then raise exception 'cambiar la clave no bloqueó'; end if;
  r := pg_temp.con_rol('service_role', format('select to_jsonb(web.portal_cambiar_clave(%L, %L::timestamptz, %L, %L))', p4, v_en, 'mi-clave-nueva', 'otra-clave-nueva'));
  if r -> 'valor' <> 'false'::jsonb then raise exception 'cambió bloqueado: %', r; end if;
  if pg_temp.login(o ->> 'codigo', 'mi-clave-nueva') is not null then raise exception 'entró bloqueado'; end if;
end $$;

-- @test portal del cliente: novedades y lo que nunca sale al cliente
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  p1 uuid := current_setting('portal.p1')::uuid; v_tipo uuid := (select id from public.tipos_seguimiento order by orden limit 1);
  v_suyo uuid; v_ajeno uuid; o jsonb; s jsonb; r jsonb; i int; v_titulos text[];
begin
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, vin)
  select id, 'Portal suyo', u50::uuid, p1, '1HGCM82633A004352' from public.origenes where clave = 'oficina' returning id into v_suyo;
  insert into public.vehiculos (origen_id, titulo, creado_por)
  select id, 'Portal de interés', u50::uuid from public.origenes where clave = 'oficina' returning id into v_ajeno;
  insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto, detalle_doc, visibilidad, vehiculo_id, ocurrido_en) values
    (p1, u50::uuid, v_tipo, 'Con su vehículo', 'Ya zarpó', '{"type": "doc"}', 'publico', v_suyo, now() - interval '5 days'),
    (p1, u50::uuid, v_tipo, 'Sin vehículo', 'Te llamamos el lunes', '{"type": "doc", "secreto": "doc"}', 'publico', null, now() - interval '4 days'),
    (p1, u50::uuid, v_tipo, 'De otro vehículo', 'Hay otra opción', '{"type": "doc"}', 'publico', v_ajeno, now() - interval '3 days'),
    (p1, u50::uuid, v_tipo, 'Privado', 'Costo real 9999', '{"type": "doc"}', 'privado', null, now() - interval '2 days'),
    (p1, u50::uuid, v_tipo, 'Borrado', 'No va', '{"type": "doc"}', 'publico', null, now() - interval '1 day');
  update public.seguimientos set eliminado_en = now() where lead_id = p1 and titulo = 'Borrado';
  o := pg_temp.otorgar(u50, p1, 'clave-larga-p1');
  s := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p1, o ->> 'otorgado_en')) -> 'valor';
  -- Las novedades: sin vehículo y del vehículo que no es suyo (sin nombrarlo), de la más nueva a la más vieja.
  select array_agg(x ->> 'titulo' order by ord) into v_titulos from jsonb_array_elements(s -> 'novedades') with ordinality t (x, ord);
  if v_titulos <> array['De otro vehículo', 'Sin vehículo'] then raise exception 'novedades: %', s -> 'novedades'; end if;
  if (s -> 'novedades' -> 1 ->> 'detalle') <> 'Te llamamos el lunes' or s -> 'novedades' -> 0 ? 'vehiculo' then raise exception 'forma: %', s -> 'novedades'; end if;
  -- La del vehículo vinculado sale con él, una sola vez.
  if jsonb_array_length(s -> 'vehiculos' -> 0 -> 'seguimientos') <> 1 or s -> 'vehiculos' -> 0 -> 'seguimientos' -> 0 ->> 'titulo' <> 'Con su vehículo' then
    raise exception 'seguimientos del vehículo: %', s -> 'vehiculos'; end if;
  -- Nunca: lo privado, lo eliminado, el documento del editor, el VIN completo, el vehículo de interés, la ruta de un documento.
  if s::text ~ 'Costo real|No va|secreto|1HGCM82633A004352|Portal de interés|privado/' then raise exception 'el snapshot filtra: %', s; end if;
  if s -> 'vehiculos' -> 0 ->> 'vin_parcial' <> '1HG•••••4352' then raise exception 'vin parcial: %', s -> 'vehiculos' -> 0; end if;
  -- Nada de lo que el lead tiene del equipo: campos, oportunidades, etiquetas, marcas, teléfonos.
  if (select array_agg(k order by k) from jsonb_object_keys(s) k) <> array['asesor', 'cliente', 'novedades', 'vehiculos']
     or (select array_agg(k order by k) from jsonb_object_keys(s -> 'cliente') k) <> array['nombre'] then
    raise exception 'el snapshot cambió de forma: %', (select array_agg(k) from jsonb_object_keys(s) k); end if;
  if s::text ~ '78100001|atributos|oportunidad|etiqueta|favorito|tachado' then raise exception 'el snapshot filtra datos del equipo'; end if;
  -- Un tope de 30, las más nuevas.
  insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto, visibilidad, ocurrido_en)
  select p1, u50::uuid, v_tipo, 'Nota ' || g, 'n', 'publico', now() - interval '1 hour' * g from generate_series(1, 40) g;
  s := pg_temp.con_rol('service_role', format('select web.portal_snapshot(%L, %L::timestamptz)', p1, o ->> 'otorgado_en')) -> 'valor';
  if jsonb_array_length(s -> 'novedades') <> 30 or s -> 'novedades' -> 0 ->> 'titulo' <> 'Nota 1' then raise exception 'tope: %', jsonb_array_length(s -> 'novedades'); end if;
  delete from public.seguimientos where lead_id = p1;
  update public.vehiculos set lead_id = null where id = v_suyo;
end $$;
select set_config('request.jwt.claim.sub', '', false);
