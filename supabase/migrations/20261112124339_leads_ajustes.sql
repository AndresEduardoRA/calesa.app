-- 9.04-4 (plantillas por empresa, C1–C4): una fila única, `ajustes_leads`, con la plantilla del embudo y el mensaje del portal. La lee todo
-- `authenticated`; sólo se escribe por RPC (`embudo_plantilla_guardar` y `portal_mensaje_guardar`, en las dos migraciones que siguen). Las seis etapas de
-- fábrica pasan a `_embudo_etapas_de_fabrica()` y `_embudo_defecto_de` toma la plantilla si la hay: sólo cambia el embudo que nace después; uno que ya
-- existe no se toca. Dos versiones (D2): la plantilla y el mensaje son dos secciones de pantalla, y guardar una no da PT409 en la otra.
-- La prueba: `supabase/tests/areas/plantillas/plantillas.sql` y el bloque «ajustes_leads» de `supabase/tests/humo.sql`.

-- ---------------------------------------------------------------------------------------------------
-- C1 · la tabla.
-- ---------------------------------------------------------------------------------------------------
create table public.ajustes_leads (
  id integer primary key default 1 check (id = 1),
  embudo_etapas jsonb check (embudo_etapas is null or jsonb_typeof(embudo_etapas) = 'array'),
  embudo_actualizado_en timestamptz not null default now(),
  portal_mensaje text check (portal_mensaje is null or char_length(portal_mensaje) between 1 and 1000),
  portal_actualizado_en timestamptz not null default now()
);

comment on table public.ajustes_leads is
  'Fila única. Las plantillas de leads por empresa: las etapas con que nace un embudo (null = las seis de fábrica) y el mensaje del portal para WhatsApp (null = el de fábrica). Sólo se escribe por RPC.';

alter table public.ajustes_leads enable row level security;

create policy "ajustes_leads: leer" on public.ajustes_leads for select to authenticated using (true);

revoke all on table public.ajustes_leads from public, anon, authenticated;
grant select on table public.ajustes_leads to authenticated;
grant all on table public.ajustes_leads to service_role;

create trigger trg_auditar after insert or delete or update on public.ajustes_leads
  for each row execute function public.auditar();

insert into public.ajustes_leads (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------------------------------
-- C2 · las seis etapas de fábrica, en un solo lugar (STABLE: `jsonb_build_object` lo es).
-- ---------------------------------------------------------------------------------------------------
create or replace function public._embudo_etapas_de_fabrica() returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_array(
    jsonb_build_object('nombre', 'Nuevo', 'color', 'gris', 'es_inicial', true),
    jsonb_build_object('nombre', 'Contactado', 'color', 'azul'),
    jsonb_build_object('nombre', 'Cotizado', 'color', 'violeta'),
    jsonb_build_object('nombre', 'Negociación', 'color', 'ambar'),
    jsonb_build_object('nombre', 'Ganado', 'color', 'verde', 'es_ganada', true),
    jsonb_build_object('nombre', 'Perdido', 'color', 'rojo', 'es_perdida', true));
$$;

revoke all on function public._embudo_etapas_de_fabrica() from public, anon, authenticated;
grant execute on function public._embudo_etapas_de_fabrica() to service_role;

-- ---------------------------------------------------------------------------------------------------
-- C3 · el embudo nuevo nace con la plantilla. Lo demás, igual que en la base: el candado, el reuso del embudo por defecto o del más viejo y «Ventas».
-- `create or replace` conserva los grants (sólo service_role).
-- ---------------------------------------------------------------------------------------------------
create or replace function public._embudo_defecto_de(p_usuario uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  perform public._embudos_candado(p_usuario);
  select e.id into v_id from public.embudos e where e.usuario_id = p_usuario and e.es_default;
  if found then
    return v_id;
  end if;
  select e.id into v_id from public.embudos e where e.usuario_id = p_usuario order by e.creado_en, e.id limit 1;
  if found then
    update public.embudos e set es_default = true where e.id = v_id;
    return v_id;
  end if;
  return public._embudo_insertar(p_usuario, null, 'Ventas', true,
    coalesce((select a.embudo_etapas from public.ajustes_leads a where a.id = 1), public._embudo_etapas_de_fabrica()));
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- C4 · la lectura: cuenta activa, sin permiso (D9). `mensaje` null = el texto de fábrica, que pone la app.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.ajustes_leads_leer() returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare a public.ajustes_leads;
begin
  perform public.assert_activo();
  select * into a from public.ajustes_leads where id = 1;
  return jsonb_build_object(
    'embudo', jsonb_build_object(
      'etapas', coalesce(a.embudo_etapas, public._embudo_etapas_de_fabrica()),
      'de_fabrica', a.embudo_etapas is null,
      'actualizado_en', a.embudo_actualizado_en),
    'portal', jsonb_build_object(
      'mensaje', a.portal_mensaje,
      'actualizado_en', a.portal_actualizado_en));
end;
$$;

revoke all on function public.ajustes_leads_leer() from public, anon;
grant execute on function public.ajustes_leads_leer() to authenticated, service_role;

comment on function public.ajustes_leads_leer() is
  'Las plantillas de leads: {embudo: {etapas, de_fabrica, actualizado_en}, portal: {mensaje, actualizado_en}}. Cuenta activa, sin permiso. 9.04-4.';
