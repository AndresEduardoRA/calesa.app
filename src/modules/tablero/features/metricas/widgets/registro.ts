import {
  aplicarPreferencia,
  widgetsVisibles,
  type ClaveDeWidget,
  type PreferenciaDeWidgets,
  type WidgetConClave,
} from '../../../entities/widgets'
import type { Permisos } from '@/shared/lib/permisos'
import { CuerpoDeColaWeb } from './cola-web'
import { CuerpoDeConvertidos } from './convertidos'
import { CuerpoDeCotizacionesCreadas } from './cotizaciones-creadas'
import { CuerpoDeCotizacionesFinales } from './cotizaciones-finales'
import { CuerpoDeCotizacionesPorDia } from './cotizaciones-por-dia'
import { CuerpoDeCotizacionesPorOrigen } from './cotizaciones-por-origen'
import { CuerpoDeLeadsCreados } from './leads-creados'
import { CuerpoDeLeadsPorDia } from './leads-por-dia'
import { CuerpoDeLeadsPorOrigen } from './leads-por-origen'
import { CuerpoDeLeadsPorPersona } from './leads-por-persona'
import { CuerpoDeMargenDelMes } from './margen-del-mes'
import { CuerpoDeTasaDeConversion } from './tasa-de-conversion'
import type { CuerpoDeWidget } from './tipos'

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
  'margen-del-mes': CuerpoDeMargenDelMes,
  'cola-web': CuerpoDeColaWeb,
}

export type WidgetParaMontar = { widget: WidgetConClave; cuerpo: CuerpoDeWidget }

// Los widgets de esta persona con su cuerpo: los que muestra, en el orden que eligió (el del catálogo si no eligió), y los
// que ocultó. Sólo salen los que sus permisos dejan ver: una clave de la preferencia que no ve se ignora.
export function widgetsParaMontar(
  permisos: Permisos,
  preferencia: PreferenciaDeWidgets | null = null,
): { mostrados: readonly WidgetParaMontar[]; ocultos: readonly WidgetParaMontar[] } {
  const montar = (widget: WidgetConClave): WidgetParaMontar => ({
    widget,
    cuerpo: CUERPOS[widget.clave],
  })
  const { mostrados, ocultos } = aplicarPreferencia(widgetsVisibles(permisos), preferencia)
  return { mostrados: mostrados.map(montar), ocultos: ocultos.map(montar) }
}
