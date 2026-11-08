-- Comprobantes: la serie vigente, emitir y anular con numeración sin huecos (paso 4.26-1; decisiones P1–P7 a de la persona, 2026-11-08).
--
-- La base traía `comprobante_emitir(cotización, serie, datos)` y `comprobante_anular(id, motivo)` sin mirar la cotización: quien tenía la clave emitía sobre
-- una cotización que no veía, elegía la serie y escribía en `datos` lo que quisiera (incluso costos que después lee quien ve la cotización); anular sobre uno
-- ya anulado no hacía nada en silencio. Ahora:
--   C1. La serie vigente vive en una fila propia (`comprobantes_ajustes`, una por empresa): «A» por omisión, o la del último emitido.
--   C2. `comprobantes_serie_cambiar(serie, versión)` la cambia con `empresa.ajustes.gestionar` (P1 a), con formato de P6 a, y crea su contador.
--   C4. `comprobante_emitir(cotización, versión de la cotización)`: ni la serie ni `datos` vienen del cliente. Pide ver la cotización (antes y con la fila
--       tomada), que sea final activa y la versión que se tenía en pantalla. Candados: cotización → `comprobantes_ajustes` → contador.
--   C5. `datos` sólo con lo del nivel «todos», sea quien sea el que emite; del cliente y del vehículo, sólo los ids (P4 a: quien ve la cotización y no el
--       lead no lee su nombre).
--   C6. Un vigente (sin anular) por cotización (P2 a): índice único parcial; la segunda emisión da PT409 sin consumir número.
--   C7. Sin huecos: el contador es una fila (`update … returning`), nunca una sequence; el `update` y el `insert` van en un solo bloque, así un PT409
--       atrapado por quien llama ya revirtió el número.
--   C8. `comprobante_anular` devuelve jsonb, pide ver la cotización y un motivo de hasta 500, y da PT409 si ya estaba anulado. Anula quien emite (P5 a).
-- Pruebas: `supabase/tests/areas/comprobantes/` (emitir, anular, serie y las carreras).

