-- La lectura del listado de leads, más barata. Misma semántica, menos trabajo por fila.
--
-- Medido con 2.000 leads sintéticos (Fase 3, parte 3): filtrar por un atributo pasaba por
-- `atributos_lead()` en cada fila y tardaba ~850 ms (0,43 ms por fila). El costo estaba en
-- `alcance_de()`: cada llamada materializaba todos los permisos de la persona
-- (`mis_permisos()`, ~75 filas para una dueña) para quedarse con uno, y `puede_lead()` /
-- `atributos_lead()` lo llamaban dos veces por fila.
--
-- 1. `alcance_de()` lee `usuarios_roles ⨝ roles_permisos ⨝ perfiles` con la clave ya en el WHERE y
--    una sola pasada (agregado), en vez de dos `exists` sobre `mis_permisos()`. Es la misma regla
--    que `mis_permisos()` (perfil activo y no bloqueado); un caso de `humo.sql` compara las dos
--    para cada clave y origen, así que si una cambia sin la otra, falla.
-- 2. `atributos_lead()` resuelve alcance, vida, limbo y cartera en una llamada a `alcance_de()` y
--    una lectura, sin pasar por `puede_lead()`, `lead_en_limbo()` y `en_cartera()` por separado.
--    Devuelve exactamente lo mismo: null si no ve el lead; todo si es de su cartera; si no, sólo
--    las claves que el layout conoce como no privadas (falla cerrada).

create or replace function public.alcance_de(p_clave text, p_origen uuid default null)
returns public.alcance_permiso language sql stable security definer set search_path = '' as $$
  select case when bool_or(rp.alcance = 'todos') then 'todos'::public.alcance_permiso
              when count(*) > 0 then 'propios'::public.alcance_permiso
         end
  from public.usuarios_roles ur
  join public.roles_permisos rp on rp.rol_id = ur.rol_id
  join public.perfiles p on p.id = ur.usuario_id
  where ur.usuario_id = (select auth.uid())
    and p.activo and not p.bloqueado
    and rp.permiso_clave = p_clave
    and (rp.origen_id is null or p_origen is null or rp.origen_id = p_origen);
$$;

create or replace function public.atributos_lead(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_alcance public.alcance_permiso;
  v_atributos jsonb;
  v_cartera boolean;
  v_vivo boolean;
begin
  v_alcance := public.alcance_de('leads.ver');
  if v_alcance is null then
    return null;
  end if;
  select l.atributos,
         exists (select 1 from public.leads_asesores la
                  where la.lead_id = l.id and la.usuario_id = (select auth.uid()) and la.revocado_en is null),
         -- Con algún asesor vigente: lo contrario del limbo.
         exists (select 1 from public.leads_asesores la where la.lead_id = l.id and la.revocado_en is null)
    into v_atributos, v_cartera, v_vivo
  from public.leads l
  where l.id = p_lead and l.eliminado_en is null;
  if not found or not v_vivo then
    return null;
  end if;
  -- «Propios» sólo ve lo que está en su cartera; «todos» ve el lead aunque no sea suyo.
  if v_alcance <> 'todos' and not v_cartera then
    return null;
  end if;
  if v_cartera then
    return v_atributos;
  end if;
  return coalesce((
    select jsonb_object_agg(e.key, e.value)
    from jsonb_each(v_atributos) e
    where exists (select 1 from public.leads_campos c where c.clave = e.key and not c.solo_cartera)
  ), '{}'::jsonb);
end;
$$;
revoke all on function public.atributos_lead(uuid) from public, anon;
grant execute on function public.atributos_lead(uuid) to authenticated;
