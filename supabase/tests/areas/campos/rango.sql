-- El rango de un campo numérico (9.04-2): `minimo` y `maximo` en `leads_campos` y `origenes_campos` (nulos = sin límite; sólo en `numero`
-- y `moneda`; mínimo ≤ máximo). Los triggers de atributos de leads y de vehículos rechazan un valor fuera con 22023, el motivo y
-- `hint = 'atributos.<clave>'`, pero sólo si el valor cambió: uno que ya estaba fuera no impide guardar otro campo. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.

-- @test rango: los ayudantes
reset role;
-- «sqlstate/hint: mensaje» de un SQL corrido como postgres, o «sin error».
create or replace function pg_temp.cmr_error(p_sql text) returns text language plpgsql as $f$
declare v_hint text; v_msg text;
begin
  execute p_sql;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_msg = message_text;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '') || ': ' || v_msg;
end $f$;

-- Un campo de lead «RG Edad» (número, 18–99) y un origen propio con su campo «RG Año» (número, 18–99).
create or replace function pg_temp.cmr_preparar() returns void language plpgsql as $f$
declare o uuid;
begin
  insert into public.leads_campos (clave, etiqueta, tipo, orden, minimo, maximo) values ('rg_edad', 'RG Edad', 'numero', 1001, 18, 99);
  insert into public.origenes (clave, nombre) values ('prueba_rg', 'Prueba rg') returning id into o;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, orden, minimo, maximo) values
    (o, 'rg_anio', 'RG Año', 'numero', 1001, 18, 99),
    (o, 'rg_nota', 'RG Nota', 'texto', 1002, null, null);
end $f$;

create or replace function pg_temp.cmr_origen() returns uuid language sql as $f$
  select id from public.origenes where clave = 'prueba_rg'
$f$;

create or replace function pg_temp.cmr_quien() returns uuid language sql as $f$
  select id from public.perfiles order by id limit 1
$f$;

create temp sequence if not exists cmr_telefono start 100;

-- Inserta un lead con esos atributos como postgres; devuelve el error o «sin error».
create or replace function pg_temp.cmr_lead(p_atributos jsonb) returns text language sql as $f$
  select pg_temp.cmr_error(format(
    'insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values (%L, %L, %L, (select id from public.origenes_lead where clave = %L), %L)',
    'RG lead', '72719' || nextval('pg_temp.cmr_telefono')::text, pg_temp.cmr_quien(), 'web', p_atributos))
$f$;

-- @test rango: un lead fuera del rango da 22023 con su hint y el texto exacto; los bordes pasan; «desde» y «hasta»
begin;
select pg_temp.cmr_preparar();
do $$
declare r text;
begin
  r := pg_temp.cmr_lead('{"rg_edad": 17}');
  if r <> '22023/atributos.rg_edad: «RG Edad» va de 18 a 99.' then raise exception 'lead con 17: %', r; end if;
  r := pg_temp.cmr_lead('{"rg_edad": 100}');
  if r <> '22023/atributos.rg_edad: «RG Edad» va de 18 a 99.' then raise exception 'lead con 100: %', r; end if;
  r := pg_temp.cmr_lead('{"rg_edad": 18}');
  if r <> 'sin error' then raise exception 'lead con 18: %', r; end if;
  r := pg_temp.cmr_lead('{"rg_edad": 99}');
  if r <> 'sin error' then raise exception 'lead con 99: %', r; end if;
  r := pg_temp.cmr_lead('{}');
  if r <> 'sin error' then raise exception 'lead sin el campo: %', r; end if;
  r := pg_temp.cmr_lead('{"rg_edad": null}');
  if r <> 'sin error' then raise exception 'lead con el campo nulo: %', r; end if;
  update public.leads_campos set maximo = null where clave = 'rg_edad';
  r := pg_temp.cmr_lead('{"rg_edad": 17.5}');
  if r <> '22023/atributos.rg_edad: «RG Edad» va desde 18.' then raise exception 'sólo mínimo: %', r; end if;
  r := pg_temp.cmr_lead('{"rg_edad": 1000}');
  if r <> 'sin error' then raise exception 'sólo mínimo, 1000: %', r; end if;
  update public.leads_campos set minimo = null, maximo = 99.5 where clave = 'rg_edad';
  r := pg_temp.cmr_lead('{"rg_edad": 100}');
  if r <> '22023/atributos.rg_edad: «RG Edad» va hasta 99.5.' then raise exception 'sólo máximo: %', r; end if;
  -- Un campo inactivo no se valida.
  update public.leads_campos set activo = false where clave = 'rg_edad';
  r := pg_temp.cmr_lead('{"rg_edad": 500}');
  if r not like 'sin error' and r like '%va hasta%' then raise exception 'un campo inactivo validó el rango: %', r; end if;
end $$;
rollback;

-- @test rango: un vehículo fuera del rango, al insertar y al actualizar
begin;
select pg_temp.cmr_preparar();
do $$
declare o uuid := pg_temp.cmr_origen(); v uuid; r text;
begin
  r := pg_temp.cmr_error(format('insert into public.vehiculos (origen_id, titulo, creado_por, atributos) values (%L, %L, %L, %L)',
                               o, 'RG auto', pg_temp.cmr_quien(), '{"rg_anio": 17}'));
  if r <> '22023/atributos.rg_anio: «RG Año» va de 18 a 99.' then raise exception 'vehículo con 17: %', r; end if;
  insert into public.vehiculos (origen_id, titulo, creado_por, atributos) values (o, 'RG auto', pg_temp.cmr_quien(), '{"rg_anio": 50}')
    returning id into v;
  r := pg_temp.cmr_error(format('update public.vehiculos set atributos = %L where id = %L', '{"rg_anio": 17}', v));
  if r <> '22023/atributos.rg_anio: «RG Año» va de 18 a 99.' then raise exception 'actualizar a 17: %', r; end if;
  r := pg_temp.cmr_error(format('update public.vehiculos set atributos = %L where id = %L', '{"rg_anio": 99}', v));
  if r <> 'sin error' then raise exception 'actualizar a 99: %', r; end if;
