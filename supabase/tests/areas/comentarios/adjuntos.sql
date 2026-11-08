-- Adjuntar archivos a una cotización por RPC (paso 4.27-1): `cotizacion_adjuntar()` y `cotizacion_adjunto_quitar()`.
-- No depende de otro archivo (`SOLO=areas/comentarios/adjuntos.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   D1. Adjuntar pide ver (42501 de lo inexistente) y poder adjuntar (42501 con su texto); la ruta en la carpeta de la cotización, el objeto en
--       storage, el tipo concordante con la extensión y el tamaño se validan (22023); tipo y tamaño salen de la metadata de storage si está.
--   D2. El mismo archivo dos veces da 23505; el 21.º, 23514; adjuntar saca la ruta de la cola de limpieza.
--   D3. Quitar: quien lo subió sí; otra persona sin moderar, 42501; quien modera y ve, sí. La ruta va a la cola sólo si nadie más la usa.
--   D4. Las escrituras directas sobre cotizaciones_adjuntos están revocadas; las dos RPC son definer con search_path vacío, de authenticated.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.cm_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cm_' || substr(v_id::text, 1, 8), 'CM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.cm_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cm_' || substr(gen_random_uuid()::text, 1, 8), 'CM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona; una final lleva un vehículo propio.
create or replace function pg_temp.cm_cot(p_quien uuid, e jsonb, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid; v_v uuid;
begin
  if p_clase = 'final' then
    insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'CM vehículo', 'toyota') returning id into v_v;
  end if;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, v_v, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- La ruta del n-ésimo archivo de una cotización (por hash) y, si se pide, su objeto en storage con su metadata.
create or replace function pg_temp.cm_ruta(p_c uuid, p_n int, p_ext text default 'pdf') returns text language sql as $f$
  select p_c || '/' || lpad(to_hex(p_n), 64, '0') || '.' || p_ext;
$f$;
create or replace function pg_temp.cm_objeto(p_ruta text, p_meta jsonb default '{"mimetype": "application/pdf", "size": 10}') returns text language sql as $f$
  insert into storage.objects (bucket_id, name, metadata) values ('cotizaciones', p_ruta, p_meta) returning name;
$f$;

-- @test adjuntos: adjuntar pide ver y poder adjuntar; la ruta, el objeto, el tipo y el tamaño se validan (D1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ve uuid; ok uuid; c uuid; c2 uuid; r jsonb;
  adjuntar constant text := 'select public.cotizacion_adjuntar(%L, %L, %L, %L, %s)';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  ok := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  c := pg_temp.cm_cot(jefa, e);
  c2 := pg_temp.cm_cot(jefa, e);
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 1));

  r := pg_temp.cm_corre(ed, format(adjuntar, c, pg_temp.cm_ruta(c, 1), 'a.pdf', 'application/pdf', 10));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien edita sin ver adjuntó: %', r; end if;
  r := pg_temp.cm_corre(ve, format(adjuntar, c, pg_temp.cm_ruta(c, 1), 'a.pdf', 'application/pdf', 10));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes permiso para adjuntar en esta cotización.' then raise exception 'quien sólo ve adjuntó: %', r; end if;

  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c2, 1), 'a.pdf', 'application/pdf', 10));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'El archivo no está en la carpeta de esta cotización.' then raise exception 'una ruta de otra carpeta no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 2), 'a.pdf', 'application/pdf', 10));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'El archivo no terminó de subir. Vuelve a intentarlo.' then raise exception 'un objeto que no está no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 1), ' / ', 'application/pdf', 10));
  if r ->> 'error' is distinct from '22023' then raise exception 'un nombre con barra no dio 22023: %', r; end if;
  -- Sin metadata manda lo del cliente: tipo que no concuerda, o vacío.
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 3), null);
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 3), 'a.pdf', 'image/png', 10));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Ese tipo de archivo no se puede adjuntar (PDF, imágenes o Word).' then raise exception 'un tipo que no concuerda no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 3), 'a.pdf', 'application/pdf', 0));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'El archivo está vacío o pesa más de 25 MB.' then raise exception 'un archivo vacío no dio 22023: %', r; end if;
  -- Con metadata, manda storage: el cliente dice otra cosa y se registra lo de storage.
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 1), '  Oferta.pdf ', 'image/png', 999));
  if r ? 'error' or r ->> 'mime' is distinct from 'application/pdf' or (r ->> 'bytes')::int <> 10 or r ->> 'nombre' is distinct from 'Oferta.pdf' then
    raise exception 'no adjuntó con lo de storage: %', r; end if;
  if (select subido_por from public.cotizaciones_adjuntos where id = (r ->> 'id')::uuid) is distinct from ok then raise exception 'el adjunto no quedó a nombre de quien lo subió'; end if;
end $$;
rollback;

-- @test adjuntos: el mismo archivo dos veces da 23505, el 21.º da 23514, y adjuntar rescata la ruta de la cola (D2)
begin;
do $$
declare
  ok uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); c uuid; r jsonb; i int;
  adjuntar constant text := 'select public.cotizacion_adjuntar(%L, %L, ''a.pdf'', ''application/pdf'', 10)';
begin
  c := pg_temp.cm_cot(ok, e);
  insert into public.cola_gc_storage (bucket, ruta, encolado_en) values ('cotizaciones', pg_temp.cm_ruta(c, 1), now() - interval '1 day');
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 1));
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 1)));
  if r ? 'error' then raise exception 'no adjuntó: %', r; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.cm_ruta(c, 1)) then raise exception 'adjuntar no sacó la ruta de la cola de limpieza'; end if;
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 1)));
  if r ->> 'error' is distinct from '23505' or r ->> 'mensaje' is distinct from 'Ese archivo ya está adjunto.' then raise exception 'el mismo archivo dos veces no dio 23505: %', r; end if;
  for i in 2..20 loop
    perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, i));
    r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, i)));
    if r ? 'error' then raise exception 'el adjunto % no entró: %', i, r; end if;
  end loop;
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 21));
  r := pg_temp.cm_corre(ok, format(adjuntar, c, pg_temp.cm_ruta(c, 21)));
  if r ->> 'error' is distinct from '23514' or r ->> 'mensaje' is distinct from 'Una cotización admite hasta 20 adjuntos.' then raise exception 'el 21.º no dio 23514: %', r; end if;
end $$;
rollback;

-- @test adjuntos: quitar es de quien lo subió o de quien modera y ve; la ruta va a la cola sólo si nadie más la usa (D3)
begin;
do $$
declare
  ok uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); ve uuid; mo uuid; edmo uuid; c uuid; c2 uuid; a1 uuid; a2 uuid; r jsonb;
  quitar constant text := 'select public.cotizacion_adjunto_quitar(%L)';
begin
  ve := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  mo := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  edmo := pg_temp.cm_persona(array['cotizaciones.editar', 'cotizaciones.moderar']);
  c := pg_temp.cm_cot(ok, e);
  c2 := pg_temp.cm_cot(ok, e);
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 1));
  perform pg_temp.cm_objeto(pg_temp.cm_ruta(c, 2));
  a1 := (pg_temp.cm_corre(ok, format('select public.cotizacion_adjuntar(%L, %L, ''a.pdf'', ''application/pdf'', 10)', c, pg_temp.cm_ruta(c, 1))) ->> 'id')::uuid;
  a2 := (pg_temp.cm_corre(ok, format('select public.cotizacion_adjuntar(%L, %L, ''b.pdf'', ''application/pdf'', 10)', c, pg_temp.cm_ruta(c, 2))) ->> 'id')::uuid;
  -- La ruta del segundo también la usa otra cotización (como deja la copia de una cotización).
  insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (c2, pg_temp.cm_ruta(c, 2), 'b.pdf', 'application/pdf', 10, ok);

  r := pg_temp.cm_corre(ve, format(quitar, a1));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No puedes quitar este adjunto.' then raise exception 'otra persona sin moderar quitó un adjunto: %', r; end if;
  r := pg_temp.cm_corre(edmo, format(quitar, a1));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien modera sin ver quitó un adjunto: %', r; end if;
  r := pg_temp.cm_corre(ok, format(quitar, a1));
  if r is distinct from '{"resultado": "quitado"}'::jsonb or exists (select 1 from public.cotizaciones_adjuntos where id = a1) then raise exception 'quien lo subió no lo quitó: %', r; end if;
  if not exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.cm_ruta(c, 1) and reclamado_en is null) then raise exception 'la ruta sin otro uso no fue a la cola'; end if;
  r := pg_temp.cm_corre(ok, format(quitar, a1));
  if r ->> 'error' is distinct from '42501' then raise exception 'quitar uno que ya no está no dio 42501: %', r; end if;
  r := pg_temp.cm_corre(mo, format(quitar, a2));
  if r is distinct from '{"resultado": "quitado"}'::jsonb then raise exception 'quien modera y ve no quitó un adjunto ajeno: %', r; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones' and ruta = pg_temp.cm_ruta(c, 2)) then raise exception 'una ruta que otra cotización usa fue a la cola'; end if;
end $$;
rollback;

-- @test adjuntos: las escrituras directas están revocadas y las dos RPC tienen sus privilegios (D4)
begin;
do $$
declare
  ok uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); c uuid; v_a uuid; r jsonb; f record;
begin
  c := pg_temp.cm_cot(ok, e);
  insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (c, pg_temp.cm_ruta(c, 1), 'a.pdf', 'application/pdf', 10, ok) returning id into v_a;
  r := pg_temp.cm_corre(ok, format('insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (%L, %L, ''b.pdf'', ''application/pdf'', 10, %L) returning to_jsonb(id)', c, pg_temp.cm_ruta(c, 2), ok));
  if r ->> 'error' is distinct from '42501' then raise exception 'un insert directo entró: %', r; end if;
  r := pg_temp.cm_corre(ok, format('delete from public.cotizaciones_adjuntos where id = %L returning to_jsonb(id)', v_a));
  if r ->> 'error' is distinct from '42501' then raise exception 'un delete directo entró: %', r; end if;
  for f in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('cotizacion_adjuntar', 'cotizacion_adjunto_quitar') loop
    if not f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', f.proname; end if;
    if not has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', f.proname; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = f.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', f.proname; end if;
  end loop;
end $$;
rollback;
