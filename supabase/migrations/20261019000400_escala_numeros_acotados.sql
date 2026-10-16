-- Escala (9e): dos números que se mostraban con un total exacto y crecían con la tabla.
--
-- 1. `lead_ficha().vehiculos_vinculados` pasa a contar hasta 101 (el aviso de la cartera y de la papelera
--    dice «más de 100»); el índice es `vehiculos_lead_idx`. Se abre con cada ficha.
-- 2. `etiquetas_vista.leads` («En N leads» de «Gestionar etiquetas») cuenta hasta 1.001: la pantalla dice
--    «más de 1.000». Índice: `leads_etiquetas_etiqueta_id_idx`.
-- El resto de `lead_ficha` queda igual.

CREATE OR REPLACE FUNCTION public.lead_ficha(p_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    -- Hasta 101 (el aviso dice «más de 100»); índice `vehiculos_lead_idx`.
    'vehiculos_vinculados', (select count(*) from (select 1 from public.vehiculos x where x.lead_id = p_lead limit 101) q),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$function$;

create or replace view public.etiquetas_vista with (security_invoker = true) as
select e.id, e.nombre, e.color, e.creado_en, e.actualizado_en,
       (select count(*) from (select 1 from public.leads_etiquetas le join public.leads l on l.id = le.lead_id
         where le.etiqueta_id = e.id and l.eliminado_en is null limit 1001) q)::int as leads
  from public.etiquetas e;
comment on view public.etiquetas_vista is 'Las etiquetas de quien mira, con a cuántos de los leads que ve están puestas, hasta 1.001 (la pantalla dice «más de 1.000»).';
