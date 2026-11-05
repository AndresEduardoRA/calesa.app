-- Siembra de cotizaciones del volumen (paso 4.16-3): la corre `pnpm db:sembrar-volumen` en la misma corrida de `psql`, después de `sembrar.sql`, contra
-- el Supabase LOCAL. Necesita sus leads y vehículos «Volumen» y se niega a correr dos veces. Después de usarla, `pnpm db:reset`.
--
--   50.000 cotizaciones «Volumen cotización g», fijas (sea cual sea `--leads`, como los vehículos), como los leads: la dueña 2/5 (20.000), Ana 1/25 (2.000)
--   y los cuatro asesores el resto (7.000 cada uno), entreverados en el tiempo.
--   lead        el 90 %, un lead vivo «Volumen» de quien la creó: las de la dueña sobre los leads que comparte con Ana son lo ajeno que Ana ve por su cartera
--   vehículo    el 70 %, un vehículo vivo «Volumen», y el origen es el suyo; las demás reparten el origen entre los activos. La fórmula, la publicada del origen
--   clase       el 2 % final (1.000), cada una en un vehículo distinto (`cotizaciones_final_por_vehiculo`) y ninguna en la papelera; el resto, preventa
--   papelera    el 2 % (1.000), con su lote de `tipo` cotizaciones de ≤ 200 del mismo creador, como lo deja `papelera_enviar()`
--   fechas      una cada 10 minutos hacia atrás en orden revuelto (la más vieja, de hace ≈ 347 días), ninguna en el futuro; con 7 días de vigencia, ≈ 2 % vigentes
--   contenido   `valores` y `fuentes` de la fórmula publicada de su origen; versión 1, sin padre ni revisiones
-- Sin `random()` (`scripts/guardas/telefonos-en-pruebas.test.ts`): se revuelve con `(g * 7919) % 50000`, una biyección (7919 es primo y 50.000 sólo tiene los factores 2 y 5).
-- Sin triggers mientras inserta (cada fila auditaría y numeraría). Después, con los triggers, `vehiculos.cotizado_en` lo llena `_vehiculos_cotizado_rellenar()`.
-- No usa las temporales de `sembrar.sql`: `volumen_etiquetas` y `volumen_origenes` siguen vivas en esta sesión; las de acá llevan el prefijo `volumen_cot_`.
\set ON_ERROR_STOP 1
\timing off
begin;
select clock_timestamp() as t0_cot \gset

do $$ begin
  if exists (select 1 from public.cotizaciones where titulo like 'Volumen cotización %') then
    raise exception 'Ya hay cotizaciones sembradas: corre pnpm db:reset antes de volver a sembrar.';
  end if;
  if not exists (select 1 from public.leads where nombre like 'Volumen %' and eliminado_en is null)
     or (select count(*) from public.vehiculos where titulo like 'Volumen %' and eliminado_en is null) < 10000 then
    raise exception 'Faltan los leads o los vehículos «Volumen»: sembrar-cotizaciones.sql corre después de sembrar.sql (pnpm db:sembrar-volumen).';
  end if;
end $$;

-- Los creadores, sus leads vivos (de los que son dueños), los vehículos vivos y los orígenes activos con su fórmula publicada.
create temporary table volumen_cot_personas (k int primary key, id uuid not null) on commit drop;
insert into volumen_cot_personas values (1, '00000000-0000-0000-0000-0000000000b1'), (2, '00000000-0000-0000-0000-0000000000b2'),
  (3, '00000000-0000-0000-0000-0000000000b3'), (4, '00000000-0000-0000-0000-0000000000b4');
create temporary table volumen_cot_leads on commit drop as
  select creado_por as dueno, row_number() over (partition by creado_por order by id) as k, id
    from public.leads where nombre like 'Volumen %' and eliminado_en is null;
