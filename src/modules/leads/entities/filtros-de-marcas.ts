// Los filtros de «Tus marcas» en el listado de leads: tachados (ocultos por defecto), favoritos y
// etiquetas («cualquiera de»). Son de quien mira: filtran por las columnas de `leads_vista` que la
// base ya recortó a sus marcas (`esta_tachado`, `es_favorito`, `etiquetas`). Ni reordenan ni cambian
// el keyset: sólo dejan filas afuera.
import type { DefFiltro, ParametrosDeUrl, ValoresDeFiltros } from '@/shared/lib/filtros'
import type { Etiqueta } from './etiqueta'

// El aviso de tachados ocultos cuenta hasta acá: más allá dice «más de 50» (nunca el total exacto).
export const TOPE_DE_OCULTOS = 50

export const FILTRO_TACHADOS = 'tachados'
export const FILTRO_FAVORITOS = 'favoritos'
export const FILTRO_ETIQUETA = 'etiqueta'

// Las secciones del panel: lo propio arriba (con la aclaración de que es privado), lo del lead abajo.
export const SECCION_MARCAS = 'marcas'
export const SECCION_DATOS = 'datos'
export const SECCIONES_DEL_LISTADO = [
  { clave: SECCION_MARCAS, titulo: 'Tus marcas', descripcion: 'Solo las ves tú.' },
  { clave: SECCION_DATOS, titulo: 'Datos del lead' },
] as const

export const MODOS_DE_TACHADOS = ['ocultar', 'incluir', 'solo'] as const
export type ModoDeTachados = (typeof MODOS_DE_TACHADOS)[number]

const ETIQUETA_DEL_MODO: Record<ModoDeTachados, string> = {
  ocultar: 'Ocultarlos',
  incluir: 'Mostrarlos también',
  solo: 'Solo los tachados',
}

// Lo que va en la sección «Tus marcas». Sin etiquetas, no se ofrece filtrar por ellas.
export function filtrosDeMarcas(etiquetas: readonly Etiqueta[]): DefFiltro[] {
  const filtros: DefFiltro[] = [
    {
      tipo: 'eleccion',
      clave: FILTRO_TACHADOS,
      etiqueta: 'Tachados',
      seccion: SECCION_MARCAS,
      porDefecto: 'ocultar',
      opciones: MODOS_DE_TACHADOS.map((modo) => ({
        valor: modo,
        etiqueta: ETIQUETA_DEL_MODO[modo],
      })),
    },
    { tipo: 'booleano', clave: FILTRO_FAVORITOS, etiqueta: 'Favoritos', seccion: SECCION_MARCAS },
  ]
  if (etiquetas.length > 0) {
    filtros.push({
      tipo: 'opciones',
      clave: FILTRO_ETIQUETA,
      etiqueta: 'Etiquetas',
      seccion: SECCION_MARCAS,
      ayuda: 'Cualquiera de las elegidas.',
      // El punto de color sale del token de la paleta (la fila guarda la clave, no un hex).
      opciones: etiquetas.map((una) => ({
        valor: una.id,
        etiqueta: una.nombre,
        color: `var(--etiqueta-${una.color})`,
      })),
    })
  }
  return filtros
}

// Qué pidió la URL para los tachados: sin decir nada (o algo que no vale), ocultarlos.
export function modoDeTachados(valores: ValoresDeFiltros): ModoDeTachados {
  const valor = valores.porClave[FILTRO_TACHADOS]
  const pedido = valor?.tipo === 'eleccion' ? valor.valor : 'ocultar'
  return MODOS_DE_TACHADOS.find((modo) => modo === pedido) ?? 'ocultar'
}

// Si el listado deja afuera los tachados: por defecto sí, salvo mientras se busca (buscar algo que
// existe y no encontrarlo es peor que verlo marcado). «Solo» y «Mostrarlos también» no ocultan.
export function ocultaTachados(valores: ValoresDeFiltros): boolean {
  return modoDeTachados(valores) === 'ocultar' && valores.busqueda.trim() === ''
}

export type CondicionDeMarca =
  | { tipo: 'tachado'; valor: boolean }
  | { tipo: 'favorito'; valor: boolean }
  // Cualquiera de esas etiquetas de quien mira.
  | { tipo: 'etiquetas'; ids: string[] }

export function condicionesDeMarcas(valores: ValoresDeFiltros): CondicionDeMarca[] {
  const condiciones: CondicionDeMarca[] = []
  const modo = modoDeTachados(valores)
  if (modo === 'solo') {
    condiciones.push({ tipo: 'tachado', valor: true })
  } else if (ocultaTachados(valores)) {
    condiciones.push({ tipo: 'tachado', valor: false })
  }
  const favoritos = valores.porClave[FILTRO_FAVORITOS]
  if (favoritos?.tipo === 'booleano') {
    condiciones.push({ tipo: 'favorito', valor: favoritos.valor })
  }
  const etiqueta = valores.porClave[FILTRO_ETIQUETA]
  if (etiqueta?.tipo === 'opciones' && etiqueta.valores.length > 0) {
    condiciones.push({ tipo: 'etiquetas', ids: etiqueta.valores })
  }
  return condiciones
}

// Las etiquetas de `?etiqueta=` que ya no son de quien mira (borradas, de otra persona, o un id
// mal escrito): `leerFiltros()` las deja afuera sin romper; esto permite decirlo y quitarlas.
// Devuelve cuántas y el valor con el que queda el parámetro (las que sí valen, o nada).
export function etiquetasDescartadas(
  parametros: ParametrosDeUrl,
  etiquetas: readonly Etiqueta[],
): { cuantas: number; quedan: string | null } | null {
  const crudo = parametros[FILTRO_ETIQUETA]
  const texto = (Array.isArray(crudo) ? crudo[0] : crudo) ?? ''
  const pedidas = texto
    .split(',')
    .map((uno) => uno.trim())
    .filter((uno) => uno !== '')
  const propias = new Set(etiquetas.map((una) => una.id))
  const validas = [...new Set(pedidas.filter((id) => propias.has(id)))]
  const cuantas = new Set(pedidas.filter((id) => !propias.has(id))).size
  return cuantas === 0 ? null : { cuantas, quedan: validas.length > 0 ? validas.join(',') : null }
}
