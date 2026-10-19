-- La huella de la búsqueda por candidatos a volumen y en un Postgres de verdad (cierre 5a-fix-1b). `pnpm db:medir:volumen` la corre.
-- `busqueda-leads.sql` (en `pnpm db:probar`) compara las filas enteras de los dos caminos en PGlite, que pliega mayúsculas y tildes sólo en ASCII y
-- no tiene el volumen. Acá es la base real, con ICU, con 62.000 o 212.000 leads: para cada persona y cada término, la primera página (el máximo de
-- la lista) de la consulta de siempre y la de los candidatos tienen que tener el mismo md5 de filas enteras. Todo en una transacción que se revierte.
-- Cuenta como medición (`medicion|…`) para que `scripts/medir-listado.mjs` la muestre; si una huella difiere, la corrida se corta nombrando la causa.
\set ON_ERROR_STOP 1
begin;
do $$ begin
  if (select count(*) from public.leads where nombre like 'Volumen %') < 50000 then
    raise exception 'Sin volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset).';
  end if;
end $$;
select set_config('medir.max_leads', :'max_leads', true);
-- La asesora con 3 leads (la «chica»), como en `medir-escala.sql`.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c9', 'chica-huella@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000c9', id, true from public.roles where clave = 'asesor' on conflict do nothing;
update public.leads_asesores set usuario_id = '00000000-0000-0000-0000-0000000000c9'
 where tipo_acceso = 'dueno' and revocado_en is null
   and lead_id in (select id from public.leads where nombre in ('Volumen 49000 Pérez', 'Volumen 30001 Gómez', 'Volumen 25003 Suárez'));
-- Leads con tildes, ñ, comodines y mayúsculas en el volumen, para que la huella los vea (dueña, Ana y Berta).
insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, tipo_lead_id) select n, t, c, (select id from public.origenes_lead order by orden limit 1), (select id from public.tipos_lead where clave = 'prospecto')
  from (values
    ('Volumen ñandú Ñuñoa 50% desc_uento', '69990001', '00000000-0000-0000-0000-0000000000d1'::uuid),
    ('Volumen ñandú Ñuñoa 50% desc_uento', '69990002', '00000000-0000-0000-0000-0000000000a1'::uuid),
    ('Volumen barra \ y "comillas" d''Angelo ÁÉÍÓÚ', '69990003', '00000000-0000-0000-0000-0000000000b1'::uuid),
    ('Volumen GÓMEZ MAYÚSCULAS', '69990004', '00000000-0000-0000-0000-0000000000a1'::uuid),
    ('Volumen gomez minúsculas', '69990005', '00000000-0000-0000-0000-0000000000b1'::uuid),
    ('Volumen Ñandú ñandú', '69990006', '00000000-0000-0000-0000-0000000000c9'::uuid)) x (n, t, c);
analyze public.leads;

-- La sesión de una persona para una sentencia (como PostgREST).
create or replace function pg_temp.bl_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- La consulta de siempre: la vista que elige `fuenteDelListado()` y las condiciones tal cual (`ilike` incluido).
create or replace function pg_temp.bl_viejo(p_quien uuid, p_rel text, p_donde text, p_tamano int, p_atras boolean, p_cursor_en timestamptz, p_cursor_id uuid) returns jsonb language sql as $$
  select pg_temp.bl_como(p_quien, format($q$select coalesce(jsonb_agg(to_jsonb(v) order by v.creado_en %s, v.id %s), '[]') from
      (select * from public.%I x where (%s) and %s order by x.creado_en %s, x.id %s limit %s) v$q$,
    case when p_atras then 'asc' else 'desc' end, case when p_atras then 'asc' else 'desc' end, p_rel, p_donde,
    case when p_cursor_en is null then 'true' when p_atras then format('(x.creado_en >= %L and (x.creado_en > %L or x.id > %L))', p_cursor_en, p_cursor_en, p_cursor_id)
         else format('(x.creado_en <= %L and (x.creado_en < %L or x.id < %L))', p_cursor_en, p_cursor_en, p_cursor_id) end,
    case when p_atras then 'asc' else 'desc' end, case when p_atras then 'asc' else 'desc' end, p_tamano + 1));
$$;