create unique index on volumen_cot_leads (dueno, k);
create temporary table volumen_cot_totales on commit drop as select dueno, count(*) as total from volumen_cot_leads group by dueno;
analyze volumen_cot_leads;
create temporary table volumen_cot_vehiculos on commit drop as
  select row_number() over (order by id) as k, id, origen_id from public.vehiculos where titulo like 'Volumen %' and eliminado_en is null;
create unique index on volumen_cot_vehiculos (k);
create temporary table volumen_cot_origenes on commit drop as
  select row_number() over (order by o.orden, o.id) as k, o.id, f.id as formula,
         (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
         coalesce((select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n
                    where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')), '{}') as fuentes
    from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.activo;
do $$ begin
  if exists (select 1 from volumen_cot_vehiculos v where not exists (select 1 from volumen_cot_origenes o where o.id = v.origen_id)) then
    raise exception 'Un origen con vehículos sembrados no tiene fórmula publicada (o no está activo): la cotización no tendría de dónde salir.';
  end if;
  if exists (select 1 from (values ('00000000-0000-0000-0000-0000000000d1'::uuid), ('00000000-0000-0000-0000-0000000000a1'::uuid),
                                   ('00000000-0000-0000-0000-0000000000b1'::uuid), ('00000000-0000-0000-0000-0000000000b2'::uuid),
                                   ('00000000-0000-0000-0000-0000000000b3'::uuid), ('00000000-0000-0000-0000-0000000000b4'::uuid)) p (id)
              where not exists (select 1 from volumen_cot_leads l where l.dueno = p.id)) then
    raise exception 'Una persona de la siembra no tiene leads vivos «Volumen».';
  end if;
end $$;

-- Cada g, con todo lo que lleva. El vehículo de una final sale de (g / 50): 1.000 finales en 1.000 vehículos distintos; el de una preventa, revuelto.
create temporary table volumen_cot on commit drop as
with base as (
  select g, (g::bigint * 7919) % 50000 as r,
         case when g <= 20000 then '00000000-0000-0000-0000-0000000000d1'::uuid
              when g <= 22000 then '00000000-0000-0000-0000-0000000000a1'::uuid
              else (select id from volumen_cot_personas where k = 1 + g % 4) end as creado_por,
         g % 50 = 3 as es_final, g % 50 = 13 as en_papelera,
         case when g % 50 = 3 then 1 + (g / 50) % 10000
              when (g / 10) % 10 < 7 then 1 + (g::bigint * 7919 + 17) % 10000 end as k_vehiculo
    from generate_series(1, 50000) g
)
select b.g, gen_random_uuid() as id, b.creado_por,
       (select l.id from volumen_cot_totales t join volumen_cot_leads l on l.dueno = t.dueno and l.k = 1 + b.r % t.total where t.dueno = b.creado_por) as lead_id,
       v.id as vehiculo_id, coalesce(v.origen_id, (select o.id from volumen_cot_origenes o where o.k = 1 + b.g % (select count(*) from volumen_cot_origenes))) as origen_id,
       (case when b.es_final then 'final' else 'preventa' end)::public.clase_cotizacion as clase, b.en_papelera,
       now() - make_interval(mins => (b.r * 10)::int) as creado_en,
       5000 + (b.r * 7) % 35001 as total_base,
       row_number() over (partition by b.creado_por, b.en_papelera order by b.g) as k_papelera
  from base b left join volumen_cot_vehiculos v on v.k = b.k_vehiculo;
-- El 10 % sin lead (g % 10 = 0).
update volumen_cot set lead_id = null where g % 10 = 0;

-- La papelera: lotes de ≤ 200 del mismo creador, enviados una hora después de la más nueva del lote (nunca en el futuro).
create temporary table volumen_cot_lotes on commit drop as
  select gen_random_uuid() as id, creado_por, (k_papelera - 1) / 200 as lote, count(*) as cantidad,
         least(now(), max(creado_en) + interval '1 hour') as enviado_en
    from volumen_cot where en_papelera group by creado_por, (k_papelera - 1) / 200;
insert into public.lotes_papelera (id, tipo, creado_por, creado_en, resumen, actualizado_en)
select id, 'cotizaciones', creado_por, enviado_en, jsonb_build_object('cantidad', cantidad, 'restaurados', 0, 'purgados', 0), enviado_en
  from volumen_cot_lotes;

set local session_replication_role = replica;
insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, titulo, formula_id, valores, fuentes, tipos_cambio, totales, total_base,
                                 eliminado_en, eliminado_por, lote_papelera_id, creado_en, actualizado_en)
select c.id, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, 'Volumen cotización ' || c.g, o.formula, o.valores, o.fuentes,
       '{"oficial": 6.96, "paralelo": 12.4}', jsonb_build_object('usd', c.total_base), c.total_base,
       lo.enviado_en, case when c.en_papelera then c.creado_por end, lo.id, c.creado_en, coalesce(lo.enviado_en, c.creado_en)
  from volumen_cot c
  join volumen_cot_origenes o on o.id = c.origen_id
  left join volumen_cot_lotes lo on c.en_papelera and lo.creado_por = c.creado_por and lo.lote = (c.k_papelera - 1) / 200;
set local session_replication_role = origin;

-- `vehiculos.cotizado_en`, con los triggers otra vez encendidos: la cotización más nueva de cada vehículo (también las de la papelera).
select public._vehiculos_cotizado_rellenar() as vehiculos_cotizados \gset

-- Lo que la siembra promete, sin RLS. Las FK no se miraron al insertar (`replica`): se miran acá.
do $$
declare v_n int; v_texto text;
begin
  select count(*) into v_n from public.cotizaciones where titulo like 'Volumen cotización %';
  if v_n <> 50000 then raise exception 'esperaba 50.000 cotizaciones sembradas y hay %', v_n; end if;
  select string_agg(format('%s: %s', creado_por, n), ', ') into v_texto
    from (select creado_por, count(*) n from public.cotizaciones where titulo like 'Volumen cotización %' group by creado_por) x
   where (creado_por = '00000000-0000-0000-0000-0000000000d1' and n <> 20000) or (creado_por = '00000000-0000-0000-0000-0000000000a1' and n <> 2000)
      or (creado_por not in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1') and n <> 7000);
  if v_texto is not null then raise exception 'el reparto por persona no es 20.000, 2.000 y 7.000: %', v_texto; end if;
  -- (b) El lead: el 90 %, vivo, «Volumen» y de quien la creó.
  select count(*) into v_n from public.cotizaciones c where c.titulo like 'Volumen cotización %' and c.lead_id is not null;
  if v_n <> 45000 then raise exception 'esperaba 45.000 cotizaciones con lead y hay %', v_n; end if;
  if exists (select 1 from public.cotizaciones c left join public.leads l on l.id = c.lead_id
              where c.titulo like 'Volumen cotización %' and c.lead_id is not null
                and (l.id is null or l.creado_por <> c.creado_por or l.eliminado_en is not null or l.nombre not like 'Volumen %')) then
    raise exception 'una cotización sembrada lleva un lead que no existe, no es de quien la creó o está en la papelera';
  end if;
  select count(*) into v_n from public.cotizaciones c join public.leads_asesores la on la.lead_id = c.lead_id
   where c.titulo like 'Volumen cotización %' and c.creado_por = '00000000-0000-0000-0000-0000000000d1'
     and la.usuario_id = '00000000-0000-0000-0000-0000000000a1' and la.revocado_en is null;
  if v_n < 100 then raise exception 'Ana ve por su cartera % cotizaciones de la dueña: la siembra promete al menos 100', v_n; end if;
  -- (c) El vehículo y el origen; la fórmula, la publicada del origen.
  select count(*) into v_n from public.cotizaciones where titulo like 'Volumen cotización %' and vehiculo_id is not null;
  if v_n not between 34000 and 36000 then raise exception 'esperaba ≈ 35.000 cotizaciones con vehículo (70 %%) y hay %', v_n; end if;
  if exists (select 1 from public.cotizaciones c left join public.vehiculos v on v.id = c.vehiculo_id
              where c.titulo like 'Volumen cotización %' and c.vehiculo_id is not null and (v.id is null or v.origen_id <> c.origen_id or v.eliminado_en is not null)) then
    raise exception 'una cotización sembrada lleva un vehículo que no existe, está en la papelera o es de otro origen';
  end if;
  if exists (select 1 from public.cotizaciones c left join public.formulas f on f.id = c.formula_id
              where c.titulo like 'Volumen cotización %' and (f.id is null or f.origen_id <> c.origen_id or f.estado <> 'publicada')) then
    raise exception 'una cotización sembrada no lleva la fórmula publicada de su origen';
  end if;
  -- (d) Las finales: 1.000, en vehículos distintos, ninguna en la papelera.
  select count(*) into v_n from public.cotizaciones where titulo like 'Volumen cotización %' and clase = 'final';
  if v_n <> 1000 then raise exception 'esperaba 1.000 finales y hay %', v_n; end if;
  if exists (select 1 from public.cotizaciones where titulo like 'Volumen cotización %' and clase = 'final' and (vehiculo_id is null or eliminado_en is not null)) then
    raise exception 'una final sembrada no tiene vehículo o está en la papelera';
  end if;
  if (select count(distinct vehiculo_id) from public.cotizaciones where titulo like 'Volumen cotización %' and clase = 'final') <> 1000 then
    raise exception 'dos finales sembradas comparten vehículo';
  end if;
  -- (e) La papelera: 1.000, cada una con su lote de cotizaciones del mismo creador, enviado a la misma hora que ella.
  select count(*) into v_n from public.cotizaciones where titulo like 'Volumen cotización %' and eliminado_en is not null;
  if v_n <> 1000 then raise exception 'esperaba 1.000 cotizaciones en la papelera y hay %', v_n; end if;
  if exists (select 1 from public.cotizaciones c left join public.lotes_papelera lo on lo.id = c.lote_papelera_id
              where c.titulo like 'Volumen cotización %' and c.eliminado_en is not null
                and (lo.id is null or lo.tipo <> 'cotizaciones' or lo.creado_por <> c.creado_por or c.eliminado_por <> c.creado_por or lo.creado_en <> c.eliminado_en)) then
    raise exception 'una cotización sembrada en la papelera no tiene su lote de cotizaciones del mismo creador';
  end if;
  if exists (select 1 from public.lotes_papelera lo where lo.tipo = 'cotizaciones'
              and (select count(*) from public.cotizaciones c where c.lote_papelera_id = lo.id) not between 1 and 200) then
    raise exception 'un lote de cotizaciones sembrado está vacío o pasa de 200';
  end if;
  -- (f) Las fechas: ninguna en el futuro.
  if exists (select 1 from public.cotizaciones where titulo like 'Volumen cotización %' and (creado_en > now() or actualizado_en > now() or eliminado_en > now())) then
    raise exception 'una cotización sembrada tiene una fecha en el futuro';
  end if;
  -- C3: `cotizado_en`, exactamente en los vehículos cotizados y nunca en el futuro (`medir-panel-ultima-cotizacion.sql` cotiza sus bloques en now() + 1 h).
  if (select count(*) from public.vehiculos where cotizado_en is not null)
     <> (select count(distinct vehiculo_id) from public.cotizaciones where titulo like 'Volumen cotización %') then
    raise exception 'los vehículos con cotizado_en no son exactamente los cotizados por la siembra';
  end if;
  if exists (select 1 from public.vehiculos where cotizado_en > now()) then
    raise exception 'un vehículo quedó con cotizado_en en el futuro';
  end if;
end $$;

select 'sembrado|cotizaciones|' || count(*) from public.cotizaciones where titulo like 'Volumen cotización %';
select 'sembrado|vehiculos_cotizados|' || :'vehiculos_cotizados';
select 'sembrado|cotizaciones_ms|' || round(extract(epoch from clock_timestamp() - :'t0_cot'::timestamptz) * 1000);
commit;
