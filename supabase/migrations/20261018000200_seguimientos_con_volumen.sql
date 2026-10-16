-- Parte 9d-2: la línea de tiempo de un lead no crece con el total, y un seguimiento se lee por su id.
--
-- Medido con 20.000 seguimientos (`supabase/tests/medir-volumen.sql`):
--   · quien ve el lead sin ser autor (la co-asesora, la dueña con «todos») recorría todos los privados
--     ajenos para no encontrar ninguno: la policy («los míos o los públicos») era un filtro sobre
--     `seguimientos_lead_fecha_idx`;
--   · con el plan genérico de plpgsql, `p_antes_en is null or (…)` deja el cursor como filtro: una
--     página profunda recorría todo lo anterior.
-- Ahora la página es la unión de dos ramas ordenadas, cada una con su índice (los míos; los públicos
-- de cualquiera), y con cursor y sin cursor son consultas distintas.
--
-- `lead_seguimiento(p_lead, p_id)`: uno por su id, con la misma forma que una fila de la página. Lo usa
-- «Recargar» tras un conflicto cuando el que se edita no está en la primera página (sin releer todo lo
-- cargado). Invoker: la RLS decide; lo que no se ve es `null`.

-- Los míos de un lead, por fecha (la rama propia de la página).
create index if not exists seguimientos_lead_autor_idx
  on public.seguimientos (lead_id, usuario_id, ocurrido_en desc, id desc)
  where eliminado_en is null;
-- Los «Visible para el cliente» de un lead, de cualquiera (la otra rama, y el portal).
create index if not exists seguimientos_lead_publicos_idx
  on public.seguimientos (lead_id, ocurrido_en desc, id desc)
  where eliminado_en is null and visibilidad = 'publico';

-- Una página de los seguimientos que quien mira ve de un lead, desde el cursor, sin conteo.
-- Índices: `seguimientos_lead_autor_idx` y `seguimientos_lead_publicos_idx`.
create or replace function public.lead_seguimientos(p_lead uuid, p_antes_en timestamptz default null,
                                                    p_antes_id uuid default null, p_tamano int default 20)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tamano int := least(greatest(coalesce(p_tamano, 20), 1), 50);
  v_yo uuid := (select auth.uid());
  v_filas public.seguimientos[];
  v_json jsonb;
begin
  -- `union` (no `all`): uno mío y público llega por las dos ramas.
  if p_antes_en is null then
    select array_agg(x.s order by (x.s).ocurrido_en desc, (x.s).id desc) into v_filas from (
      select u.s from (
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.usuario_id = v_yo and s.eliminado_en is null
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)
        union
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)) u
      order by (u.s).ocurrido_en desc, (u.s).id desc limit v_tamano + 1) x;
  else
    select array_agg(x.s order by (x.s).ocurrido_en desc, (x.s).id desc) into v_filas from (
      select u.s from (
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.usuario_id = v_yo and s.eliminado_en is null
            and (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id)
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)
        union
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
            and (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id)
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)) u
      order by (u.s).ocurrido_en desc, (u.s).id desc limit v_tamano + 1) x;
  end if;
  -- La forma de siempre (la misma que `lead_seguimiento()`). La RLS de `vehiculos` vacía el join si
  -- quien mira no ve ese vehículo.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', u.id, 'lead_id', u.lead_id,
           'tipo_id', u.tipo_id, 'tipo_nombre', t.nombre, 'tipo_icono', t.icono,
           'titulo', u.titulo, 'detalle_doc', u.detalle_doc, 'detalle_texto', u.detalle_texto,
           'visibilidad', u.visibilidad, 'ocurrido_en', u.ocurrido_en, 'actualizado_en', u.actualizado_en,
           'eliminado', false,
           'autor_id', u.usuario_id, 'autor_nombre', nullif(btrim(p.nombre), ''),
           'es_mio', u.usuario_id = v_yo,
           'vehiculo', case when v.id is not null then
                         jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end,
           'vehiculo_oculto', u.vehiculo_id is not null and v.id is null and u.usuario_id = v_yo)
           order by u.ordinality), '[]'::jsonb)
    into v_json
    from unnest(v_filas[1:v_tamano]) with ordinality as u
    join public.tipos_seguimiento t on t.id = u.tipo_id
    left join public.perfiles p on p.id = u.usuario_id
    left join public.vehiculos v on v.id = u.vehiculo_id;
  return jsonb_build_object(
    'seguimientos', v_json, 'hay_mas', coalesce(cardinality(v_filas), 0) > v_tamano,
    'puedo_anotar', public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar'));
end;
$$;
revoke all on function public.lead_seguimientos(uuid, timestamptz, uuid, int) from public, anon;
grant execute on function public.lead_seguimientos(uuid, timestamptz, uuid, int) to authenticated;

-- Uno por su id (vivo, de ese lead y que quien mira ve), con la forma de una fila de la página; si no,
-- `null` (ajeno, privado de otro, eliminado o inexistente: todo igual). La clave primaria.
create or replace function public.lead_seguimiento(p_lead uuid, p_id uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); v_json jsonb;
begin
  select jsonb_build_object(
           'id', s.id, 'lead_id', s.lead_id,
           'tipo_id', s.tipo_id, 'tipo_nombre', t.nombre, 'tipo_icono', t.icono,
           'titulo', s.titulo, 'detalle_doc', s.detalle_doc, 'detalle_texto', s.detalle_texto,
           'visibilidad', s.visibilidad, 'ocurrido_en', s.ocurrido_en, 'actualizado_en', s.actualizado_en,
           'eliminado', false,
           'autor_id', s.usuario_id, 'autor_nombre', nullif(btrim(p.nombre), ''),
           'es_mio', s.usuario_id = v_yo,
           'vehiculo', case when v.id is not null then
                         jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end,
           'vehiculo_oculto', s.vehiculo_id is not null and v.id is null and s.usuario_id = v_yo)
    into v_json
    from public.seguimientos s
    join public.tipos_seguimiento t on t.id = s.tipo_id
    left join public.perfiles p on p.id = s.usuario_id
    left join public.vehiculos v on v.id = s.vehiculo_id
   where s.id = p_id and s.lead_id = p_lead and s.eliminado_en is null;
  return v_json;
end;
$$;
revoke all on function public.lead_seguimiento(uuid, uuid) from public, anon;
grant execute on function public.lead_seguimiento(uuid, uuid) to authenticated;
