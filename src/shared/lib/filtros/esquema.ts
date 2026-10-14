// El esquema declarativo de los filtros de un listado. Cada listado arma el suyo (los fijos que su
// tabla justifica y los que salen de sus datos); `FilterShell` lo dibuja y `leerFiltros()` lo lee
// de la URL. Acá no hay reglas de ningún módulo: sólo la forma.

export type OpcionDeFiltro = {
  valor: string
  etiqueta: string
  // El color de la fila (una fase, una categoría): nunca de un mapa en código.
  color?: string
}

type Base = {
  // La clave del filtro en la URL. Los rangos usan `<clave>.min` y `<clave>.max` (o `.desde` y
  // `.hasta`): elegir claves que no terminen así.
  clave: string
  etiqueta: string
  // Una línea bajo el control que aclara qué filtra («Solo busca en tus leads»).
  ayuda?: string
}

export type DefFiltro =
  // Contiene el texto.
  | (Base & { tipo: 'texto' })
  // Cualquiera de las elegidas.
  | (Base & { tipo: 'opciones'; opciones: readonly OpcionDeFiltro[] })
  // Sí, no, o sin filtrar.
  | (Base & { tipo: 'booleano' })
  | (Base & {
      tipo: 'rango_numero'
      // Lo que la columna aguanta: un valor fuera de acá se descarta al leer la URL.
      minimo: number
      maximo: number
      entero: boolean
      // Un año se escribe «2015», no «2.015».
      sinMiles?: boolean
    })
  | (Base & { tipo: 'rango_fecha' })

export type EsquemaDeFiltros = {
  // La búsqueda libre de la barra; null si el listado no la tiene.
  busqueda: { clave: string; etiqueta: string } | null
  filtros: readonly DefFiltro[]
}

export type ValorDeFiltro =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'opciones'; valores: string[] }
  | { tipo: 'booleano'; valor: boolean }
  | { tipo: 'rango_numero'; min: number | null; max: number | null }
  | { tipo: 'rango_fecha'; desde: string | null; hasta: string | null }

// Sólo lo que está filtrando: un filtro sin valor no aparece en `porClave`.
export type ValoresDeFiltros = {
  busqueda: string
  porClave: Record<string, ValorDeFiltro>
}

export const SIN_FILTROS: ValoresDeFiltros = { busqueda: '', porClave: {} }

// Parámetros de una URL tal como los entrega Next o nuqs.
export type ParametrosDeUrl = Record<string, string | string[] | null | undefined>
