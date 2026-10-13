// Las pestañas de un origen. Cuál está abierta vive en la URL (`?seccion=`).

export const PESTANAS = [
  { clave: 'datos', titulo: 'Datos' },
  { clave: 'campos', titulo: 'Campos' },
  { clave: 'categorias', titulo: 'Categorías' },
] as const

export type Pestana = (typeof PESTANAS)[number]['clave']

export const CLAVES_DE_PESTANA = PESTANAS.map((pestana) => pestana.clave)

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña abre la primera.
export function pestanaDe(valor: string | undefined): Pestana {
  return PESTANAS.find((pestana) => pestana.clave === valor)?.clave ?? 'datos'
}