-- Lo que hace la app (`leerPorCandidatos`): pide una ventana, lee la página de sus ids con lo que queda, y si no se llenó y había más, pide la que sigue.
-- `p_empuja` es lo que va al paso 1 además del texto (tipos, orígenes, campos públicos) y `p_resto` lo que la página sigue aplicando.
create or replace function pg_temp.bl_nuevo(p_quien uuid, p_texto text, p_extra uuid[], p_mios boolean, p_empuja jsonb, p_resto text, p_tamano int, p_atras boolean, p_cursor_en timestamptz, p_cursor_id uuid)
returns jsonb language plpgsql as $$
declare
  v_juntas jsonb := '[]'; v_en timestamptz := p_cursor_en; v_id uuid := p_cursor_id; v_r jsonb; v_ids uuid[]; v_ventanas int := 0;
  v_dir text := case when p_atras then 'asc' else 'desc' end;
  v_cursor text := case when p_cursor_en is null then 'true' when p_atras then format('(x.creado_en >= %L and (x.creado_en > %L or x.id > %L))', p_cursor_en, p_cursor_en, p_cursor_id)
                        else format('(x.creado_en <= %L and (x.creado_en < %L or x.id < %L))', p_cursor_en, p_cursor_en, p_cursor_id) end;
begin
  loop
    v_r := pg_temp.bl_como(p_quien, format('select public.leads_candidatos(%L::jsonb)',
      (jsonb_build_object('sentido', case when p_atras then 'anterior' else 'siguiente' end, 'mios', p_mios) || p_empuja
        || case when p_texto is null then '{}'::jsonb else jsonb_build_object('texto', p_texto) end
        || case when v_en is null then '{}'::jsonb else jsonb_build_object('cursor', jsonb_build_object('creado_en', v_en, 'id', v_id)) end
        || case when p_extra is null then '{}'::jsonb else jsonb_build_object('extra', to_jsonb(p_extra)) end)::text));
    v_ids := array(select jsonb_array_elements_text(v_r -> 'ids'))::uuid[];
    if cardinality(v_ids) > 0 then
      v_juntas := v_juntas || pg_temp.bl_como(p_quien, format($q$select coalesce(jsonb_agg(to_jsonb(v) order by v.creado_en %s, v.id %s), '[]') from
          (select * from public.leads_vista_por_ids(%L::uuid[]) x where (%s) and %s order by x.creado_en %s, x.id %s limit %s) v$q$,
        v_dir, v_dir, v_ids, p_resto, v_cursor, v_dir, v_dir, p_tamano + 1 - jsonb_array_length(v_juntas)));
    end if;
    exit when jsonb_array_length(v_juntas) > p_tamano or (v_r ->> 'completa')::boolean;
    v_en := (v_r #>> '{hasta,creado_en}')::timestamptz; v_id := (v_r #>> '{hasta,id}')::uuid;
    v_ventanas := v_ventanas + 1;
    if v_ventanas > 40 or v_en is null then raise exception 'las ventanas no terminan (% ventanas) para %', v_ventanas, v_r; end if;
  end loop;
  return v_juntas;
end $$;


-- La primera página (el máximo de la lista, como la pide la app) por los dos caminos: el mismo md5 de filas enteras.
create function pg_temp.huella(p_quien uuid, p_rel text, p_mios boolean, p_texto text, p_extra_donde text default 'true') returns text language plpgsql as $$
declare v_max int := current_setting('medir.max_leads')::int; v_viejo jsonb; v_nuevo jsonb; v_t0 timestamptz := clock_timestamp();
begin
  v_viejo := pg_temp.bl_viejo(p_quien, p_rel, format('nombre ilike %L and %s(%s)', public._lead_busqueda_patron(p_texto), case when p_mios then 'en_cartera = true and ' else '' end, p_extra_donde), v_max, false, null, null);
  v_nuevo := pg_temp.bl_nuevo(p_quien, p_texto, null, p_mios, '{}', case when p_mios then 'en_cartera = true and ' else '' end || '(' || p_extra_donde || ')', v_max, false, null, null);
  if v_viejo is distinct from v_nuevo then
    raise exception E'huella distinta | persona % | «%» | %: siempre % filas (md5 %), ahora % filas (md5 %)\n  siempre: %\n  ahora:   %', p_quien, p_texto, p_rel,
      jsonb_array_length(v_viejo), md5(v_viejo::text), jsonb_array_length(v_nuevo), md5(v_nuevo::text),
      (select jsonb_agg(e ->> 'nombre') from (select e from jsonb_array_elements(v_viejo) e limit 5) z), (select jsonb_agg(e ->> 'nombre') from (select e from jsonb_array_elements(v_nuevo) e limit 5) z);
  end if;
  return jsonb_array_length(v_nuevo)::text;
end $$;

-- 5a-8: el buscador pide 3 letras o dígitos seguidos para el nombre, y lo decide en el navegador con `cumpleElMinimo()` (`shared/lib/filtros/minimo.ts`, `[\\p{L}\\p{Nd}]{3}`).
-- Tiene que ser lo mismo que `[[:alnum:]]{3}` de la base (`_leads_candidatos_indexable`): si el navegador dijera «alcanza» y la base «no tiene qué buscar en el índice», la
-- búsqueda recorrería la cartera entera. La misma lista está en `minimo.test.ts`; acá corre en un Postgres de verdad (con ICU), que es donde las eñes y las tildes cuentan.
do $paridad$
declare c record; v_n int := 0;
begin
  for c in select * from (values
    ('Ana', true), ('ana ro', true), ('Ñu', false), ('a b c', false), ('a_b', false), ('x', false), ('zq', false), ('%', false), (E'\\', false), ('ñandú', true),
    ('ÁLAMO', true), ('á é', false), ('Ñuñ', true), ('123', true), ('12', false), ('ÿöü', true), ('日本語', true), ('²³¹', false), ('éé', false), ('a-b-c', false), ('٣٤٥', true)
  ) x (texto, esperado) loop
    if (c.texto ~ '[[:alnum:]]{3}') is distinct from c.esperado
       or public._leads_candidatos_indexable(jsonb_build_object('texto', c.texto)) is distinct from c.esperado then
      raise exception 'el tramo de 3 de la base no coincide con el del navegador para «%»: la base dice %, el navegador %', c.texto, c.texto ~ '[[:alnum:]]{3}', c.esperado;
    end if;
    v_n := v_n + 1;
  end loop;
  raise notice 'medicion|el tramo de 3 de la base es el del navegador (% textos)|%', v_n, v_n;
end $paridad$;

create temp table huellas (persona text, termino text, filas int);
do $m$
declare p record; t text; v_n int; v_comparaciones int := 0; v_con_filas int := 0; v_t0 timestamptz := clock_timestamp();
begin
  for p in select * from (values
    ('dueña «todos»', '00000000-0000-0000-0000-0000000000d1'::uuid, 'leads_vista', false),
    ('dueña «míos»', '00000000-0000-0000-0000-0000000000d1'::uuid, 'leads_vista', true),
    ('Ana', '00000000-0000-0000-0000-0000000000a1'::uuid, 'leads_cartera_vista', true),
    ('Berta', '00000000-0000-0000-0000-0000000000b1'::uuid, 'leads_cartera_vista', true),
    ('la «chica»', '00000000-0000-0000-0000-0000000000c9'::uuid, 'leads_cartera_vista', true)) x (nombre, id, rel, mios) loop
    foreach t in array array['Volumen 4999', 'zzzzqx', 'Gómez', 'gómez', 'GÓMEZ', 'gomez', 'GOMEZ', 'Suárez', 'suárez', 'Pérez', 'Mamani', 'Volumen', 'Vol', 'volumen 1', 'v', 'ol', 'x', 'zq', 'a_b', '%', '50%', 'desc_uento',
                             '\', '"comillas"', 'd''Angelo', 'ñandú', 'Ñandú', 'ÑANDÚ', 'ÁÉÍÓÚ', 'áéíóú', 'MAYÚSCULAS', 'Volumen*Gómez', '4999', 'Volumen 49', 'Volumen ñ'] loop
      v_n := pg_temp.huella(p.id, p.rel, p.mios, t)::int;
      v_comparaciones := v_comparaciones + 1; v_con_filas := v_con_filas + (v_n > 0)::int;
      insert into huellas values (p.nombre, t, v_n);
    end loop;
    -- Con el filtro de tachados ocultos (lo que la app suma por omisión) y con un campo público.
    foreach t in array array['Gómez', 'Volumen', 'ñandú'] loop
      v_n := pg_temp.huella(p.id, p.rel, p.mios, t, 'esta_tachado = false')::int;
      v_comparaciones := v_comparaciones + 1; v_con_filas := v_con_filas + (v_n > 0)::int;
    end loop;
  end loop;
  if v_con_filas < 100 then raise exception 'la huella casi no comparó filas (% de % con filas): no prueba', v_con_filas, v_comparaciones; end if;
  raise notice 'medicion|búsqueda por candidatos: % huellas iguales (% con filas)|%', v_comparaciones, v_con_filas, round(extract(epoch from clock_timestamp() - v_t0) * 1000, 0);
end $m$;
rollback;
