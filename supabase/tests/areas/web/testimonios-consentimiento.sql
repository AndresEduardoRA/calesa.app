-- El consentimiento de un testimonio (8.01-1, C13–C16 y D15). No depende de otro archivo (`SOLO=areas/web/testimonios-consentimiento.sql`).
-- Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T1. Crear publicado da 22023 hint publicado; T1b: publicar con un update uno sin consentimiento, también.
--   T2. Como authenticated con la clave, escribir consent_por con un update o un insert da 42501 (columna).
--   T3. Sin web.contenido.gestionar, consentir da 42501.
--   T4. Consentir sólo la ciudad: publicar pasa; web.testimonios (como anon) trae la ciudad y el vehículo nulo; consent_por = quien llamó.
--   T5. Versión vieja: PT409 al consentir y al retirar (T5b).
--   T6. Retirar despublica y web.testimonios no lo trae; publicar de nuevo da 22023; retirar otra vez devuelve la misma versión.
--   T7. Consentir de nuevo reactiva (retirado nulo) y se puede publicar.
--   T8. Retirar sin consentimiento da 22023 hint consentimiento.
--   T9. Cambiar el texto de uno consentido y publicado anula el consentimiento y lo despublica (D15); cambiar el orden no; cambiar la ciudad o el
--       vehículo apaga sólo su permiso y sigue publicado.

