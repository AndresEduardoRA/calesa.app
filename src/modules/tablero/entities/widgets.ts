// El tablero de métricas (`/tablero`): un catálogo de widgets, cada uno con los permisos que lo muestran y el grupo de
// RPC del que lee. Se arma por permisos, nunca por nombre de rol. Cada widget tiene su archivo en
// `features/metricas/widgets/<clave>.tsx`. Cero I/O.
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

export type WidgetDelCatalogo = {
  clave: string
  titulo: string
  // Alcanza con tener uno.
  permisos: readonly ClavePermiso[]
  // La RPC de la que lee: varios widgets del mismo grupo comparten una sola llamada por request.
  grupo: 'leads' | 'cotizaciones' | 'margen' | 'cola-web'
  tamano: 'cifra' | 'ancho'
  // Un hueco (`false`) está en el catálogo pero no se monta ni se ofrece: lo llena otro paso.
  disponible: boolean
}

export const WIDGETS_TABLERO = [
  {
    clave: 'leads-creados',
    titulo: 'Leads creados',
    permisos: ['tablero.metricas.ver'],
    grupo: 'leads',
    tamano: 'cifra',
    disponible: true,
  },
  {
    clave: 'convertidos',
    titulo: 'Convertidos',
    permisos: ['tablero.metricas.ver'],
    grupo: 'leads',
    tamano: 'cifra',
    disponible: true,
  },
  {
    clave: 'tasa-de-conversion',
    titulo: 'Tasa de conversión',
    permisos: ['tablero.metricas.ver'],
    grupo: 'leads',
    tamano: 'cifra',
    disponible: true,
  },
  {
    clave: 'cotizaciones-creadas',
    titulo: 'Cotizaciones',
    permisos: ['tablero.metricas.ver'],
    grupo: 'cotizaciones',
    tamano: 'cifra',
    disponible: true,
  },
  {
    clave: 'cotizaciones-finales',
    titulo: 'Finales',
    permisos: ['tablero.metricas.ver'],
    grupo: 'cotizaciones',
    tamano: 'cifra',
    disponible: true,
  },
  // Huecos del 9.11: su permiso se afina allá (el del margen es otro).
  {
    clave: 'margen-del-mes',
    titulo: 'Margen del mes',
    permisos: ['tablero.metricas.ver'],
    grupo: 'margen',
    tamano: 'cifra',
    disponible: false,
  },
  {
    clave: 'cola-web',
    titulo: 'Cola de la web',
    permisos: ['tablero.metricas.ver'],
    grupo: 'cola-web',
    tamano: 'ancho',
    disponible: false,
  },
] as const satisfies readonly WidgetDelCatalogo[]

export type WidgetConClave = (typeof WIDGETS_TABLERO)[number]
export type ClaveDeWidget = WidgetConClave['clave']

// Los widgets que esta persona puede ver, en el orden del catálogo. Los huecos no salen.
export function widgetsVisibles(permisos: Permisos): readonly WidgetConClave[] {
  return WIDGETS_TABLERO.filter(
    (widget) => widget.disponible && widget.permisos.some((clave) => puede(permisos, clave)),
  )
}

// Lo que la persona eligió: el orden de sus widgets y cuáles oculta. Se guarda como la preferencia `tablero.widgets`.
export type PreferenciaDeWidgets = {
  orden: readonly string[]
  ocultos: readonly string[]
}

export type WidgetsAplicados = {
  mostrados: readonly WidgetDelCatalogo[]
  ocultos: readonly WidgetDelCatalogo[]
}

// Aplica la preferencia a lo que la persona puede ver. Una clave que ya no existe (o que no puede ver) se ignora; un
// widget que la preferencia no nombra queda al final de su lista, en el orden del catálogo; una clave repetida cuenta
// una vez; un oculto lo es aunque no esté en `orden`. Sin preferencia, todos mostrados en el orden del catálogo.
export function aplicarPreferencia(
  visibles: readonly WidgetDelCatalogo[],
  preferencia: PreferenciaDeWidgets | null,
): WidgetsAplicados {
  if (!preferencia) {
    return { mostrados: visibles, ocultos: [] }
  }
  const porClave = new Map(visibles.map((widget) => [widget.clave, widget]))
  const ocultosPorClave = new Set(preferencia.ocultos.filter((clave) => porClave.has(clave)))
  const ordenados: WidgetDelCatalogo[] = []
  const vistos = new Set<string>()
  for (const clave of preferencia.orden) {
    const widget = porClave.get(clave)
    if (widget && !vistos.has(clave)) {
      vistos.add(clave)
      ordenados.push(widget)
    }
  }
  for (const widget of visibles) {
    if (!vistos.has(widget.clave)) {
      vistos.add(widget.clave)
      ordenados.push(widget)
    }
  }
  return {
    mostrados: ordenados.filter((widget) => !ocultosPorClave.has(widget.clave)),
    ocultos: ordenados.filter((widget) => ocultosPorClave.has(widget.clave)),
  }
}
