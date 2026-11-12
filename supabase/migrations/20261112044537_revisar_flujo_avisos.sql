-- «Revisar» un flujo (paso 5.12-1): `revisar_flujo()` desde su definición vigente (base.sql, `language sql`, sin permiso), misma firma.
--
--   C1. Sólo responde a quien configura ese flujo (`puede_configurar_flujo`): a los demás, a un flujo inexistente o nulo, cero filas y
--       sin error. Antes cualquier `authenticated` leía los nombres de fases de cualquier flujo. Pasa a plpgsql para cortar antes.
--   C2. Los ocho códigos de antes quedan iguales (condición, nivel, texto y fase).
--   C3–C4. `rol_sin_personas` (aviso): una fase activa, o una salida entre fases activas, limitada a roles donde ninguno tiene una persona
--       activa (`activo and not bloqueado`; una invitación sin aceptar cuenta). Una fila por fase o por salida (con la fase de salida).
--   C5. `entrada_no_automatica` (info, sólo vehículos; espejo de `_vehiculo_fase_de_entrada()`): más de una inicial activa (fase nula), o la
--       única pide nota, requisitos bloqueantes o un rol (con esa fase): los vehículos nuevos pueden nacer «Sin fase».
--   C6. `tipo_documento_inactivo` (aviso): un requisito de una fase activa pide un tipo de documento desactivado.
--   C7. `salida_a_jubilada` (aviso): una fase activa tiene una salida hacia una fase jubilada.
-- «Revisar» avisa y nunca impide guardar. La salida no promete orden: la ordena la pantalla (error › aviso › info).

create or replace function public.revisar_flujo(p_flujo uuid)
returns table(nivel text, codigo text, mensaje text, fase_id uuid)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ambito public.ambito_flujo;
  v_iniciales uuid[];
  v_inicial public.fases;
  v_motivos text[] := array[]::text[];
