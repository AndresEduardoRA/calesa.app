// Las pestañas de Configuración › Leads. Cuál está abierta vive en la URL (`?seccion=`). Los tipos de
// seguimiento llegan con su parte (docs/PLAN.md).

export const PESTANAS = [
  { clave: 'campos', titulo: 'Campos' },
  { clave: 'origenes', titulo: 'Orígenes del lead' },
  { clave: 'tipos', titulo: 'Tipos de lead' },
] as const

export type Pestana = (typeof PESTANAS)[number]['clave']

export const CLAVES_DE_PESTANA = PESTANAS.map((pestana) => pestana.clave)

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña abre la primera.
export function pestanaDe(valor: string | undefined): Pestana {
  return PESTANAS.find((pestana) => pestana.clave === valor)?.clave ?? 'campos'
}