end $$;
rollback;

-- @test rango: un valor que ya estaba fuera no impide guardar otro campo; cambiarlo sí se valida
begin;
select pg_temp.cmr_preparar();
do $$
declare o uuid := pg_temp.cmr_origen(); l uuid; v uuid; r text;
begin
  -- El 17 entra antes del rango.
  update public.leads_campos set minimo = null, maximo = null where clave = 'rg_edad';
  update public.origenes_campos set minimo = null, maximo = null where origen_id = o and clave = 'rg_anio';
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
    values ('RG viejo', '72719999', pg_temp.cmr_quien(), (select id from public.origenes_lead where clave = 'web'), '{"rg_edad": 17}')
    returning id into l;
  insert into public.vehiculos (origen_id, titulo, creado_por, atributos)
    values (o, 'RG viejo', pg_temp.cmr_quien(), '{"rg_anio": 17, "rg_nota": "a"}') returning id into v;
  update public.leads_campos set minimo = 18, maximo = 99 where clave = 'rg_edad';
  update public.origenes_campos set minimo = 18, maximo = 99 where origen_id = o and clave = 'rg_anio';

  -- Lead: otro atributo cambia y el 17 queda.
  r := pg_temp.cmr_error(format('update public.leads set atributos = atributos || %L where id = %L', '{"rg_otro": "x"}', l));
  if r like '%rg_edad%' then raise exception 'lead: el 17 que ya estaba impidió guardar: %', r; end if;
  r := pg_temp.cmr_error(format('update public.leads set nombre = %L, atributos = atributos where id = %L', 'RG viejo 2', l));
  if r <> 'sin error' then raise exception 'lead: guardar sin cambiar el 17: %', r; end if;
  r := pg_temp.cmr_error(format('update public.leads set atributos = atributos || %L where id = %L', '{"rg_edad": 16}', l));
  if r <> '22023/atributos.rg_edad: «RG Edad» va de 18 a 99.' then raise exception 'lead: cambiar a 16: %', r; end if;
  r := pg_temp.cmr_error(format('update public.leads set atributos = atributos || %L where id = %L', '{"rg_edad": 50}', l));
  if r <> 'sin error' then raise exception 'lead: cambiar a 50: %', r; end if;

  -- Vehículo: igual.
  r := pg_temp.cmr_error(format('update public.vehiculos set atributos = atributos || %L where id = %L', '{"rg_nota": "b"}', v));
  if r <> 'sin error' then raise exception 'vehículo: el 17 que ya estaba impidió guardar: %', r; end if;
  r := pg_temp.cmr_error(format('update public.vehiculos set atributos = atributos || %L where id = %L', '{"rg_anio": 16}', v));
  if r <> '22023/atributos.rg_anio: «RG Año» va de 18 a 99.' then raise exception 'vehículo: cambiar a 16: %', r; end if;
  r := pg_temp.cmr_error(format('update public.vehiculos set atributos = atributos || %L where id = %L', '{"rg_anio": 50}', v));
  if r <> 'sin error' then raise exception 'vehículo: cambiar a 50: %', r; end if;
end $$;
rollback;

-- @test rango: los checks de la tabla (mínimo ≤ máximo; sólo número o monto)
begin;
select pg_temp.cmr_preparar();
do $$
declare o uuid := pg_temp.cmr_origen(); r text;
begin
  r := pg_temp.cmr_error($q$update public.leads_campos set minimo = 10, maximo = 5 where clave = 'rg_edad'$q$);
  if r not like '23514%' then raise exception 'lead: mínimo > máximo: %', r; end if;
  r := pg_temp.cmr_error(format($q$update public.origenes_campos set minimo = 10, maximo = 5 where origen_id = %L and clave = 'rg_anio'$q$, o));
  if r not like '23514%' then raise exception 'vehículo: mínimo > máximo: %', r; end if;
  r := pg_temp.cmr_error($q$update public.leads_campos set minimo = 5, maximo = 5 where clave = 'rg_edad'$q$);
  if r <> 'sin error' then raise exception 'lead: mínimo = máximo: %', r; end if;
  r := pg_temp.cmr_error($q$insert into public.leads_campos (clave, etiqueta, tipo, minimo) values ('rg_texto', 'RG Texto', 'texto', 1)$q$);
  if r not like '23514%' then raise exception 'lead: mínimo en un texto: %', r; end if;
  r := pg_temp.cmr_error(format($q$update public.origenes_campos set maximo = 1 where origen_id = %L and clave = 'rg_nota'$q$, o));
  if r not like '23514%' then raise exception 'vehículo: máximo en un texto: %', r; end if;
  r := pg_temp.cmr_error($q$insert into public.leads_campos (clave, etiqueta, tipo, minimo) values ('rg_monto', 'RG Monto', 'moneda', 0)$q$);
  if r <> 'sin error' then raise exception 'lead: mínimo en un monto: %', r; end if;
end $$;
rollback;
