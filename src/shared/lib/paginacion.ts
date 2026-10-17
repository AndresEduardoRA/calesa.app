// Paginación por keyset `(creado_en, id)` para listas grandes (.claude/rules/datos.md): la página
// siguiente es «lo que viene después de la última fila que viste», no un `offset`. El cursor viaja
// en la URL, así que se valida antes de usarlo: uno ilegible es la primera página.

// El tamaño de toda página sale de acá y de ningún otro lado (`.claude/rules/escala.md`). Hay tres mecanismos:
//
// 1. Las listas con «Anterior» y «Siguiente» y filtros (el listado de leads, el inventario de vehículos): la persona
//    elige de a cuántos entre `TAMANOS_DE_PAGINA`, lo recuerda su cuenta (`listas.por_pagina`) y manda `?por=` si viene
//    en la URL. Cada lista declara su máximo y se muestra el menor de lo pedido y ese máximo (`tamanoDePagina()`).
// 2. Las listas que crecen con «Ver más» dentro de una ficha o un drawer (los seguimientos y los recordatorios de
//    un lead): de a `TAMANO_DE_VER_MAS` y hasta `TOPE_DE_LO_CARGADO`. Más ítems por clic empeora el DOM sin acortar el
//    camino a lo antiguo: se llega por otro lado («Ir a una fecha»), nunca sumando para siempre.
// 3. Las que tienen su propia unidad: una columna del kanban (`TAMANO_DE_COLUMNA`) y las papeleras, que van de a
//    `LOTES_POR_PAGINA` lotes (un lote ya trae hasta 200 filas).
//
// En la base, cada RPC con tamaño acota con `_acotar_pagina(pedido, por_defecto, máximo)` y nunca confía en el cliente;
// `scripts/guardas/paginas.test.ts` exige que ese máximo sea al menos el que pide el código.
export const TAMANOS_DE_PAGINA = [10, 25, 50, 100] as const
export type TamanoDePagina = (typeof TAMANOS_DE_PAGINA)[number]
export const TAMANO_DE_PAGINA_POR_DEFECTO: TamanoDePagina = 50
// La clave de la preferencia de la persona (`preferencias_usuario.clave`).
export const CLAVE_DE_PREFERENCIA_POR_PAGINA = 'listas.por_pagina'

export const TAMANO_DE_VER_MAS = 20
export const TOPE_DE_LO_CARGADO = 500
export const TAMANO_DE_COLUMNA = 50
export const LOTES_POR_PAGINA = 5

// Un número de la lista de tamaños, o `null`: lo que no lo es (7, 100000, -5, «abc», 25.5) no se pide.
export function esTamanoDePagina(valor: unknown): valor is TamanoDePagina {
  return TAMANOS_DE_PAGINA.some((tamano) => tamano === valor)
}

// Lee `?por=` de la URL: sólo un tamaño de la lista, escrito como un entero sin signo ni espacios.
export function leerPorPagina(texto: string | null | undefined): TamanoDePagina | null {
  if (texto === null || texto === undefined || !/^[1-9]\d{1,2}$/.test(texto)) {
    return null
  }
  const numero = Number(texto)
  return esTamanoDePagina(numero) ? numero : null
}

// Los tamaños que ofrece una lista: los de la lista hasta su máximo.
export function tamanosHasta(maximo: number): TamanoDePagina[] {
  return TAMANOS_DE_PAGINA.filter((tamano) => tamano <= maximo)
}

// De a cuántos se lee la página: lo que pide la URL, si no lo que eligió la persona, si no el de fábrica; nunca más que
// el máximo de la lista (el mayor tamaño del selector que cabe). Un `maximo` que ningún tamaño alcanza (menor que 10)
// se toma tal cual: la lista lo declaró.
export function tamanoDePagina(opciones: {
  pedido?: number | null
  preferencia?: number | null
  maximo: number
}): number {
  const { pedido, preferencia, maximo } = opciones
  const elegido = [pedido, preferencia].find(esTamanoDePagina) ?? TAMANO_DE_PAGINA_POR_DEFECTO
  return Math.min(elegido, maximo)
}

// Llegó al tope de lo cargado: «Ver más» deja su lugar al aviso.
export function enElTope(lista: readonly unknown[]): boolean {
  return lista.length >= TOPE_DE_LO_CARGADO
}

export type Sentido = 'siguiente' | 'anterior'

export type Cursor = {
  // Tal como lo devolvió la base, como texto: pasarlo por `Date` pierde los microsegundos y la
  // página siguiente repetiría o saltearía filas.
  creadoEn: string
  id: string
  sentido: Sentido
}

export type Paginable = { id: string; creadoEn: string }

export type Pagina<Fila> = {
  filas: Fila[]
  // null = no hay más hacia ese lado.
  siguiente: string | null
  anterior: string | null
}

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// base64url: letras, números, `-` y `_`. Un `+` en la URL llegaría como un espacio.
export function codificarCursor(cursor: Cursor): string {
  const crudo = `${cursor.sentido === 'siguiente' ? 's' : 'a'}|${cursor.creadoEn}|${cursor.id}`
  return btoa(crudo).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function leerCursor(texto: string | null | undefined): Cursor | null {
  if (!texto || !/^[A-Za-z0-9_-]{10,200}$/.test(texto)) {
    return null
  }
  let crudo: string
  try {
    crudo = atob(texto.replaceAll('-', '+').replaceAll('_', '/'))
  } catch {
    return null
  }
  const [sentido, creadoEn, id, ...resto] = crudo.split('|')
  if (
    resto.length > 0 ||
    (sentido !== 's' && sentido !== 'a') ||
    !creadoEn ||
    !id ||
    !INSTANTE.test(creadoEn) ||
    !GUID.test(id)
  ) {
    return null
  }
  return { sentido: sentido === 's' ? 'siguiente' : 'anterior', creadoEn, id }
}

// Arma la página a partir de lo que devolvió la consulta, que pide `tamano + 1` filas para saber
// si hay más. `leidas` llega en el orden de la consulta: de la más nueva a la más vieja yendo
// hacia adelante, y al revés yendo hacia atrás (la consulta camina el índice en la otra dirección).
export function armarPagina<Fila extends Paginable>(
  leidas: readonly Fila[],
  tamano: number,
  cursor: Cursor | null,
): Pagina<Fila> {
  const hayMas = leidas.length > tamano
  const deLaPagina = leidas.slice(0, tamano)
  const haciaAtras = cursor?.sentido === 'anterior'
  const filas = haciaAtras ? [...deLaPagina].reverse() : deLaPagina
  const primera = filas[0]
  const ultima = filas.at(-1)
  if (!primera || !ultima) {
    return { filas: [], siguiente: null, anterior: null }
  }
  const hacia = (fila: Fila, sentido: Sentido) =>
    codificarCursor({ creadoEn: fila.creadoEn, id: fila.id, sentido })
  // Hacia adelante: hay «anterior» si se llegó con un cursor. Hacia atrás: siempre hay
  // «siguiente» (de ahí se vino), y «anterior» sólo si la consulta trajo una fila de más.
  const haySiguiente = haciaAtras || hayMas
  const hayAnterior = haciaAtras ? hayMas : cursor !== null
  return {
    filas,
    siguiente: haySiguiente ? hacia(ultima, 'siguiente') : null,
    anterior: hayAnterior ? hacia(primera, 'anterior') : null,
  }
}
