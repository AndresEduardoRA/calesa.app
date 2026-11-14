-- Una subasta no ganada deja de contar en logística y en Inicio (`vehiculos.situacion = 'no_ganada'`); una sin resolver sigue contando. No depende de
-- otro archivo (`SOLO=areas/situacion/cuenta.sql`). El bloque abre su transacción y la revierte. El plan de la cadena con volumen:
-- `medir-escala.sql` › «La cadena».
--
-- Qué asegura:
--   C1. La cadena: una no ganada no sale en su columna (`logistica_cadena_columna`), ni en «Sin fase», ni en `logistica_cadena`; la sin resolver sí, y
--       su tarjeta trae `situacion`.
--   C2. La bandeja de Inicio: la no ganada no sale en demoradas ni en «Por aprobar»; la sin resolver sí, y la fila de demoradas trae `situacion`.
--   C3. `alertas_demora()` avisa la sin resolver y no la no ganada.
--   C4. Las consultas de la cadena llevan el literal del índice parcial (`vehiculos_cadena_idx`, sin las no ganadas).

create or replace function pg_temp.sc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

create or replace function pg_temp.sc_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x ->> 'id')::uuid order by i), '{}')
    from jsonb_array_elements(coalesce(p -> 'tarjetas', p -> 'filas', jsonb_path_query_array(p, '$.columnas[*].tarjetas[*]'))) with ordinality y (x, i);
$f$;

create or replace function pg_temp.sc_igual(p_que text, p_dio anyelement, p_debia anyelement) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_debia then raise exception '%: debía ser % y fue %', p_que, p_debia, p_dio; end if;
end $f$;

-- @test situacion: una no ganada no cuenta en la cadena, la bandeja ni las alertas; una sin resolver sí (C1–C4)
begin;
do $$
declare
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  o uuid; fl uuid; sub uuid; comp uuid; t uuid; u uuid := gen_random_uuid(); v_rol uuid;
  ng uuid; sr uuid; ng_sin uuid; sr_sin uuid; d_ng uuid; d_sr uuid; r jsonb; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-sc@ejemplo.com', '{"invitado": true}');
  end if;
  insert into public.origenes (clave, nombre, tipo) values ('sc_' || s, 'sc origen ' || s, 'subasta') returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'alerta_demora', true)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_logistica, es_subasta, demora_dias) values (fl, 'Subasta', 10, true, true, true, 3)
  returning id into sub;
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (fl, 'Comprado', 20, true) returning id into comp;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fl, sub, comp);
  insert into public.tipos_documento (nombre) values ('SC tipo ' || s) returning id into t;
  insert into auth.users (id, email, raw_app_meta_data) values (u, u || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('sc_' || s, 'sc ' || s) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (u, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select v_rol, k, o, 'todos' from unnest(array['logistica.ver', 'vehiculos.ver', 'logistica.documentos.aprobar', 'flujos.mover']) k;
  -- Dos en la subasta hace 10 días (demoradas) y dos sin fase; de cada par, una no ganada.
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en, subasta_resultado, subasta_resuelta_en)
  values (o, 'sc no ganada', sub, now() - interval '10 days', 'terminada', now() - interval '10 days', 'no_ganada', now()) returning id into ng;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  values (o, 'sc sin resolver', sub, now() - interval '10 days', 'terminada', now() - interval '10 days') returning id into sr;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_resultado, subasta_resuelta_en)
  values (o, 'sc no ganada sin fase', 'vendida', 'no_ganada', now()) returning id into ng_sin;
  insert into public.vehiculos (origen_id, titulo, estado_subasta) values (o, 'sc sin resolver sin fase', 'vendida') returning id into sr_sin;
  perform pg_temp.sc_igual('el terreno', (select array_agg(situacion order by titulo) from public.vehiculos where origen_id = o),
                           array['no_ganada', 'no_ganada', 'sin_resolver', 'sin_resolver']);
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (ng, t) returning id into d_ng;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (sr, t) returning id into d_sr;

  -- C1. La cadena.
  r := pg_temp.sc_corre(u, format('select public.logistica_cadena_columna(%L, %L, null, null, 50, %L)', o, sub, '{}'));
  perform pg_temp.sc_igual('C1 la columna de la subasta', pg_temp.sc_ids(r), array[sr]);
  perform pg_temp.sc_igual('C1 la tarjeta trae la situación', r #>> '{tarjetas,0,situacion}', 'sin_resolver');
  r := pg_temp.sc_corre(u, format('select public.logistica_cadena_columna(%L, null, null, null, 50, %L)', o, '{}'));
  perform pg_temp.sc_igual('C1 «Sin fase»', pg_temp.sc_ids(r), array[sr_sin]);
  r := pg_temp.sc_corre(u, format('select public.logistica_cadena(%L, 50, %L)', o, '{}'));
  perform pg_temp.sc_igual('C1 la cadena entera', (select array_agg(x order by x) from unnest(pg_temp.sc_ids(r)) x),
                           (select array_agg(x order by x) from unnest(array[sr, sr_sin]) x));
  r := pg_temp.sc_corre(u, format('select public.logistica_cadena_columna(%L, %L, null, null, 50, %L)', o, sub, '{"demoradas": true}'));
  perform pg_temp.sc_igual('C1 la columna con «Demoradas»', pg_temp.sc_ids(r), array[sr]);

  -- C2. La bandeja.
  r := pg_temp.sc_corre(u, 'select public.logistica_bandeja(20)');
  perform pg_temp.sc_igual('C2 demoradas', (select array_agg(x) from unnest(pg_temp.sc_ids(r -> 'demoradas')) x where x in (ng, sr)), array[sr]);
  perform pg_temp.sc_igual('C2 la fila trae la situación', (select e ->> 'situacion' from jsonb_array_elements(r #> '{demoradas,filas}') e
                                                            where e ->> 'id' = sr::text), 'sin_resolver');
  perform pg_temp.sc_igual('C2 por aprobar', (select array_agg(x) from unnest(pg_temp.sc_ids(r -> 'por_aprobar')) x where x in (d_ng, d_sr)), array[d_sr]);

  -- C3. Las alertas.
  perform public.alertas_demora();
  perform pg_temp.sc_igual('C3 avisa la sin resolver',
    (select count(*)::int from public.notificaciones where usuario_id = u and referencia_id = sr and tipo = 'demora_fase'), 1);
  perform pg_temp.sc_igual('C3 no avisa la no ganada',
    (select count(*)::int from public.notificaciones where usuario_id = u and referencia_id = ng and tipo = 'demora_fase'), 0);

  -- C4. El índice parcial y su literal en cada consulta que lo usa.
  if pg_get_indexdef('public.vehiculos_cadena_idx'::regclass) !~ $r$situacion <> 'no_ganada'$r$ then
    raise exception 'C4: vehiculos_cadena_idx no es parcial sin las no ganadas: %', pg_get_indexdef('public.vehiculos_cadena_idx'::regclass);
  end if;
  -- Las siete consultas que lo usan: cuatro de una columna, las demoradas y las dos de las alertas.
  foreach c in array array['_logistica_columna:4', '_bandeja_demoradas:1', 'alertas_demora:2'] loop
    if (select count(*) from pg_proc p, regexp_matches(pg_get_functiondef(p.oid), $r$v\.situacion <> 'no_ganada'$r$, 'g') m
         where p.proname = split_part(c, ':', 1) and p.pronamespace = 'public'::regnamespace) <> split_part(c, ':', 2)::int then
      raise exception 'C4: % no lleva el literal en cada consulta de vehiculos_cadena_idx', c;
    end if;
  end loop;
end $$;
rollback;
