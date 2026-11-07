-- La versión esperada de la plantilla de la tarjeta (paso 4.19-1): guardar el borrador y publicar la piden, y quien llega tarde recibe un PT409 con su texto.
-- Corre después de `plantilla-validar.sql`; la dueña es `…0001` y la asesora `…00b1` (las crea `humo.sql`). Cada bloque abre su transacción y la revierte.
-- Dentro de una transacción `now()` no se mueve: la versión del borrador no cambia al guardarlo (V4 del plan), así que una «esperada vieja» es la de la fila
-- menos 1 µs; que guardar sí la mueve entre transacciones lo prueban las carreras (`scripts/carreras/plantillas.mjs`).

create or replace function pg_temp.pve_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado como texto, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.pve_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.pve_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return jsonb_build_object('ok', v);
end $f$;

-- La plantilla publicada de subasta_usa (v1: valida contra su fórmula) con otra nota: `p_marca` distingue una definición de otra.
create or replace function pg_temp.pve_def(p_marca text) returns jsonb language sql as $f$
  select jsonb_set(p.definicion, '{nota}', to_jsonb('Nota ' || p_marca))
    from public.plantillas_tarjeta p join public.origenes o on o.id = p.origen_id where o.clave = 'subasta_usa' and p.version = 1
$f$;

-- @test plantilla-version T1: guardar con la esperada nula crea el borrador y devuelve su versión; el segundo crear da PT409 y no pisa nada
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; r jsonb; v_v timestamptz;
begin
  insert into public.origenes (clave, nombre) values ('pve_t1', 'PVE T1') returning id into o;
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, pg_temp.pve_def('A')));
  if r ? 'error' then raise exception 'crear con la esperada nula: %', r; end if;
  select actualizado_en into v_v from public.plantillas_tarjeta where origen_id = o and estado = 'borrador';
  if v_v is null or (r ->> 'ok')::timestamptz is distinct from v_v then raise exception 'crear no devuelve la versión del borrador: % contra %', r, v_v; end if;
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, pg_temp.pve_def('B')));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'Ya hay un borrador de esta plantilla, guardado hace un momento.' then
    raise exception 'el segundo crear no da su PT409: %', r;
  end if;
  if (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from pg_temp.pve_def('A') then
    raise exception 'el segundo crear pisó el borrador';
  end if;
  if (select count(*) from public.plantillas_tarjeta where origen_id = o) <> 1 then raise exception 'el segundo crear dejó otra fila'; end if;
end $$;
rollback;

-- @test plantilla-version T2: guardar con la esperada devuelve la versión; una vieja da PT409 y no cambia nada; sin borrador, «se descartó» o «se publicó»
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid := (select id from public.origenes where clave = 'subasta_usa'); o2 uuid; r jsonb; v_v timestamptz;
begin
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L, %L)', o, pg_temp.pve_def('A'), 'n1'));
  if r ? 'error' then raise exception 'crear: %', r; end if;
  v_v := (r ->> 'ok')::timestamptz;
  -- Con la esperada buena: guarda, devuelve la versión de la fila y deja la definición y la nota nuevas.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, %L::timestamptz, %L, %L)', o, v_v, pg_temp.pve_def('B'), 'n2'));
  if r ? 'error' then raise exception 'guardar con la esperada buena: %', r; end if;
  if (r ->> 'ok')::timestamptz is distinct from (select actualizado_en from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') then
    raise exception 'guardar no devuelve la versión de la fila: %', r;
  end if;
  if (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from pg_temp.pve_def('B')
     or (select nota from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from 'n2' then
    raise exception 'guardar no dejó lo nuevo';
  end if;
  -- Una esperada vieja: PT409 con su texto y nada cambia.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, %L::timestamptz - interval ''1 microsecond'', %L, %L)', o, v_v, pg_temp.pve_def('C'), 'n3'));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador de esta plantilla cambió hace un momento, mientras lo editabas.' then
    raise exception 'una esperada vieja no da su PT409: %', r;
  end if;
  if (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from pg_temp.pve_def('B')
     or (select nota from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from 'n2' then
    raise exception 'una esperada vieja cambió el borrador';
  end if;
  -- Sin borrador y con esperada: nunca hubo uno que se haya publicado → «se descartó».
  insert into public.origenes (clave, nombre) values ('pve_t2', 'PVE T2') returning id into o2;
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, now(), %L)', o2, pg_temp.pve_def('A')));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador ya no está: se descartó.' then
    raise exception 'sin borrador, con esperada y sin publicada: %', r;
  end if;
  if exists (select 1 from public.plantillas_tarjeta where origen_id = o2) then raise exception 'guardar con esperada creó un borrador'; end if;
  -- Se publicó el borrador que veías: la publicada es de ese instante o posterior.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o, v_v, 'v2'));
  if r ? 'error' then raise exception 'publicar: %', r; end if;
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, %L::timestamptz, %L)', o, v_v, pg_temp.pve_def('D')));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador ya no está: la versión 2 se publicó hace un momento.' then
    raise exception 'sin borrador, tras publicar: %', r;
  end if;
  if exists (select 1 from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') then raise exception 'guardar tras publicar creó un borrador'; end if;
end $$;
rollback;

-- @test plantilla-version T3: publicar pide la versión (la nula no es un PT409 y no cambia nada) y una nota; la esperada vieja no publica; dos veces, la segunda da «se publicó»
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid := (select id from public.origenes where clave = 'subasta_usa'); r jsonb; v_v timestamptz; v_id uuid;
begin
  r := pg_temp.pve_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, pg_temp.pve_def('A')));
  v_v := (r ->> 'ok')::timestamptz;
  v_id := (select id from public.plantillas_tarjeta where origen_id = o and estado = 'borrador');
  -- La esperada nula: la excepción de `_exigir_version` (sin PT409) y nada cambia.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, null::timestamptz, %L)', o, 'v2'));
  if r ->> 'error' is null or r ->> 'error' = 'PT409' then raise exception 'publicar sin la versión: %', r; end if;
  -- La nota en blanco: 22023 con su hint, y nada cambia.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o, v_v, '   '));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nota' or r ->> 'mensaje' is distinct from 'Publicar pide una nota.' then
    raise exception 'publicar con la nota en blanco: %', r;
  end if;
  -- Una esperada distinta: PT409 con el texto de guardar, y la publicada sigue.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz - interval ''1 microsecond'', %L)', o, v_v, 'v2'));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador de esta plantilla cambió hace un momento, mientras lo editabas.' then
    raise exception 'publicar con una esperada vieja: %', r;
  end if;
  if (select count(*) from public.plantillas_tarjeta where origen_id = o and estado = 'publicada' and version = 1) <> 1
     or (select estado from public.plantillas_tarjeta where id = v_id) is distinct from 'borrador' then
    raise exception 'un rechazo cambió algo';
  end if;
  -- La buena: la N+1 con la nota, y la anterior archivada.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o, v_v, 'v2'));
  if r ? 'error' or (r ->> 'ok')::uuid is distinct from v_id then raise exception 'publicar con la esperada buena: %', r; end if;
  if (select version from public.plantillas_tarjeta where id = v_id) <> 2 or (select estado from public.plantillas_tarjeta where id = v_id) is distinct from 'publicada'
     or (select nota from public.plantillas_tarjeta where id = v_id) is distinct from 'v2'
     or (select estado from public.plantillas_tarjeta where origen_id = o and version = 1) is distinct from 'archivada' then
    raise exception 'publicar no dejó la v2 publicada con su nota y la v1 archivada';
  end if;
  -- Otra vez con la misma esperada: el borrador ya no está, y se publicó.
  r := pg_temp.pve_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o, v_v, 'v3'));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'El borrador ya no está: la versión 2 se publicó hace un momento.' then
    raise exception 'publicar dos veces: %', r;
  end if;
  if (select count(*) from public.plantillas_tarjeta where origen_id = o and estado = 'publicada') <> 1 then raise exception 'quedaron dos publicadas'; end if;
