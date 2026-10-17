-- Siembra de volumen para la 9e (`pnpm db:sembrar-volumen`, contra el Supabase LOCAL). NO corre en la
-- suite ni en `db:reset`: llena la base con decenas de miles de filas para medir y mirar la app con
-- datos reales. Después de usarla, `pnpm db:reset`.
--
-- Cuentas (con contraseña, para entrar por la pantalla): la dueña, Ana (la asesora de la semilla) y
-- cuatro asesores más. Todo lo sembrado lleva el prefijo «Volumen » en el nombre o el título.
--   leads         :n vivos (50.000 por defecto; `pnpm db:sembrar-volumen -- --leads 200000`): dueña 2/5, Ana 1/25 y
--                 el resto entre cuatro asesores (con 50.000: 20.000, 2.000 y 7.000 cada uno); 12.000 más en 60 lotes
--                 de la papelera (dueña)
--   vehiculos     10.000 vivos repartidos entre los orígenes (2.000 de subasta importados sin comprador,
--                 para la limpieza) y 3.000 más en 60 lotes de la papelera
--   seguimientos  200.000, recordatorios 20.000, etiquetas 5.000 asignaciones
--   marcas        tachados 5 %, favoritos 3 %, compartidos con Ana 2 % de los de la dueña
--   embudo        8.000 oportunidades de la dueña en una sola etapa (y 2.000 repartidas), 500 de Ana
--   importaciones 15 de la dueña en las últimas 24 h
-- Los triggers van apagados durante la siembra (cada fila actualizaría a otra): las filas que ellos
-- crearían (la cartera) se insertan a mano. Se niega a correr dos veces.
\set ON_ERROR_STOP 1
\timing off
\if :{?n}
\else
  \set n 50000
\endif
begin;

do $$ begin
  if exists (select 1 from public.leads where nombre like 'Volumen %') then
    raise exception 'Ya hay volumen sembrado: corre pnpm db:reset antes de volver a sembrar.';
  end if;
end $$;

-- --- Las cuentas ------------------------------------------------------------------------------------
create temporary table volumen_personas (n int, id uuid, email text, nombre text, rol text) on commit drop;
insert into volumen_personas values
  (1, '00000000-0000-0000-0000-0000000000d1', 'duena-volumen@ejemplo.com', 'Dueña Volumen', 'dueno'),
  (2, '00000000-0000-0000-0000-0000000000a1', 'ana-volumen@ejemplo.com', 'Ana Volumen', 'asesor'),
  (3, '00000000-0000-0000-0000-0000000000b1', 'berta-volumen@ejemplo.com', 'Berta Volumen', 'asesor'),
  (4, '00000000-0000-0000-0000-0000000000b2', 'carlos-volumen@ejemplo.com', 'Carlos Volumen', 'asesor'),
  (5, '00000000-0000-0000-0000-0000000000b3', 'diana-volumen@ejemplo.com', 'Diana Volumen', 'asesor'),
  (6, '00000000-0000-0000-0000-0000000000b4', 'elias-volumen@ejemplo.com', 'Elías Volumen', 'asesor');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       extensions.crypt('Volumen-9e-clave', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"], "invitado": true}'::jsonb,
       jsonb_build_object('nombre', nombre), now(), now(), '', '', '', ''
  from volumen_personas;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
  from volumen_personas;
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select p.id, r.id, true from volumen_personas p join public.roles r on r.clave = p.rol
on conflict do nothing;
update public.perfiles pf set nombre = p.nombre, invitacion_aceptada_en = now()
  from volumen_personas p where pf.id = p.id;

-- --- Un campo filtrable de los leads, para medir «filtrar por un atributo» -----------------------------
insert into public.leads_campos (clave, etiqueta, tipo, opciones, filtrable, en_tabla, orden, grupo)
values ('ciudad_vol', 'Ciudad', 'opcion',
        '[{"clave":"scz","etiqueta":"Santa Cruz"},{"clave":"lp","etiqueta":"La Paz"},{"clave":"cbba","etiqueta":"Cochabamba"},{"clave":"suc","etiqueta":"Sucre"}]'::jsonb,
        true, true, 90, 'Datos')
on conflict (clave) do nothing;

set local session_replication_role = replica;

-- --- Leads ------------------------------------------------------------------------------------------
-- n global 1..:n: la dueña 2/5, Ana 1/25 y cuatro asesores el resto (con 50.000: 20.000, 2.000 y 7.000 cada uno).
-- creado_en repartido hacia atrás, un lead cada 7 minutos en orden revuelto (con 50.000, el más viejo de hace ~243 días).
create temporary table volumen_leads (n int primary key, id uuid not null, dueno uuid not null) on commit drop;
insert into volumen_leads (n, id, dueno)
select g, gen_random_uuid(),
       case when g <= :n * 2 / 5 then '00000000-0000-0000-0000-0000000000d1'::uuid
            when g <= :n * 2 / 5 + :n / 25 then '00000000-0000-0000-0000-0000000000a1'::uuid
            else (array['00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2',
                        '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4'])[1 + g % 4]::uuid end
  from generate_series(1, :n) g;
-- Los leads de Ana y de la dueña entreverados en el tiempo: el que se mezcla de verdad no es una ráfaga.
insert into public.leads (id, nombre, telefono_principal, creado_por, atributos, creado_en, actualizado_en, origen_lead_id)
select v.id, 'Volumen ' || v.n || ' ' || (array['Pérez', 'Gómez', 'Rojas', 'Suárez', 'Vargas', 'Flores', 'Mamani', 'Quispe'])[1 + v.n % 8],
       (80000000 + v.n)::text, v.dueno,
       jsonb_build_object('ciudad_vol', (array['scz', 'lp', 'cbba', 'suc'])[1 + v.n % 4]),
       now() - make_interval(mins => (((v.n::bigint * 7919) % :n) * 7)::int), now() - make_interval(mins => (((v.n::bigint * 7919) % :n) * 7)::int),
       (select id from public.origenes_lead order by orden, id offset v.n % 5 limit 1)
  from volumen_leads v;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, desde)
