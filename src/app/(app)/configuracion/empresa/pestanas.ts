// Las pestañas de Configuración › Empresa. Cuál está abierta vive en la URL (`?seccion=`).

export const PESTANAS = [
  { clave: 'empresa', titulo: 'Empresa' },
  { clave: 'monedas', titulo: 'Monedas' },
] as const

export type Pestana = (typeof PESTANAS)[number]['clave']

export const CLAVES_DE_PESTANA = PESTANAS.map((pestana) => pestana.clave)

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña abre la primera.
export function pestanaDe(valor: string | undefined): Pestana {
  return PESTANAS.find((pestana) => pestana.clave === valor)?.clave ?? 'empresa'
}
