// Las acciones de los avisos de un lead: qué se ofrece cuando la base frena enviarlo a la papelera. La causa la dice la base en el `hint`
// (`_lead_bloqueo()`, viaja como `ErrorApp.causa`); acá se traduce a ofertas y `resolverAcciones()` las filtra. Sin I/O.
import {
  resolverAcciones,
  SIN_ACCIONES,
  type AccionesDeUnAviso,
} from '@/shared/lib/acciones-del-aviso'
import type { ErrorApp } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'

// Las claves de `_lead_bloqueo()`. `pagos`, `portal` y `cotizacion_papelera` sólo frenan una purga.
export const CAUSAS_DE_BLOQUEO_DE_LEAD = [
  'vinculado',
  'vinculado_ajeno',
  'pagos',
  'portal',
  'cotizacion_papelera',
] as const

export type CausaDeBloqueoDeLead = (typeof CAUSAS_DE_BLOQUEO_DE_LEAD)[number]

export function esCausaDeBloqueoDeLead(valor: unknown): valor is CausaDeBloqueoDeLead {
  return CAUSAS_DE_BLOQUEO_DE_LEAD.some((causa) => causa === valor)
}

export const VER_LOS_VEHICULOS = 'Ver los vehículos'

// Al enviar un solo lead: `vinculado` sólo llega si quien envía ve todos sus vehículos vinculados (si no, `vinculado_ajeno`, que no tiene
// salida: lo desvincula quien gestiona ese vehículo), así que «Ver los vehículos» siempre se puede. En un lote no hay acciones.
export function accionesDelEnvio(error: ErrorApp, leads: readonly string[]): AccionesDeUnAviso {
  const [leadId] = leads
  if (leads.length !== 1 || leadId === undefined || error.causa !== 'vinculado') {
    return SIN_ACCIONES
  }
  return resolverAcciones([
    {
      accion: {
        tipo: 'ir',
        etiqueta: VER_LOS_VEHICULOS,
        ruta: `${RUTAS.leads}/${leadId}?seccion=vehiculos`,
      },
      puede: true,
    },
  ])
}
