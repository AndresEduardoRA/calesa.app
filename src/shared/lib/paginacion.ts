// Paginación por keyset `(creado_en, id)` para listas grandes (.claude/rules/datos.md): la página
// siguiente es «lo que viene después de la última fila que viste», no un `offset`. El cursor viaja
// en la URL, así que se valida antes de usarlo: uno ilegible es la primera página.

// Las listas que crecen con «Ver más» (los seguimientos y los recordatorios de un lead): el tamaño de
// la página y lo máximo que se carga y se dibuja, en un solo punto (`.claude/rules/escala.md`; la 9g los
// hará configurables). Más allá del tope se avisa y a lo antiguo se llega por otro camino («Ir a una
// fecha»), nunca sumando para siempre. El tope es un múltiplo de la página: se llega a él justo.
export const TAMANO_DE_PAGINA = 20
export const TOPE_DE_LO_CARGADO = 500

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