begin
  if p_flujo is null or not public.puede_configurar_flujo(p_flujo) then
    return;
  end if;

  return query
  with f as (select * from public.fases fa where fa.flujo_id = p_flujo and fa.activa)
  select 'error', 'sin_inicial', 'El flujo no tiene ninguna fase inicial activa.', null::uuid where not exists (select 1 from f where f.es_inicial)
  union all
  select 'aviso', 'sin_salida', 'La fase «' || f.nombre || '» no tiene salida y no es final.', f.id from f where not f.es_final and not exists (select 1 from public.fases_transiciones t where t.de_fase_id = f.id)
  union all
  select 'aviso', 'inalcanzable', 'La fase «' || f.nombre || '» no es inicial y nadie llega a ella.', f.id from f where not f.es_inicial and not exists (select 1 from public.fases_transiciones t where t.a_fase_id = f.id)
  union all
  select 'aviso', 'orden_duplicado', 'Dos fases comparten el orden ' || f.orden || '.', (array_agg(f.id order by f.nombre))[1] from f group by f.orden having count(*) > 1
  union all
  select 'aviso', 'contenedor_inalcanzable', 'La fase «' || f.nombre || '» exige contenedor pero ninguna fase del flujo permite asignarlo.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.clave_dato = 'transporte.contenedor') and not exists (select 1 from f f2 where f2.permite_contenedor)
  union all
  select 'aviso', 'espera_jubilada', 'La fase «' || f.nombre || '» espera a una fase jubilada.', f.id
    from f where exists (select 1 from public.fases_requisitos q join public.fases e on e.id = q.espera_fase_id where q.fase_id = f.id and not e.activa)
  union all
  select 'aviso', 'espera_cruzada', 'Esperas cruzadas: «' || f.nombre || '» y la fase que espera se esperan mutuamente.', f.id
    from f where exists (
      select 1 from public.fases_requisitos a join public.fases_requisitos b on b.fase_id = a.espera_fase_id
      where a.fase_id = f.id and a.tipo = 'espera' and b.tipo = 'espera' and b.espera_fase_id = f.id)
  union all
  select 'info', 'sin_bloqueantes', 'La fase «' || f.nombre || '» sólo tiene requisitos informativos.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id) and not exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.bloqueante)
  union all
  -- C3: la lista de la fase, aunque cada entrada traiga la suya (no replica la precedencia de `_puede_mover`).
  select 'aviso', 'rol_sin_personas', 'Sólo pueden mover a «' || f.nombre || '» roles que nadie tiene.', f.id
    from f where exists (select 1 from public.fases_roles fr where fr.fase_id = f.id)
      and not exists (
        select 1 from public.fases_roles fr
          join public.usuarios_roles ur on ur.rol_id = fr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where fr.fase_id = f.id and p.activo and not p.bloqueado)
  union all
  -- C4
  select 'aviso', 'rol_sin_personas', 'Sólo pueden usar la salida de «' || d.nombre || '» a «' || h.nombre || '» roles que nadie tiene.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join f h on h.id = t.a_fase_id
    where exists (select 1 from public.fases_transiciones_roles tr where tr.transicion_id = t.id)
      and not exists (
        select 1 from public.fases_transiciones_roles tr
          join public.usuarios_roles ur on ur.rol_id = tr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where tr.transicion_id = t.id and p.activo and not p.bloqueado)
  union all
  -- C6
  select 'aviso', 'tipo_documento_inactivo', 'La fase «' || f.nombre || '» pide «' || td.nombre || '», que está desactivado.', f.id
    from f join public.fases_requisitos q on q.fase_id = f.id join public.tipos_documento td on td.id = q.tipo_documento_id
    where not td.activo
  union all
  -- C7
  select 'aviso', 'salida_a_jubilada', 'La fase «' || d.nombre || '» tiene una salida a «' || h.nombre || '», que está jubilada.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join public.fases h on h.id = t.a_fase_id
    where not h.activa and h.flujo_id = p_flujo;

  -- C5: espejo de `_vehiculo_fase_de_entrada()`, que sólo existe para vehículos.
  select fl.ambito into v_ambito from public.flujos fl where fl.id = p_flujo;
  if v_ambito is distinct from 'vehiculos' then
    return;
  end if;
  select array_agg(fa.id) into v_iniciales from public.fases fa where fa.flujo_id = p_flujo and fa.es_inicial and fa.activa;
  if coalesce(cardinality(v_iniciales), 0) > 1 then
    return query select 'info', 'entrada_no_automatica', 'Hay más de una fase inicial: los vehículos nuevos nacen «Sin fase».', null::uuid;
    return;
  end if;
  if coalesce(cardinality(v_iniciales), 0) = 0 then
    return;
  end if;
  select * into v_inicial from public.fases fa where fa.id = v_iniciales[1];
  if v_inicial.nota_obligatoria then
    v_motivos := array_append(v_motivos, 'una nota');
  end if;
  if exists (select 1 from public.fases_requisitos q where q.fase_id = v_inicial.id and q.bloqueante) then
    v_motivos := array_append(v_motivos, 'requisitos bloqueantes');
  end if;
  if exists (select 1 from public.fases_roles fr where fr.fase_id = v_inicial.id) then
    v_motivos := array_append(v_motivos, 'un rol');
  end if;
  if cardinality(v_motivos) > 0 then
    return query select 'info', 'entrada_no_automatica',
      'Los vehículos nuevos pueden nacer «Sin fase»: la fase inicial «' || v_inicial.nombre || '» pide '
        || case cardinality(v_motivos)
             when 1 then v_motivos[1]
             when 2 then v_motivos[1] || ' y ' || v_motivos[2]
             else v_motivos[1] || ', ' || v_motivos[2] || ' y ' || v_motivos[3]
           end || '.',
      v_inicial.id;
  end if;
end;
$$;

revoke all on function public.revisar_flujo(uuid) from public, anon;
grant execute on function public.revisar_flujo(uuid) to authenticated, service_role;

comment on function public.revisar_flujo(uuid) is
  'Revisa la coherencia de un flujo (5.12). Sólo responde a quien lo configura (puede_configurar_flujo); a los demás, cero filas sin error. '
  'Códigos: error sin_inicial; aviso sin_salida, inalcanzable, orden_duplicado, contenedor_inalcanzable, espera_jubilada, espera_cruzada, '
  'rol_sin_personas, tipo_documento_inactivo, salida_a_jubilada; info sin_bloqueantes, entrada_no_automatica. Avisa, nunca impide guardar.';