end $$;
rollback;

-- @test plantilla-version T5: sin cotizaciones.configurar del origen, 42501 (antes de todo); las firmas viejas ya no existen; las nuevas, definer con search_path vacío y a authenticated y service_role
begin;
do $$
declare
  asesora constant uuid := '00000000-0000-0000-0000-0000000000b1';
  o uuid := (select id from public.origenes where clave = 'subasta_usa'); r jsonb; v_f text; v_p record;
begin
  r := pg_temp.pve_corre(asesora, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, pg_temp.pve_def('A')));
  if r ->> 'error' is distinct from '42501' then raise exception 'la asesora guarda una plantilla: %', r; end if;
  r := pg_temp.pve_corre(asesora, format('select public.plantilla_publicar(%L, now(), %L)', o, 'v2'));
  if r ->> 'error' is distinct from '42501' then raise exception 'la asesora publica una plantilla: %', r; end if;
  if to_regprocedure('public.plantilla_guardar_borrador(uuid, jsonb, text)') is not null or to_regprocedure('public.plantilla_publicar(uuid, text)') is not null then
    raise exception 'siguen las firmas sin versión';
  end if;
  for v_p in select * from (values ('public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text)', 1), ('public.plantilla_publicar(uuid, timestamptz, text)', 0)) x (f, d) loop
    v_f := v_p.f;
    if to_regprocedure(v_f) is null then raise exception 'falta %', v_f; end if;
    if not has_function_privilege('authenticated', v_f, 'execute') or not has_function_privilege('service_role', v_f, 'execute')
       or has_function_privilege('anon', v_f, 'execute') or has_function_privilege('public', v_f, 'execute') then
      raise exception 'privilegios de %', v_f;
    end if;
    if not (select prosecdef from pg_proc where oid = v_f::regprocedure) or (select proconfig from pg_proc where oid = v_f::regprocedure) is distinct from array['search_path=""'] then
      raise exception '% no es definer con search_path vacío', v_f;
    end if;
    if (select pronargdefaults from pg_proc where oid = v_f::regprocedure) <> v_p.d then raise exception 'los defaults de %', v_f; end if;
  end loop;
end $$;
rollback;
