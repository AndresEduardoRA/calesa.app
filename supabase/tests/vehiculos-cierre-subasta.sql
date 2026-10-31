-- `vehiculos.cierre_subasta_en` (paso 4.14-1): cuándo cierra una subasta viva, la que ordena «Cierre subasta» en el panel del vehículo. Es una columna generada: el fin de una
-- temporizada y, si no lo hay, la fecha de la subasta, sólo si está abierta o en vivo; nula en lo demás. Nadie la escribe. Cada bloque abre su transacción y la revierte.

-- En plpgsql: sin la migración, la prueba cae en su bloque y no al crear el ayudante.
create or replace function pg_temp.vs_cierre(p_v uuid) returns timestamptz language plpgsql as $f$ begin return (select cierre_subasta_en from public.vehiculos where id = p_v); end $f$;

-- @test cierre_subasta_en: el fin de una temporizada o la fecha de la subasta, sólo si está abierta o en vivo; refrescarla la recalcula; nadie la escribe
begin;
do $$
declare
  o uuid; ab_temporizada uuid; ab_sin_fin uuid; en_vivo uuid; terminada uuid; vendida uuid; sin_fechas uuid; m text; e text;
  c_abre constant timestamptz := now() + interval '1 day'; c_cierra constant timestamptz := now() + interval '3 days';
  c_fecha constant timestamptz := now() + interval '2 days'; c_paso constant timestamptz := now() - interval '2 hours';
begin
  insert into public.origenes (clave, nombre) values ('vs_' || substr(gen_random_uuid()::text, 1, 8), 'VS origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_en, subasta_fin_en) values (o, 'VS temporizada', 'abierta', c_abre, c_cierra) returning id into ab_temporizada;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_en) values (o, 'VS abierta', 'abierta', c_fecha) returning id into ab_sin_fin;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_en) values (o, 'VS en vivo', 'en_vivo', c_paso) returning id into en_vivo;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_en, subasta_fin_en) values (o, 'VS terminada', 'terminada', c_paso, c_paso + interval '1 hour') returning id into terminada;
  insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_en, subasta_fin_en) values (o, 'VS vendida', 'vendida', c_paso, c_paso + interval '1 hour') returning id into vendida;
  insert into public.vehiculos (origen_id, titulo, estado_subasta) values (o, 'VS sin fechas', 'abierta') returning id into sin_fechas;
  if pg_temp.vs_cierre(ab_temporizada) is distinct from c_cierra then raise exception 'una temporizada cierra a su fin: %', pg_temp.vs_cierre(ab_temporizada); end if;
  if pg_temp.vs_cierre(ab_sin_fin) is distinct from c_fecha then raise exception 'sin fin, cierra en la fecha de la subasta: %', pg_temp.vs_cierre(ab_sin_fin); end if;
  if pg_temp.vs_cierre(en_vivo) is distinct from c_paso then raise exception 'una en vivo con la fecha ya pasada conserva esa fecha: %', pg_temp.vs_cierre(en_vivo); end if;
  if pg_temp.vs_cierre(terminada) is not null or pg_temp.vs_cierre(vendida) is not null then raise exception 'una terminada o una vendida no tienen cierre'; end if;
  if pg_temp.vs_cierre(sin_fechas) is not null then raise exception 'sin fechas no hay cierre: %', pg_temp.vs_cierre(sin_fechas); end if;
  -- Refrescarla (lo que hace apibara) la recalcula.
  update public.vehiculos set estado_subasta = 'terminada' where id = ab_temporizada;
  if pg_temp.vs_cierre(ab_temporizada) is not null then raise exception 'al terminar, la subasta deja de tener cierre: %', pg_temp.vs_cierre(ab_temporizada); end if;
  begin
    update public.vehiculos set cierre_subasta_en = now() where id = ab_sin_fin;
    raise exception 'se pudo escribir cierre_subasta_en';
  exception when others then
    get stacked diagnostics m = message_text;
    e := sqlstate;
    if e is distinct from '428C9' then raise exception 'escribir cierre_subasta_en debía dar 428C9 y dio % (%)', e, m; end if;
  end;
end $$;
rollback;
