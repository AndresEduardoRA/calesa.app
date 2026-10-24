// Las pestañas de Configuración › Cotización. Cuál está abierta vive en la URL (`?seccion=`). Hoy una; las fórmulas, las tablas y la tarjeta llegan
// después (docs/PLAN.md, Fase 4).

export const PESTANAS = [{ clave: 'niveles', titulo: 'Niveles de acceso' }] as const

export type Pestana = (typeof PESTANAS)[number]['clave']

export const CLAVES_DE_PESTANA = PESTANAS.map((pestana) => pestana.clave)

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña abre la primera.
export function pestanaDe(valor: string | undefined): Pestana {
  return PESTANAS.find((pestana) => pestana.clave === valor)?.clave ?? 'niveles'
}
