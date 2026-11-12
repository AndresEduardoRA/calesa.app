import { widgetsVisibles, type ClaveDeWidget, type WidgetConClave } from '../../../entities/widgets'
import type { Permisos } from '@/shared/lib/permisos'
import { CuerpoDeConvertidos } from './convertidos'
import { CuerpoDeCotizacionesCreadas } from './cotizaciones-creadas'
import { CuerpoDeCotizacionesFinales } from './cotizaciones-finales'
import { CuerpoDeCotizacionesPorDia } from './cotizaciones-por-dia'
import { CuerpoDeCotizacionesPorOrigen } from './cotizaciones-por-origen'
import { CuerpoDeLeadsCreados } from './leads-creados'
import { CuerpoDeLeadsPorDia } from './leads-por-dia'
import { CuerpoDeLeadsPorOrigen } from './leads-por-origen'
import { CuerpoDeLeadsPorPersona } from './leads-por-persona'
import { CuerpoDeTasaDeConversion } from './tasa-de-conversion'
import type { CuerpoDeWidget } from './tipos'

// Un hueco (`disponible: false` en el catálogo) nunca se monta: lo llena el paso que lo trae (9.11).
const HUECO: CuerpoDeWidget = () => null

// Todas las claves del catálogo: el compilador pide una por cada una.
const CUERPOS: Record<ClaveDeWidget, CuerpoDeWidget> = {
  'leads-creados': CuerpoDeLeadsCreados,
  convertidos: CuerpoDeConvertidos,
  'tasa-de-conversion': CuerpoDeTasaDeConversion,
  'cotizaciones-creadas': CuerpoDeCotizacionesCreadas,
  'cotizaciones-finales': CuerpoDeCotizacionesFinales,
  'leads-por-dia': CuerpoDeLeadsPorDia,
  'cotizaciones-por-dia': CuerpoDeCotizacionesPorDia,
  'leads-por-origen': CuerpoDeLeadsPorOrigen,
  'leads-por-persona': CuerpoDeLeadsPorPersona,
  'cotizaciones-por-origen': CuerpoDeCotizacionesPorOrigen,
  'margen-del-mes': HUECO,
  'cola-web': HUECO,
}

export type WidgetParaMontar = { widget: WidgetConClave; cuerpo: CuerpoDeWidget }

// Los widgets de esta persona con su cuerpo, en el orden del catálogo.
export function widgetsParaMontar(permisos: Permisos): readonly WidgetParaMontar[] {
  return widgetsVisibles(permisos).map((widget) => ({
    widget,
    cuerpo: CUERPOS[widget.clave],
  }))
}
