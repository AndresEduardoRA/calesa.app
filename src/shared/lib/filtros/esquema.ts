// El esquema declarativo de los filtros de un listado. Cada listado arma el suyo (los fijos que su
// tabla justifica y los que salen de sus datos); `FilterShell` lo dibuja y `leerFiltros()` lo lee
// de la URL. Acá no hay reglas de ningún módulo: sólo la forma.
import type { MinimoDeBusqueda } from './minimo'

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
  // La sección del panel donde va (la `clave` de una de `EsquemaDeFiltros.secciones`).
  seccion?: string
}

export type DefFiltro =
  // Contiene el texto. Con `minimo` (4.03, 5a-9) lo escrito que no alcanza no filtra: el control lo dice junto al campo, no lo escribe en la URL
  // y `leerFiltros()` descarta uno que llegue por una URL escrita a mano o una vista guardada vieja. Sin `minimo`, cualquier texto filtra (vehículos).
  | (Base & { tipo: 'texto'; minimo?: MinimoDeBusqueda })
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
  // Una de varias, con un valor por defecto que no se escribe en la URL (ni es un chip, ni cuenta
  // como filtro): el listado se ve así sin pedir nada.
  | (Base & { tipo: 'eleccion'; opciones: readonly OpcionDeFiltro[]; porDefecto: string })

// Un grupo del panel con su título (y una línea que lo aclara). Sin secciones el panel es una
// lista plana.
export type SeccionDeFiltros = { clave: string; titulo: string; descripcion?: string }

export type EsquemaDeFiltros = {
  // La búsqueda libre de la barra; null si el listado no la tiene. `minimo` (5a-8): lo que pide para buscar; mientras lo escrito no alcanza el campo lo
  // dice junto a él, no se escribe en la URL y no cuenta como búsqueda (ni chip). Sin `minimo`, cualquier texto busca.
  // `etiqueta` es lo que lee un lector de pantalla («Buscar por nombre o número»); `marcador`, lo que se ve dentro del campo vacío, más corto: al
  // 200 % de texto en el celular el campo mide ~300 px y un marcador largo se corta (cierre 5b, defecto 4.2).
  busqueda: {
    clave: string
    etiqueta: string
    marcador?: string
    minimo?: MinimoDeBusqueda
  } | null
  filtros: readonly DefFiltro[]
  // En el orden en que se dibujan; los filtros sin sección van después.
  secciones?: readonly SeccionDeFiltros[]
}

export type ValorDeFiltro =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'opciones'; valores: string[] }
  | { tipo: 'booleano'; valor: boolean }
  | { tipo: 'rango_numero'; min: number | null; max: number | null }
  | { tipo: 'rango_fecha'; desde: string | null; hasta: string | null }
  // Sólo cuando no es el valor por defecto.
  | { tipo: 'eleccion'; valor: string }

// Sólo lo que está filtrando: un filtro sin valor no aparece en `porClave`.
export type ValoresDeFiltros = {
  busqueda: string
  porClave: Record<string, ValorDeFiltro>
}

export const SIN_FILTROS: ValoresDeFiltros = { busqueda: '', porClave: {} }

// Parámetros de una URL tal como los entrega Next o nuqs.
export type ParametrosDeUrl = Record<string, string | string[] | null | undefined>
