-- Exportar todo (9.05-1): la lectura de leads del route handler. Invocadora: devuelve lo que quien exporta ya ve en `leads_vista` con su sesión
-- (la RLS de leads decide las filas; `telefono_lead` enmascara el teléfono fuera de su cartera, `atributos_lead` recorta los campos de sólo cartera
-- y el número global sale sólo con `leads.numero_global.ver`). «Todo» no trae teléfonos ni lo privado de carteras ajenas (duda 2 del 9.05). No pide
-- `datos.exportar.todo`: no abre nada que la vista no abra, y el enforcement es `datos_exportacion_registrar`, que el route handler llama antes.
-- Sin filtro, orden ni límite: los pone PostgREST (`order=creado_en.desc,id.desc`, el cursor y `max_rows`), y se empujan a `leads_listado_idx`
-- porque la función se inlinea. Cuerpo `as $$` y no `begin atomic`: así no depende de la vista, que `_leads_vista_crear()` borra sin cascade.

create or replace function public.datos_exportar_leads()
returns table (
  id uuid,
  numero bigint,
  nombre text,
  telefono_cc text,
  telefono_principal text,
  telefono_visible boolean,
  tipo_lead_id uuid,
  origen_lead_id uuid,
  atributos jsonb,
  dueno_id uuid,
  en_cartera boolean,
  creado_en timestamptz,
  actualizado_en timestamptz,
  ultimo_seguimiento_en timestamptz
)
language sql
stable
as $$
  select v.id, v.numero, v.nombre, v.telefono_cc, v.telefono_principal, v.telefono_visible, v.tipo_lead_id, v.origen_lead_id, v.atributos,
         v.dueno_id, v.en_cartera, v.creado_en, v.actualizado_en, v.ultimo_seguimiento_en
    from public.leads_vista v
$$;

revoke all on function public.datos_exportar_leads() from public, anon;
grant execute on function public.datos_exportar_leads() to authenticated;
comment on function public.datos_exportar_leads() is
  'Los leads a exportar (9.05): leads_vista con la sesión de quien exporta, sin las marcas de quien mira. Invocadora: lo que no ves no sale, y de un lead ajeno el teléfono va enmascarado y sin los campos de sólo cartera. El enforcement de datos.exportar.todo es datos_exportacion_registrar. Se inlinea en la consulta de PostgREST: no le pongas strict, search_path, security definer ni volatile.';
