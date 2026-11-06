-- 4.15-7 (4-87): la papelera de cotizaciones tiene su propia clave, `cotizaciones.papelera.purgar`. Hasta acá la gobernaba `vehiculos.papelera.purgar`.
-- La clave la reciben el dueño y todo rol que hoy tenga la de vehículos (en cualquier origen o alcance): nadie gana ni pierde nada de lo que podía en la
-- papelera de cotizaciones. Desde acá se separan. Las tres genéricas y la rama de cotizaciones de la policy `lotes_papelera: leer` piden la nueva; nada más cambia.
-- La prueba: `supabase/tests/cotizaciones-papelera-permiso.sql` (vuelve a ejecutar este archivo: si se recrea con otra fecha, se corrige su ruta en
-- `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`) y el bloque de la policy en `humo.sql`.

-- ---------------------------------------------------------------------------------------------------
-- La clave (la misma fila que `seed.sql`) y el texto de la de vehículos, que ya no habla de cotizaciones.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('cotizaciones.papelera.purgar', 'cotizaciones', 'Vaciar la papelera de cotizaciones', 'Ver toda la papelera de cotizaciones, restaurar y purgar antes de tiempo',
   false, false, 'papelera_* (cotizaciones), policy lotes_papelera', 245)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

update public.permisos
   set nombre = 'Vaciar la papelera de vehículos',
       descripcion = 'Ver toda la papelera de vehículos, restaurar y purgar antes de tiempo',
       aplicado_en = 'vehiculos_papelera_*, policy lotes_papelera'
 where clave = 'vehiculos.papelera.purgar';

-- ---------------------------------------------------------------------------------------------------
-- A quién: el dueño y todo rol con alguna concesión de la de vehículos, con «todos» y sin origen. En un reset local (las migraciones corren antes del seed)
-- no hay roles todavía: el seed se la da al dueño con su `cross join`.
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_nuevos text;
begin
  with concedidos as (
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, 'cotizaciones.papelera.purgar', 'todos'::public.alcance_permiso
      from public.roles r
     where r.clave = 'dueno'
        or exists (select 1 from public.roles_permisos x where x.rol_id = r.id and x.permiso_clave = 'vehiculos.papelera.purgar')
    on conflict do nothing
    returning rol_id)
  select string_agg(r.clave, ', ' order by r.clave) into v_nuevos from concedidos c join public.roles r on r.id = c.rol_id;
  raise notice 'cotizaciones.papelera.purgar concedido a los roles: %', coalesce(v_nuevos, '(ninguno nuevo)');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Las tres genéricas: la definición de la base con la clave cambiada (mismas firmas, cuerpos, mensajes y códigos).
-- ---------------------------------------------------------------------------------------------------
create or replace function public.papelera_listar(p_tipo public.tipo_lote_papelera)
returns table (registro_id uuid, titulo text, borrado_en timestamptz, borrado_por uuid, lote_id uuid, purga_el timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare v_dias int;
begin
  perform public.assert_activo();
  perform public._papelera_solo_cotizaciones(p_tipo);
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  return query select c.id, coalesce(c.titulo, 'Cotización #' || c.numero), c.eliminado_en, c.eliminado_por, c.lote_papelera_id, c.eliminado_en + make_interval(days => v_dias)
    from public.cotizaciones c where c.eliminado_en is not null and (c.eliminado_por = (select auth.uid()) or public.tiene_permiso('cotizaciones.papelera.purgar'));
end;
$$;

create or replace function public.papelera_purgar(p_lote uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_tipo public.tipo_lote_papelera; n int := 0;
begin
  if (select auth.uid()) is not null and not public.tiene_permiso('cotizaciones.papelera.purgar') then raise exception 'Sin permiso para purgar.' using errcode = '42501'; end if;
  select tipo into v_tipo from public.lotes_papelera where id = p_lote and purgado_en is null and restaurado_en is null;
  if not found then return 0; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  insert into public.cola_gc_storage (bucket, ruta) select 'cotizaciones', a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id where c.lote_papelera_id = p_lote on conflict do nothing;
  delete from public.cotizaciones where lote_papelera_id = p_lote;
  get diagnostics n = row_count;
  update public.lotes_papelera set purgado_en = now() where id = p_lote;
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

create or replace function public.papelera_restaurar(p_lote uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_tipo public.tipo_lote_papelera; v_por uuid; n int := 0;
begin
  perform public.assert_activo();
  select tipo, creado_por into v_tipo, v_por from public.lotes_papelera where id = p_lote and purgado_en is null;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  if v_por <> (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then raise exception 'Sólo quien lo envió (o quien purga) lo restaura.' using errcode = '42501'; end if;
  update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  get diagnostics n = row_count;
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = (select auth.uid()) where id = p_lote;
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

-- `create or replace` conserva los privilegios de la base; se repiten explícitos (redundante a propósito).
revoke all on function public.papelera_listar(public.tipo_lote_papelera) from public, anon;
revoke all on function public.papelera_purgar(uuid) from public, anon;
revoke all on function public.papelera_restaurar(uuid) from public, anon;
grant execute on function public.papelera_listar(public.tipo_lote_papelera) to authenticated, service_role;
grant execute on function public.papelera_purgar(uuid) to authenticated, service_role;
grant execute on function public.papelera_restaurar(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- La policy: lo propio siempre; un lote ajeno, con la clave de su tipo. La misma forma de hoy (un `tiene_permiso` por fila, con `case` sobre el tipo), con las tres ramas explícitas.
-- ---------------------------------------------------------------------------------------------------
alter policy "lotes_papelera: leer" on public.lotes_papelera
  using ((creado_por = (select auth.uid())) or (select public.tiene_permiso(
    case lotes_papelera.tipo
      when 'cotizaciones'::public.tipo_lote_papelera then 'cotizaciones.papelera.purgar'::text
      when 'leads'::public.tipo_lote_papelera then 'leads.papelera.purgar'::text
      when 'vehiculos'::public.tipo_lote_papelera then 'vehiculos.papelera.purgar'::text
    end)));
