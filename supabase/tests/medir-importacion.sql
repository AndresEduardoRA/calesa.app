-- Medición de la importación de leads (`pnpm db:medir`, contra el Supabase LOCAL), parte 8a.
--
-- Todo pasa en una transacción que se revierte. El terreno: una dueña con la base de `actividad` ya
-- llena (22.000 filas, 2.000 de ellas adopciones del limbo: lo que hace pesada la búsqueda del intento de
-- `crear_lead`). Se importan 500 filas en 10 lotes de 50 como `authenticated` y se informa el lote más lento y el total.
-- El tope que no se puede pasar es el `statement_timeout` de `authenticated`: 8 s por lote.
--
-- Tres pasadas (cierre 4):
--   1. «tal como queda tras el reset»: sin ningún `analyze` más que el de `actividad` de acá. Es el estado de una base recién creada:
--      sin estadísticas la primera importación tardaba ~20 s (lotes de 3,8 s) y con 100 filas por lote un lote llegó a 7,3 s, casi el
--      corte. `seed.sql` termina con un `analyze`, y esta pasada tiene presupuesto para que no se pierda: lote más lento ≤ 2 s,
--      500 filas ≤ 8 s (hoy ~0,15 s y ~1,2 s). Sobre una base que ya tiene estadísticas mide lo mismo que la estable, y pasa.
--   2. y 3. el estado estable (`analyze` de todo antes de cronometrar): sin los dos índices nuevos de `actividad` y con ellos.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000d1', id from public.roles where clave = 'dueno'
on conflict do nothing;

insert into public.actividad (accion, actor_id, tabla, registro_id, detalle, creado_en)
select case when g % 11 = 0 then 'lead.adoptado_del_limbo' else 'medir.relleno' end,
       '00000000-0000-0000-0000-0000000000d1', 'leads', gen_random_uuid()::text,
       jsonb_build_object('intento', gen_random_uuid()), now() - make_interval(secs => g)
from generate_series(1, 22000) g;
analyze public.actividad;

create function pg_temp.importar(p_etiqueta text, p_inicio int, p_lote_max_ms numeric default null, p_total_max_ms numeric default null) returns void language plpgsql as $$
declare
  v_imp uuid := gen_random_uuid(); v_origen uuid := (select id from public.origenes_lead where activo order by orden limit 1);
  v_filas jsonb; v_t timestamptz; v_ms numeric[] := '{}'; v_total numeric := 0; i int; v_r jsonb; v_creadas int := 0;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  set local role authenticated;
  for i in 0..9 loop
    select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'fila', i * 50 + j, 'lead', jsonb_build_object(
             'nombre', 'Importada ' || (p_inicio + i * 50 + j), 'telefono_principal', (60000000 + p_inicio + i * 50 + j)::text,
             'origen_lead_id', v_origen, 'atributos', jsonb_build_object('ciudad', 'La Paz', 'notas', 'fila ' || j))))
      into v_filas from generate_series(1, 50) j;
    v_t := clock_timestamp();
    v_r := public.leads_importar_lote(v_imp, 500, v_filas);
    v_ms := v_ms || (extract(epoch from clock_timestamp() - v_t) * 1000);
    v_total := v_total + v_ms[array_length(v_ms, 1)];
    v_creadas := v_creadas + (select count(*) from jsonb_array_elements(v_r -> 'filas') e where e ->> 'resultado' = 'creado');
  end loop;
  reset role;
  if v_creadas <> 500 then raise exception 'entraron % de 500', v_creadas; end if;
  raise notice 'medicion|%, lote de 50 más lento|%', p_etiqueta, round((select max(x) from unnest(v_ms) x), 1);
  raise notice 'medicion|%, 500 filas en 10 lotes|%', p_etiqueta, round(v_total, 1);
  if p_lote_max_ms is not null and (select max(x) from unnest(v_ms) x) > p_lote_max_ms then
    raise exception '%: un lote tarda % ms, el presupuesto es % ms', p_etiqueta, round((select max(x) from unnest(v_ms) x), 0), p_lote_max_ms;
  end if;
  if p_total_max_ms is not null and v_total > p_total_max_ms then
    raise exception '%: 500 filas tardan % ms, el presupuesto es % ms', p_etiqueta, round(v_total, 0), p_total_max_ms;
  end if;
end $$;

select pg_temp.importar('tal como queda tras el reset', 0, 2000, 8000);

analyze;
drop index public.actividad_actor_accion_idx;
drop index public.actividad_intento_adopcion_idx;
select pg_temp.importar('sin los índices de actividad', 1000);
create index actividad_actor_accion_idx on public.actividad (actor_id, accion, creado_en desc);
create index actividad_intento_adopcion_idx on public.actividad ((detalle ->> 'intento')) where accion = 'lead.adoptado_del_limbo';
analyze public.actividad;
select pg_temp.importar('con los índices', 2000);

-- Deshacer (parte 8b) la importación de 500 recién hecha: la lista de recientes (que cuenta lo intacto),
-- el deshacer en una transacción, la papelera con ese lote de 500 y restaurarlo entero.
do $$
declare
  v_imp uuid := (select id from public.importaciones where usuario_id = '00000000-0000-0000-0000-0000000000d1'
                  order by creado_en desc, id limit 1);
  v_t timestamptz; v_r jsonb; v_lote uuid;
begin
  update public.importaciones set estado = 'terminada', terminada_en = now() where id = v_imp;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  set local role authenticated;
  v_t := clock_timestamp();
  v_r := public.leads_importaciones_recientes();
  raise notice 'medicion|recientes con 500 intactos|%', round(extract(epoch from clock_timestamp() - v_t)::numeric * 1000, 1);
  if (v_r -> 0 ->> 'intactos')::int <> 500 then raise exception 'recientes: %', v_r -> 0; end if;
  v_t := clock_timestamp();
  v_r := public.leads_importacion_deshacer(v_imp);
  raise notice 'medicion|deshacer 500|%', round(extract(epoch from clock_timestamp() - v_t)::numeric * 1000, 1);
  if (v_r ->> 'movidos')::int <> 500 then raise exception 'deshacer: %', v_r; end if;
  v_lote := (select deshecha_lote from public.importaciones where id = v_imp);
  v_t := clock_timestamp();
  v_r := public.leads_papelera_listar();
  raise notice 'medicion|papelera con el lote de 500|%', round(extract(epoch from clock_timestamp() - v_t)::numeric * 1000, 1);
  v_t := clock_timestamp();
  v_r := public.leads_papelera_restaurar(v_lote, (select actualizado_en from public.lotes_papelera where id = v_lote));
  raise notice 'medicion|restaurar el lote de 500|%', round(extract(epoch from clock_timestamp() - v_t)::numeric * 1000, 1);
  if jsonb_array_length(v_r -> 'restaurados') <> 500 then raise exception 'restaurar: %', v_r -> 'pendientes'; end if;
  reset role;
end $$;

rollback;