select id, dueno, 'dueno', now() from volumen_leads;
-- Compartidos: el 2 % de los de la dueña, con Ana.
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde)
select id, '00000000-0000-0000-0000-0000000000a1', 'compartido', '00000000-0000-0000-0000-0000000000d1', now()
  from volumen_leads where n <= :n * 2 / 5 and n % 50 = 0;

-- Marcas: tachados 5 %, favoritos 3 % de la dueña; los de Ana, sus propias.
insert into public.leads_tachados (lead_id, usuario_id)
select id, dueno from volumen_leads where dueno in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1') and n % 20 = 1;
insert into public.leads_favoritos (lead_id, usuario_id)
select id, dueno from volumen_leads where dueno in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1') and n % 33 = 2;

-- Etiquetas: 12 de la dueña y 12 de Ana, ~5.000 asignaciones.
insert into public.etiquetas (id, usuario_id, nombre, color)
select gen_random_uuid(), p.id, 'Vol ' || k, (array['gris', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'violeta'])[1 + k % 8]
  from (values ('00000000-0000-0000-0000-0000000000d1'::uuid), ('00000000-0000-0000-0000-0000000000a1'::uuid)) p (id),
       generate_series(1, 12) k;
create temporary table volumen_etiquetas as
  select id, usuario_id, row_number() over (partition by usuario_id order by nombre) as k from public.etiquetas where nombre like 'Vol %';
insert into public.leads_etiquetas (lead_id, etiqueta_id)
select l.id, e.id
  from volumen_leads l join volumen_etiquetas e on e.usuario_id = l.dueno and e.k = 1 + l.n % 12
 where l.dueno in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1') and l.n % 5 in (1, 2)
   and l.n <= :n / 4
on conflict do nothing;

-- --- Seguimientos (200.000) y recordatorios (20.000) -----------------------------------------------------
-- Cada seguimiento lo escribe el dueño del lead. Los leads de la dueña (y de Ana) concentran muchos.
insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto, visibilidad, ocurrido_en, creado_en, actualizado_en)
select l.id, l.dueno, (select id from public.tipos_seguimiento order by orden, id offset g % 6 limit 1),
       'Volumen seguimiento ' || g, 'Habló del vehículo y quedó en volver a llamar, nota ' || g,
       case when g % 5 = 0 then 'publico'::public.visibilidad_seguimiento else 'privado' end,
       now() - make_interval(mins => g * 3), now() - make_interval(mins => g * 3), now() - make_interval(mins => g * 3)
  from generate_series(1, 200000) g
  join volumen_leads l on l.n = 1 + (g * 7) % (:n * 2 / 5 + :n / 25);
