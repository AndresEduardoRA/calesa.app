-- Adjuntar a una cotización pide verla (paso 4.27-1, cierra 4-69): la carpeta del bucket `cotizaciones` y la tabla `cotizaciones_adjuntos` piden lo que
-- pide guardarla (preventa: ver y editar por su alcance; final: ver y `cotizaciones.final.gestionar` del origen), y leer un objeto pide ver.
-- No depende de otro archivo (`SOLO=areas/comentarios/adjuntos-pide-ver.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. Storage: quien edita sin ver no sube; quien ve y edita sube a la carpeta de su preventa y no a la de una final; con `final.gestionar` sí;
--       una carpeta que no es un uuid y la raíz del bucket se rechazan por la policy (42501), nunca con un 22P02 del cast.
--   A2. Storage: leer los objetos de una cotización que no ve da 0 filas; de una que ve, las suyas.
--   A3. La tabla (las policies quedan como cinturón: el bloque se da el grant dentro de su transacción): crear y borrar piden lo mismo.
--   A4. Privilegios: `cotizacion_puede_adjuntar` es definer con `search_path` vacío; `_cotizacion_de_objeto` es inmutable de invocador; las dos las
--       ejecuta authenticated y no anon ni PUBLIC. `cotizacion_puede_adjuntar` nunca es nula.

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

-- Sube un objeto como esa persona: devuelve null si entró, o el sqlstate si no.
create or replace function pg_temp.cm_sube(p_quien uuid, p_nombre text) returns text language sql as $f$
  select pg_temp.cm_corre(p_quien, format('insert into storage.objects (bucket_id, name) values (''cotizaciones'', %L) returning to_jsonb(name)', p_nombre)) ->> 'error';
$f$;

-- @test adjuntos de cotizaciones: subir al bucket pide ver y poder guardarla; una carpeta que no es un uuid se rechaza sin 22P02 (A1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ok uuid; vf uuid; c uuid; f uuid; v_e text;
  h constant text := repeat('a', 64);
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ok := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  vf := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.final.gestionar']);
  c := pg_temp.cm_cot(jefa, e);
  f := pg_temp.cm_cot(jefa, e, 'final');

  v_e := pg_temp.cm_sube(ed, c || '/' || h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'quien edita sin ver debía dar 42501 al subir y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.cm_sube(ok, c || '/' || h || '.pdf');
  if v_e is not null then raise exception 'quien ve y edita no pudo subir a su preventa: %', v_e; end if;
  v_e := pg_temp.cm_sube(ok, f || '/' || h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'quien edita sin final.gestionar debía dar 42501 al subir a una final y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.cm_sube(vf, f || '/' || h || '.pdf');
  if v_e is not null then raise exception 'quien ve y gestiona finales no pudo subir a una final: %', v_e; end if;
  v_e := pg_temp.cm_sube(ok, 'sueltas/' || h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'una carpeta que no es un uuid debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.cm_sube(ok, h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'la raíz del bucket debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
end $$;
rollback;

-- @test adjuntos de cotizaciones: leer un objeto del bucket pide ver la cotización (A2)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ve uuid; pr uuid; c uuid; r jsonb;
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  pr := pg_temp.cm_persona(array['cotizaciones.ver:propios']);
  c := pg_temp.cm_cot(jefa, e);
  insert into storage.objects (bucket_id, name) values ('cotizaciones', c || '/' || repeat('b', 64) || '.pdf'), ('cotizaciones', 'sueltas/x.pdf');

  r := pg_temp.cm_corre(ed, format('select to_jsonb(count(*)) from storage.objects where bucket_id = ''cotizaciones'' and name like %L', c || '/%'));
  if r is distinct from '0'::jsonb then raise exception 'quien edita sin ver leyó objetos de la cotización: %', r; end if;
  r := pg_temp.cm_corre(pr, format('select to_jsonb(count(*)) from storage.objects where bucket_id = ''cotizaciones'' and name like %L', c || '/%'));
  if r is distinct from '0'::jsonb then raise exception 'quien ve sólo lo propio leyó objetos de una ajena: %', r; end if;
  r := pg_temp.cm_corre(ve, format('select to_jsonb(count(*)) from storage.objects where bucket_id = ''cotizaciones'' and name like %L', c || '/%'));
  if r is distinct from '1'::jsonb then raise exception 'quien ve no leyó el objeto de la cotización: %', r; end if;
  -- Un objeto fuera de una carpeta de cotización no se lee ni hace caer la consulta.
  r := pg_temp.cm_corre(ve, 'select to_jsonb(count(*)) from storage.objects where bucket_id = ''cotizaciones''');
  if r is distinct from '1'::jsonb then raise exception 'leer todo el bucket debía dar 1 (sin la suelta, sin error) y dio %', r; end if;
end $$;
rollback;

-- @test adjuntos de cotizaciones: crear y borrar en la tabla piden ver y poder guardarla (A3)
begin;
-- Tras el 4.27-1 las escrituras van por RPC: aquí se prueba el cinturón, con el grant sólo dentro de esta transacción.
grant insert, delete on public.cotizaciones_adjuntos to authenticated;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ok uuid; vf uuid; edmo uuid; c uuid; f uuid; r jsonb; v_a uuid;
  ins constant text := 'insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (%L, %L, ''a.pdf'', ''application/pdf'', 10, %L) returning to_jsonb(id)';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ok := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  vf := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.final.gestionar']);
  edmo := pg_temp.cm_persona(array['cotizaciones.editar', 'cotizaciones.moderar']);
  c := pg_temp.cm_cot(jefa, e);
  f := pg_temp.cm_cot(jefa, e, 'final');

  r := pg_temp.cm_corre(ed, format(ins, c, c || '/1.pdf', ed));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien edita sin ver registró un adjunto: %', r; end if;
  r := pg_temp.cm_corre(ok, format(ins, c, c || '/2.pdf', ok));
  if r ? 'error' then raise exception 'quien ve y edita no registró un adjunto en su preventa: %', r; end if;
  r := pg_temp.cm_corre(ok, format(ins, f, f || '/3.pdf', ok));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien edita sin final.gestionar registró un adjunto en una final: %', r; end if;
  r := pg_temp.cm_corre(vf, format(ins, f, f || '/4.pdf', vf));
  if r ? 'error' then raise exception 'quien gestiona finales no registró un adjunto en una final: %', r; end if;

  -- Borrar: quien modera y no ve no borra; quien lo subió y puede guardarla, sí.
  insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por) values (c, c || '/5.pdf', 'b.pdf', 'application/pdf', 10, ok) returning id into v_a;
  r := pg_temp.cm_corre(edmo, format('with x as (delete from public.cotizaciones_adjuntos where id = %L returning 1) select to_jsonb(count(*)) from x', v_a));
  if r is distinct from '0'::jsonb then raise exception 'quien modera sin ver borró un adjunto: %', r; end if;
  r := pg_temp.cm_corre(ok, format('with x as (delete from public.cotizaciones_adjuntos where id = %L returning 1) select to_jsonb(count(*)) from x', v_a));
  if r is distinct from '1'::jsonb then raise exception 'quien lo subió no pudo borrarlo: %', r; end if;
end $$;
rollback;

-- @test adjuntos de cotizaciones: los dos ayudantes de las policies, con sus privilegios; poder adjuntar nunca es nulo (A4)
do $$
declare r record;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.provolatile, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('cotizacion_puede_adjuntar', '_cotizacion_de_objeto') loop
    if r.proconfig is distinct from array['search_path=""'] then raise exception '% no tiene el search_path vacío: %', r.proname, r.proconfig; end if;
    if r.prosecdef is distinct from (r.proname = 'cotizacion_puede_adjuntar') then raise exception '%: prosecdef debía ser %', r.proname, (r.proname = 'cotizacion_puede_adjuntar'); end if;
    if r.proname = '_cotizacion_de_objeto' and r.provolatile <> 'i' then raise exception '_cotizacion_de_objeto debía ser immutable'; end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') then raise exception 'authenticated no puede ejecutar %', r.proname; end if;
    if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutar %', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
  end loop;
  if (select count(*) from pg_proc f join pg_namespace n on n.oid = f.pronamespace where n.nspname = 'public' and f.proname in ('cotizacion_puede_adjuntar', '_cotizacion_de_objeto')) <> 2 then
    raise exception 'falta alguno de los dos ayudantes'; end if;
  if public.cotizacion_puede_adjuntar(gen_random_uuid()) is distinct from false then raise exception 'cotizacion_puede_adjuntar de una inexistente no dio false'; end if;
  if public.cotizacion_puede_adjuntar(null) is distinct from false then raise exception 'cotizacion_puede_adjuntar(null) no dio false'; end if;
  if public._cotizacion_de_objeto('sueltas/x.pdf') is not null or public._cotizacion_de_objeto('x.pdf') is not null then
    raise exception '_cotizacion_de_objeto debía dar nulo fuera de una carpeta de cotización'; end if;
end $$;