-- C1. La serie vigente.
create table public.comprobantes_ajustes (
  unica boolean primary key default true check (unica),
  serie text not null references public.comprobantes_contadores (serie),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
comment on table public.comprobantes_ajustes is 'La serie vigente de los comprobantes: una fila por empresa (unica = true). Se cambia sólo con comprobantes_serie_cambiar (empresa.ajustes.gestionar, con versión); comprobante_emitir la toma for update antes del contador. docs/GLOSARIO.md › «Serie de comprobantes».';
create index comprobantes_ajustes_serie_idx on public.comprobantes_ajustes (serie);
create index comprobantes_ajustes_actualizado_por_idx on public.comprobantes_ajustes (actualizado_por);

alter table public.comprobantes_ajustes enable row level security;
revoke all on table public.comprobantes_ajustes from anon, authenticated;
grant select on table public.comprobantes_ajustes to authenticated;
grant all on table public.comprobantes_ajustes to service_role;
create policy "comprobantes_ajustes: leer" on public.comprobantes_ajustes for select to authenticated
  using ((select public.tiene_permiso('cotizaciones.comprobantes.emitir')) or (select public.tiene_permiso('empresa.ajustes.gestionar')));

-- Los contadores los lee también quien configura la serie (la pestaña de Empresa muestra el próximo número).
drop policy "comprobantes_contadores: leer" on public.comprobantes_contadores;
create policy "comprobantes_contadores: leer" on public.comprobantes_contadores for select to authenticated
  using ((select public.tiene_permiso('cotizaciones.comprobantes.emitir')) or (select public.tiene_permiso('empresa.ajustes.gestionar')));

insert into public.comprobantes_contadores (serie, ultimo) values ('A', 0) on conflict do nothing;
insert into public.comprobantes_ajustes (serie)
  values (coalesce((select cp.serie from public.comprobantes cp order by cp.emitido_en desc, cp.numero desc limit 1), 'A'));

-- C6. Un vigente por cotización.
create unique index comprobantes_un_vigente_por_cotizacion on public.comprobantes (cotizacion_id) where anulado_en is null;

-- C2. Cambiar la serie vigente.
create function public.comprobantes_serie_cambiar(p_serie text, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_serie text; a public.comprobantes_ajustes; v_antes text; v_siguiente bigint;
begin
  perform public.assert_activo();
  perform public.assert_permiso('empresa.ajustes.gestionar');
  v_serie := upper(btrim(coalesce(p_serie, '')));
  if not (v_serie collate "C" ~ '^[A-Z0-9-]{1,12}$') then
    raise exception 'La serie lleva de 1 a 12 letras, números o guiones.' using errcode = '22023', hint = 'serie';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  select * into a from public.comprobantes_ajustes x where x.unica for update;
  if a.actualizado_en is distinct from p_actualizado_en_esperado then
    raise exception 'La serie cambió mientras la editabas. Recarga para ver la vigente.' using errcode = 'PT409';
  end if;
  insert into public.comprobantes_contadores (serie, ultimo) values (v_serie, 0) on conflict do nothing;
  if v_serie is distinct from a.serie then
    v_antes := a.serie;
    update public.comprobantes_ajustes x
       set serie = v_serie, actualizado_en = greatest(clock_timestamp(), a.actualizado_en + interval '1 microsecond'), actualizado_por = (select auth.uid())
     where x.unica
    returning * into a;
    perform public.registrar_actividad('comprobante.serie_cambiada', 'comprobantes_ajustes', 'unica',
      jsonb_build_object('serie', v_antes), jsonb_build_object('serie', v_serie));
  end if;
  select k.ultimo + 1 into v_siguiente from public.comprobantes_contadores k where k.serie = a.serie;
  return jsonb_build_object('serie', a.serie, 'siguiente', v_siguiente, 'actualizado_en', a.actualizado_en);
end;
$$;
comment on function public.comprobantes_serie_cambiar(text, timestamptz) is 'Cambia la serie vigente de los comprobantes (4.26-1): empresa.ajustes.gestionar; la serie se guarda en mayúsculas, de 1 a 12 letras A–Z, números o guiones (si no, 22023 con hint serie); versión nula 22023, distinta PT409. Crea el contador de la serie si no existe (una nueva empieza en 1; volver a una usada sigue su numeración). Devuelve {serie, siguiente, actualizado_en}.';
revoke all on function public.comprobantes_serie_cambiar(text, timestamptz) from public, anon;
grant execute on function public.comprobantes_serie_cambiar(text, timestamptz) to authenticated, service_role;

-- C4, C5, C7. Emitir.
drop function public.comprobante_emitir(uuid, text, jsonb);
create function public.comprobante_emitir(p_cotizacion uuid, p_cotizacion_esperada timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c public.cotizaciones; v_def jsonb; v_vis jsonb; v_ctx jsonb; v_rec jsonb; v_datos jsonb; v_serie text; v_numero bigint; v_id uuid; v_emitido timestamptz;
  v_vigente text; v_restriccion text;
begin
  -- 1. La clave.
  perform public.assert_activo();
  perform public.assert_permiso('cotizaciones.comprobantes.emitir');
  -- 2. Sin candado: lo que no existe, está en la papelera o no se ve da lo mismo, antes de tomar nada.
  perform 1 from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- 3. La fila viva, tomada (como `_cotizacion_a_papelera` y marcar final: no choca con las hijas que la referencian).
  select * into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null for no key update;
  if not found or not public.puede_cotizacion(c.id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- 4. Sobre la fila tomada: final activa.
  if c.clase <> 'final' or c.estado <> 'activa' then
    raise exception 'Sólo se emite comprobante de una cotización final activa.' using errcode = '23514';
  end if;
  -- 5. Lo que se congela es lo que quien emite tenía en pantalla.
  if p_cotizacion_esperada is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if c.actualizado_en is distinct from p_cotizacion_esperada then
    perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
  end if;
  -- 6. Un vigente por cotización (P2 a).
  select cp.serie || '-' || cp.numero into v_vigente from public.comprobantes cp where cp.cotizacion_id = c.id and cp.anulado_en is null;
  if v_vigente is not null then
    raise exception 'Esta cotización ya tiene el comprobante «%» vigente: anúlalo para emitir otro.', v_vigente using errcode = 'PT409';
  end if;
  -- 7. `datos`, antes de tomar la serie: sólo lo del nivel «todos» (el recorte de quien sólo tiene cotizaciones.ver), y del cliente y el vehículo, los ids.
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = c.formula_id;
  v_ctx := public._cotizacion_contexto(coalesce(array(select e.key from jsonb_each(v_vis) e where e.value ->> 'ver' = 'todos'), '{}'), v_def, v_vis);
  v_rec := public._cotizacion_recorte(jsonb_build_object('valores', c.valores, 'fuentes', c.fuentes, 'totales', c.totales, 'tipos_cambio', c.tipos_cambio), v_ctx);
  v_datos := jsonb_build_object(
    'version', 1,
    'cotizacion', jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'clase', c.clase),
    'origen', (select jsonb_build_object('id', o.id, 'nombre', o.nombre) from public.origenes o where o.id = c.origen_id),
    'formula_id', c.formula_id,
    'cliente', jsonb_build_object('lead_id', c.lead_id),
    'vehiculo', case when c.vehiculo_id is null then null else jsonb_build_object('id', c.vehiculo_id) end,
    'empresa', (select jsonb_build_object('razon_social', e.razon_social, 'nit', e.nit) from public.ajustes_empresa e where e.id = 1),
    'valores', coalesce(v_rec -> 'valores', '{}'::jsonb),
    'totales', coalesce(v_rec -> 'totales', '{}'::jsonb),
    'tipos_cambio', coalesce(v_rec -> 'tipos_cambio', '{}'::jsonb),
    'etiquetas', coalesce((select jsonb_object_agg(n ->> 'id', n ->> 'etiqueta') from jsonb_array_elements(coalesce(v_def -> 'nodos', '[]'::jsonb)) n
                            where coalesce(v_rec -> 'valores', '{}'::jsonb) ? (n ->> 'id')), '{}'::jsonb));
  -- 8. La serie vigente, tomada (ordena contra comprobantes_serie_cambiar).
  select a.serie into v_serie from public.comprobantes_ajustes a where a.unica for update;
  if v_serie is null then
    raise exception 'No hay una serie vigente de comprobantes.' using errcode = 'P0001';
  end if;
  -- 9. El número y el comprobante en un solo bloque: si sale un error, la subtransacción ya devolvió el número aunque quien llama lo atrape.
  begin
    update public.comprobantes_contadores k set ultimo = k.ultimo + 1 where k.serie = v_serie returning k.ultimo into v_numero;
    if not found then
      raise exception 'No hay contador para la serie vigente.' using errcode = 'P0001';
    end if;
    insert into public.comprobantes (cotizacion_id, serie, numero, datos, emitido_por)
    values (c.id, v_serie, v_numero, v_datos, (select auth.uid()))
    returning id, emitido_en into v_id, v_emitido;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'comprobantes_un_vigente_por_cotizacion' then
      raise exception 'Esta cotización ya tiene un comprobante vigente: anúlalo para emitir otro.' using errcode = 'PT409';
    end if;
    raise;
  end;
  -- 10. La actividad y la respuesta.
  perform public.registrar_actividad('comprobante.emitido', 'comprobantes', v_id::text, null, jsonb_build_object('serie', v_serie, 'numero', v_numero));
  return jsonb_build_object('id', v_id, 'serie', v_serie, 'numero', v_numero, 'emitido_en', v_emitido);
end;
$$;
comment on function public.comprobante_emitir(uuid, timestamptz) is 'Emite el comprobante de una cotización final activa en la serie vigente (4.26-1): cotizaciones.comprobantes.emitir; ver la cotización antes y con la fila tomada (si no, el 42501 de lo inexistente); la versión que se tenía en pantalla (nula 22023, distinta PT409); un vigente por cotización (PT409). datos = el recorte del nivel «todos» con sus etiquetas, la cotización, el origen, los ids del cliente y del vehículo, y la razón social y el NIT. Candados: cotización → comprobantes_ajustes → contador; sin huecos. Devuelve {id, serie, numero, emitido_en}.';
revoke all on function public.comprobante_emitir(uuid, timestamptz) from public, anon;
grant execute on function public.comprobante_emitir(uuid, timestamptz) to authenticated, service_role;

-- C8. Anular.
drop function public.comprobante_anular(uuid, text);
create function public.comprobante_anular(p_comprobante uuid, p_motivo text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_cot uuid; v_motivo text; k public.comprobantes; v_en timestamptz;
begin
  perform public.assert_activo();
  perform public.assert_permiso('cotizaciones.comprobantes.emitir');
  -- Sin candado: el que no existe y el de una cotización que no se ve dan lo mismo.
  select cp.cotizacion_id into v_cot from public.comprobantes cp where cp.id = p_comprobante;
  if v_cot is null or not public.puede_cotizacion(v_cot, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a este comprobante.' using errcode = '42501';
  end if;
  v_motivo := btrim(coalesce(p_motivo, ''));
  if v_motivo = '' or char_length(v_motivo) > 500 then
    raise exception 'Anular pide un motivo de hasta 500 caracteres.' using errcode = '22023', hint = 'motivo';
  end if;
  select * into k from public.comprobantes cp where cp.id = p_comprobante for no key update;
  if k.anulado_en is not null then
    raise exception 'Este comprobante ya estaba anulado.' using errcode = 'PT409';
  end if;
  update public.comprobantes cp set anulado_por = (select auth.uid()), anulado_en = now(), motivo_anulacion = v_motivo
   where cp.id = k.id
  returning cp.anulado_en into v_en;
  perform public.registrar_actividad('comprobante.anulado', 'comprobantes', k.id::text, null, jsonb_build_object('serie', k.serie, 'numero', k.numero));
  return jsonb_build_object('id', k.id, 'anulado_en', v_en);
end;
$$;
comment on function public.comprobante_anular(uuid, text) is 'Anula un comprobante (4.26-1): cotizaciones.comprobantes.emitir (P5 a); ver su cotización (si no, 42501); motivo de 1 a 500 caracteres (22023, hint motivo); uno ya anulado da PT409. El número no vuelve: la serie sigue. Devuelve {id, anulado_en}.';
revoke all on function public.comprobante_anular(uuid, text) from public, anon;
grant execute on function public.comprobante_anular(uuid, text) to authenticated, service_role;

-- C9. Dónde se aplica cada clave (el seed repite lo mismo: corre después en `db reset`).
update public.permisos set aplicado_en = 'comprobante_emitir, comprobante_anular, policy comprobantes_ajustes: leer, policy comprobantes_contadores: leer'
 where clave = 'cotizaciones.comprobantes.emitir';
update public.permisos set aplicado_en = aplicado_en || ', comprobantes_serie_cambiar, policy comprobantes_ajustes: leer, policy comprobantes_contadores: leer'
 where clave = 'empresa.ajustes.gestionar' and aplicado_en not like '%comprobantes_serie_cambiar%';