update public.leads l set ultimo_seguimiento_en = s.ultimo
  from (select lead_id, max(ocurrido_en) ultimo from public.seguimientos where titulo like 'Volumen seguimiento %' group by lead_id) s
 where s.lead_id = l.id;
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, completado_en)
select l.dueno, l.id, 'Volumen recordatorio ' || g,
       case when g % 3 = 0 then now() - make_interval(hours => g % 700) else now() + make_interval(hours => 1 + g % 900) end,
       case when g % 3 = 1 then now() - make_interval(hours => g % 900) end
  from generate_series(1, 20000) g
  join volumen_leads l on l.n = 1 + (g * 11) % (:n * 2 / 5 + :n / 25);

-- --- Embudo: 8.000 oportunidades de la dueña en una sola etapa ------------------------------------------
do $$ declare v_u uuid; v_emb uuid; v_etapas uuid[]; begin
  foreach v_u in array array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1']::uuid[] loop
    v_emb := public._embudo_defecto_de(v_u);
    select array_agg(id order by orden) into v_etapas from public.embudos_etapas where embudo_id = v_emb;
    insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, monto_estimado, moneda, ultima_actividad_en)
    select l.id, v_u, v_emb,
           case when v_u = '00000000-0000-0000-0000-0000000000d1'::uuid and g <= 8000 then v_etapas[2]
                else v_etapas[1 + g % array_length(v_etapas, 1)] end,
           'Volumen oportunidad ' || g, 1000 + g, 'USD', now() - make_interval(mins => g * 5)
      from generate_series(1, case when v_u = '00000000-0000-0000-0000-0000000000d1'::uuid then 10000 else 500 end) g
      join volumen_leads l on l.dueno = v_u
       and l.n = (select min(n) from volumen_leads where dueno = v_u) + (g * 13) % (case when v_u = '00000000-0000-0000-0000-0000000000d1'::uuid then 20000 else 2000 end);
  end loop;
end $$;

-- --- Papelera de leads: 60 lotes de 200 (dueña) ----------------------------------------------------------
create temporary table volumen_lotes (k int primary key, id uuid not null, id_v uuid not null) on commit drop;
insert into volumen_lotes select k, gen_random_uuid(), gen_random_uuid() from generate_series(1, 60) k;
insert into public.lotes_papelera (id, tipo, creado_por, creado_en, resumen, actualizado_en)
select id, 'leads', '00000000-0000-0000-0000-0000000000d1', now() - make_interval(hours => k * 6),
       jsonb_build_object('cantidad', 200, 'restaurados', 0, 'purgados', 0), now() - make_interval(hours => k * 6)
  from volumen_lotes;
insert into public.leads (nombre, telefono_principal, creado_por, creado_en, eliminado_en, eliminado_por, lote_papelera_id)
select 'Volumen borrado ' || (lo.k * 1000 + j), (90000000 + lo.k * 1000 + j)::text, '00000000-0000-0000-0000-0000000000d1',
       now() - make_interval(days => 60), now() - make_interval(hours => lo.k * 6), '00000000-0000-0000-0000-0000000000d1', lo.id
  from volumen_lotes lo cross join generate_series(1, 200) j;

-- --- Vehículos: 10.000 vivos y 3.000 en 60 lotes ---------------------------------------------------------
create temporary table volumen_origenes as
  select id, tipo, row_number() over (order by orden, id) k, count(*) over () total from public.origenes where activo;
insert into public.vehiculos (origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, precio, atributos, estado_subasta,
                              subasta_en, subasta_fin_en, apibara_sync_en, importado_apibara, creado_por, creado_en, actualizado_en)