create or replace function pg_temp.wt_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wt@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wt_' || substr(v_id::text, 1, 8), 'WT ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`.
create or replace function pg_temp.wt_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return jsonb_build_object('v', v);
end $f$;

create or replace function pg_temp.wt_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.web_testimonios where id = p_id
$f$;

create or replace function pg_temp.wt_consentir(p_quien uuid, p_id uuid, p_ciudad boolean, p_esperada timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.wt_corre(p_quien, format('select public.web_testimonio_consentir(%L, %L, %L, %L, false, false)::text',
    p_id, coalesce(p_esperada, pg_temp.wt_version(p_id)), 'WhatsApp', p_ciudad));
$f$;

create or replace function pg_temp.wt_retirar(p_quien uuid, p_id uuid, p_esperada timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.wt_corre(p_quien, format('select public.web_testimonio_retirar(%L, %L)::text', p_id, coalesce(p_esperada, pg_temp.wt_version(p_id))));
$f$;

create or replace function pg_temp.wt_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: se esperaba % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- now() no cambia dentro de una transacción: para ver si algo escribió, la versión se lleva al pasado.
create or replace function pg_temp.wt_envejecer(p_id uuid) returns void language plpgsql as $f$
begin
  alter table public.web_testimonios disable trigger trg_actualizado_en;
  update public.web_testimonios set actualizado_en = '2020-01-01T00:00:00Z' where id = p_id;
  alter table public.web_testimonios enable trigger trg_actualizado_en;
end $f$;

-- @test web testimonios: no se publica sin consentimiento y consent_* no se escribe directo (T1, T1b, T2, T3, T8)
begin;
do $$
declare
  v_editor uuid := pg_temp.wt_persona(array['web.contenido.gestionar']);
  v_nadie uuid := pg_temp.wt_persona(array[]::text[]);
  v_id uuid;
begin
  perform pg_temp.wt_es('T1', pg_temp.wt_corre(v_editor,
    'insert into public.web_testimonios (cliente, texto, publicado) values (''Ana'', ''Muy bien'', true) returning id'), '22023', 'publicado');
  perform pg_temp.wt_es('T2 insert', pg_temp.wt_corre(v_editor, format(
    'insert into public.web_testimonios (cliente, texto, consent_por) values (''Ana'', ''Muy bien'', %L) returning id', v_editor)), '42501');
  v_id := (pg_temp.wt_corre(v_editor, 'insert into public.web_testimonios (cliente, texto) values (''Ana'', ''Muy bien'') returning id') ->> 'v')::uuid;
  if v_id is null then
    raise exception 'T1: crear despublicado no devolvió el id';
  end if;
  perform pg_temp.wt_es('T1b', pg_temp.wt_corre(v_editor, format(
    'update public.web_testimonios set publicado = true where id = %L returning id', v_id)), '22023', 'publicado');
  perform pg_temp.wt_es('T2 update', pg_temp.wt_corre(v_editor, format(
    'update public.web_testimonios set consent_por = %L, consent_en = now(), consent_canal = ''x'' where id = %L returning id', v_editor, v_id)), '42501');
  perform pg_temp.wt_es('T2 canal', pg_temp.wt_corre(v_editor, format(
    'update public.web_testimonios set consent_canal = ''x'' where id = %L returning id', v_id)), '42501');
  perform pg_temp.wt_es('T3', pg_temp.wt_consentir(v_nadie, v_id, true), '42501');
  perform pg_temp.wt_es('T8', pg_temp.wt_retirar(v_editor, v_id), '22023', 'consentimiento');
  if (select consent_por from public.web_testimonios where id = v_id) is not null then
    raise exception 'T2/T3: alguien escribió el consentimiento';
  end if;
end $$;
rollback;

-- @test web testimonios: consentir, publicar, retirar y volver a consentir (T4–T7)
begin;
do $$
declare
  v_editor uuid := pg_temp.wt_persona(array['web.contenido.gestionar']);
  v_id uuid;
  v_vieja timestamptz;
  v jsonb;
begin
  insert into public.web_testimonios (cliente, ciudad, texto, vehiculo) values ('Luis', 'Cochabamba', 'Llegó a tiempo', 'RAV4 2019') returning id into v_id;
  perform pg_temp.wt_envejecer(v_id);
  v_vieja := pg_temp.wt_version(v_id);
  v := pg_temp.wt_consentir(v_editor, v_id, true);
  if v ->> 'v' is null or (select consent_por from public.web_testimonios where id = v_id) is distinct from v_editor
     or (select consent_canal from public.web_testimonios where id = v_id) is distinct from 'WhatsApp' then
    raise exception 'T4: consentir dio % y no quedó quién', v;
  end if;
  perform pg_temp.wt_es('T5', pg_temp.wt_consentir(v_editor, v_id, false, v_vieja), 'PT409');
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set publicado = true where id = %L returning id', v_id));
  if v ->> 'v' is null then
    raise exception 'T4: publicar con consentimiento dio %', v;
  end if;
  set local role anon;
  if (select ciudad from web.testimonios where cliente = 'Luis') is distinct from 'Cochabamba'
     or (select vehiculo from web.testimonios where cliente = 'Luis') is not null then
    raise exception 'T4: web.testimonios no recortó por el consentimiento';
  end if;
  reset role;

  perform pg_temp.wt_es('T5b', pg_temp.wt_retirar(v_editor, v_id, v_vieja), 'PT409');
  v := pg_temp.wt_retirar(v_editor, v_id);
  if v ->> 'v' is null or (select publicado from public.web_testimonios where id = v_id)
     or (select consent_retirado_en from public.web_testimonios where id = v_id) is null then
    raise exception 'T6: retirar dio % y no despublicó', v;
  end if;
  set local role anon;
  if exists (select 1 from web.testimonios where cliente = 'Luis') then
    raise exception 'T6: retirado, web.testimonios lo sigue trayendo';
  end if;
  reset role;
  perform pg_temp.wt_es('T6 publicar', pg_temp.wt_corre(v_editor, format(
    'update public.web_testimonios set publicado = true where id = %L returning id', v_id)), '22023', 'publicado');
  perform pg_temp.wt_envejecer(v_id);
  v := pg_temp.wt_retirar(v_editor, v_id);
  if (v ->> 'v')::timestamptz is distinct from '2020-01-01T00:00:00Z'::timestamptz then
    raise exception 'T6: retirar otra vez escribió (%)', v;
  end if;

  v := pg_temp.wt_consentir(v_editor, v_id, false);
  if v ->> 'v' is null or (select consent_retirado_en from public.web_testimonios where id = v_id) is not null then
    raise exception 'T7: consentir de nuevo dio % y no reactivó', v;
  end if;
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set publicado = true where id = %L returning id', v_id));
  if v ->> 'v' is null then
    raise exception 'T7: publicar tras consentir de nuevo dio %', v;
  end if;
end $$;
rollback;

-- @test web testimonios: cambiar el texto anula el consentimiento y despublica; el orden no (T9)
begin;
do $$
declare
  v_editor uuid := pg_temp.wt_persona(array['web.contenido.gestionar']);
  v_id uuid;
  v jsonb;
begin
  insert into public.web_testimonios (cliente, texto, ciudad, vehiculo) values ('Eva', 'Excelente', 'Sucre', 'Hilux') returning id into v_id;
  v := pg_temp.wt_corre(v_editor, format('select public.web_testimonio_consentir(%L, %L, ''WhatsApp'', true, true, false)::text',
    v_id, pg_temp.wt_version(v_id)));
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set publicado = true, orden = 3 where id = %L returning id', v_id));
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set orden = 4 where id = %L returning id', v_id));
  if v ->> 'v' is null or not (select publicado from public.web_testimonios where id = v_id)
     or (select consent_por from public.web_testimonios where id = v_id) is null then
    raise exception 'T9: cambiar el orden tocó el consentimiento (%)', v;
  end if;
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set ciudad = ''Potosí'', vehiculo = ''RAV4'' where id = %L returning id', v_id));
  if v ->> 'v' is null or not (select publicado from public.web_testimonios where id = v_id)
     or (select consent_ciudad or consent_vehiculo from public.web_testimonios where id = v_id)
     or (select consent_por from public.web_testimonios where id = v_id) is null then
    raise exception 'T9: cambiar la ciudad y el vehículo no apagó sólo sus permisos (%)', v;
  end if;
  set local role anon;
  if (select ciudad is not null or vehiculo is not null from web.testimonios where cliente = 'Eva') then
    raise exception 'T9: web.testimonios muestra la ciudad o el vehículo cambiados';
  end if;
  reset role;
  v := pg_temp.wt_corre(v_editor, format('update public.web_testimonios set texto = ''Pésimo'' where id = %L returning id', v_id));
  if v ->> 'v' is null or (select publicado from public.web_testimonios where id = v_id)
     or (select consent_por from public.web_testimonios where id = v_id) is not null
     or (select consent_ciudad from public.web_testimonios where id = v_id) then
    raise exception 'T9: cambiar el texto no anuló el consentimiento ni despublicó (%)', v;
  end if;
end $$;
rollback;