select o.id, 'Volumen ' || (2000 + g % 25) || ' ' || (array['Toyota', 'Nissan', 'Ford', 'Kia', 'Honda'])[1 + g % 5] || ' ' || g,
       (array['Toyota', 'Nissan', 'Ford', 'Kia', 'Honda'])[1 + g % 5], 'Modelo ' || g % 40, 2000 + g % 25,
       'V' || lpad(g::text, 16, '0'), 'L' || g, case when o.tipo = 'subasta' then (array['copart', 'iaai'])[1 + g % 2] end,
       5000 + g % 30000, '{}'::jsonb,
       case when o.tipo = 'subasta' and g % 5 = 0 then 'terminada'::public.estado_subasta end,
       case when o.tipo = 'subasta' and g % 5 = 0 then now() - make_interval(days => 20 + g % 200) end,
       case when o.tipo = 'subasta' and g % 5 = 0 then now() - make_interval(days => 20 + g % 200) end,
       case when o.tipo = 'subasta' and g % 5 = 0 then now() - make_interval(days => 20 + g % 200) end,
       o.tipo = 'subasta' and g % 5 = 0,
       '00000000-0000-0000-0000-0000000000d1', now() - make_interval(mins => g * 11), now() - make_interval(mins => g * 11)
  from generate_series(1, 10000) g
  join volumen_origenes o on o.k = 1 + g % (select max(total) from volumen_origenes);
insert into public.lotes_papelera (id, tipo, creado_por, creado_en, resumen, actualizado_en)
select id_v, 'vehiculos', '00000000-0000-0000-0000-0000000000d1', now() - make_interval(hours => k * 6),
       jsonb_build_object('cantidad', 50, 'restaurados', 0, 'purgados', 0), now() - make_interval(hours => k * 6)
  from volumen_lotes;
insert into public.vehiculos (origen_id, titulo, anio, vin, lote, creado_por, creado_en, eliminado_en, eliminado_por, lote_papelera_id)
select (select id from volumen_origenes order by k limit 1), 'Volumen borrado ' || (lo.k * 100 + j), 2010 + j % 10,
       'W' || lpad((lo.k * 100 + j)::text, 16, '0'), 'LB' || (lo.k * 100 + j), '00000000-0000-0000-0000-0000000000d1',
       now() - make_interval(days => 60), now() - make_interval(hours => lo.k * 6), '00000000-0000-0000-0000-0000000000d1', lo.id_v
  from volumen_lotes lo cross join generate_series(1, 50) j;

-- --- Importaciones recientes de la dueña -----------------------------------------------------------------
insert into public.importaciones (id, usuario_id, entidad, estado, filas_total, filas_ok, iniciada_en, terminada_en, creado_en)
select gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', 'leads', 'terminada', 100, 100,
       now() - make_interval(hours => k), now() - make_interval(hours => k), now() - make_interval(hours => k)
  from generate_series(1, 15) k;
insert into public.importaciones_leads (importacion_id, lead_id, fila)
select i.id, l.id, j
  from (select id, row_number() over (order by creado_en) k from public.importaciones where entidad = 'leads' and usuario_id = '00000000-0000-0000-0000-0000000000d1') i
       cross join generate_series(1, 100) j
  join volumen_leads l on l.n = 18000 + (i.k - 1) * 100 + j;

-- La cartera y los atributos públicos (9h) los mantienen triggers, apagados acá: se calculan como el relleno.
update public.leads l set cartera = public._lead_cartera_calcular(l.id), atributos_publicos = public._lead_atributos_publicos(l.atributos)
 where l.nombre like 'Volumen %';

set local session_replication_role = origin;

-- Se insertó con los triggers apagados: la numeración (9f-2) se hace como la migración para lo que ya existía.
-- Es el backfill con 62.000 leads: se dice cuánto tarda.
select clock_timestamp() as t0 \gset
select public._leads_numerar_existentes();
select 'sembrado|numerar_existentes_ms|' || round(extract(epoch from clock_timestamp() - :'t0'::timestamptz) * 1000);
commit;

-- `vacuum` y no sólo `analyze`: la numeración reescribe los 62.000 leads y deja el mapa de visibilidad vacío, y sin él
-- los index-only scans van a la tabla (el conteo de exportar pasaba de 206 a 818 ms). Es el estado de una base en uso.
vacuum analyze public.leads;
vacuum analyze public.leads_numeros_globales;
vacuum analyze public.leads_numeros_propios;
analyze public.leads_asesores;
analyze public.leads_tachados;
analyze public.leads_favoritos;
analyze public.leads_etiquetas;
analyze public.etiquetas;
analyze public.seguimientos;
analyze public.recordatorios;
analyze public.oportunidades;
analyze public.vehiculos;
analyze public.lotes_papelera;
analyze public.importaciones;
analyze public.importaciones_leads;
select 'sembrado|leads|' || count(*) from public.leads where nombre like 'Volumen %';
