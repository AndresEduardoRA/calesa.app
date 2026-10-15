// El documento del editor de un seguimiento (JSON de ProseMirror) y su lista blanca. Es **espejo**
// de `_seguimiento_detalle()` (`…20261015000100_seguimientos_recordatorios.sql`): los mismos nodos,
// las mismas marcas, los mismos topes y el mismo texto derivado. Un test corre la función SQL sobre
// `documento.casos.ts` y exige el mismo resultado. Nunca viaja HTML: la base valida esto y la
// pantalla lo dibuja con la misma lista, sin `innerHTML`.

export const MAXIMO_DE_BYTES_DEL_DOCUMENTO = 20000
export const MAXIMO_DEL_TEXTO_DEL_DETALLE = 5000
// doc › lista › ítem › lista › ítem › párrafo › texto: dos niveles de lista.
export const PROFUNDIDAD_MAXIMA = 6

export const MOTIVO_DE_FORMATO = 'El detalle tiene un formato que no se admite.'
export const MOTIVO_DE_ENLACE =
  'Ese enlace no se admite: usa una dirección http, https, mailto o tel.'
export const MOTIVO_DE_NIVELES = 'El detalle tiene demasiados niveles de lista.'
export const MOTIVO_DE_TAMANO = 'El detalle es demasiado largo.'
export const MOTIVO_DE_LARGO = `El detalle admite hasta ${MAXIMO_DEL_TEXTO_DEL_DETALLE} caracteres.`

export type Marca =
  { type: 'bold' } | { type: 'italic' } | { type: 'link'; attrs: { href: string } }

export type NodoDeTexto = { type: 'text'; text: string; marks?: Marca[] }
export type SaltoDeLinea = { type: 'hardBreak'; marks?: Marca[] }
export type EnLinea = NodoDeTexto | SaltoDeLinea
export type Parrafo = { type: 'paragraph'; content?: EnLinea[] }
export type ItemDeLista = { type: 'listItem'; content: Bloque[] }
export type ListaConVinetas = { type: 'bulletList'; content: ItemDeLista[] }
export type ListaNumerada = {
  type: 'orderedList'
  attrs?: { start: number }
  content: ItemDeLista[]
}
export type Bloque = Parrafo | ListaConVinetas | ListaNumerada
export type Documento = { type: 'doc'; content?: Bloque[] }

export type ValidacionDeDocumento =
  { ok: true; documento: Documento | null; texto: string | null } | { ok: false; motivo: string }

const HIJOS: Record<string, readonly string[]> = {
  raiz: ['doc'],
  doc: ['paragraph', 'bulletList', 'orderedList'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  paragraph: ['text', 'hardBreak'],
}

const CLAVES: Record<string, readonly string[]> = {
  text: ['type', 'text', 'marks'],
  hardBreak: ['type', 'marks'],
  orderedList: ['type', 'content', 'attrs'],
}

const LISTAS = ['bulletList', 'orderedList', 'listItem']

const PROTOCOLO = /^(https?:\/\/|mailto:|tel:)/i

// Un espacio o un caracter de control (lo que rechaza `[[:space:][:cntrl:]]` en la base).
function esEspacioOControl(caracter: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0
  return codigo <= 0x20 || codigo === 0x7f || /\s/.test(caracter)
}

// Lo que se puede poner en un `href`: http, https, mailto o tel, sin espacios ni caracteres de
// control. `null` = no se dibuja como enlace.
export function hrefSeguro(href: unknown): string | null {
  if (typeof href !== 'string' || href.length === 0 || href.length > 2000) {
    return null
  }
  return PROTOCOLO.test(href) && ![...href].some(esEspacioOControl) ? href : null
}

class Rechazo extends Error {}

function rechazar(motivo: string = MOTIVO_DE_FORMATO): never {
  throw new Rechazo(motivo)
}

// Un objeto cualquiera del JSON, con las claves que la lista blanca mira dichas por su nombre.
export type Crudo = Partial<
  Record<'type' | 'text' | 'marks' | 'content' | 'attrs' | 'href' | 'start', unknown>
> &
  Record<string, unknown>

export function esObjeto(valor: unknown): valor is Crudo {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function soloClaves(objeto: Crudo, permitidas: readonly string[]) {
  if (Object.keys(objeto).some((k) => !permitidas.includes(k))) {
    rechazar()
  }
}

function validarEnlace(marca: Crudo) {
  soloClaves(marca, ['type', 'attrs'])
  const attrs = marca.attrs
  if (!esObjeto(attrs) || typeof attrs.href !== 'string') {
    rechazar()
  }
  soloClaves(attrs, ['href'])
  if (hrefSeguro(attrs.href) === null) {
    rechazar(MOTIVO_DE_ENLACE)
  }
}

function validarMarca(marca: unknown, vistas: Set<string>) {
  if (!esObjeto(marca) || typeof marca.type !== 'string' || vistas.has(marca.type)) {
    rechazar()
  }
  vistas.add(marca.type)
  if (marca.type === 'bold' || marca.type === 'italic') {
    soloClaves(marca, ['type'])
  } else if (marca.type === 'link') {
    validarEnlace(marca)
  } else {
    rechazar()
  }
}

function validarMarcas(marcas: unknown) {
  if (marcas === undefined) {
    return
  }
  if (!Array.isArray(marcas)) {
    rechazar()
  }
  const vistas = new Set<string>()
  for (const marca of marcas) {
    validarMarca(marca, vistas)
  }
}

// El tipo de un nodo, si puede ir dentro de `padre` y no trae claves de más.
function tipoDeNodo(nodo: unknown, padre: string, profundidad: number): [string, Crudo] {
  if (profundidad > PROFUNDIDAD_MAXIMA) {
    rechazar(MOTIVO_DE_NIVELES)
  }
  if (!esObjeto(nodo) || typeof nodo.type !== 'string') {
    rechazar()
  }
  if (!(HIJOS[padre] ?? []).includes(nodo.type)) {
    rechazar()
  }
  soloClaves(nodo, CLAVES[nodo.type] ?? ['type', 'content'])
  return [nodo.type, nodo]
}

function textoEnLinea(tipo: string, nodo: Crudo): string {
  validarMarcas(nodo.marks)
  if (tipo === 'hardBreak') {
    return '\n'
  }
  if (typeof nodo.text !== 'string' || nodo.text === '') {
    rechazar()
  }
  return nodo.text
}

// El número con el que empieza una lista numerada (`attrs.start`, 1 si no viene).
function inicioDeLista(nodo: Crudo): number {
  if (!('attrs' in nodo)) {
    return 1
  }
  const attrs = nodo.attrs
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['start'])
  const start = attrs.start
  if (typeof start !== 'number' || !Number.isInteger(start) || start < 1 || start > 99999) {
    rechazar()
  }
  return start
}

function hijosDe(tipo: string, nodo: Crudo): unknown[] {
  if (!('content' in nodo)) {
    if (LISTAS.includes(tipo)) {
      rechazar()
    }
    return []
  }
  const hijos = nodo.content
  if (!Array.isArray(hijos) || (LISTAS.includes(tipo) && hijos.length === 0)) {
    rechazar()
  }
  return hijos
}

function prefijo(tipo: string, inicio: number, n: number): string {
  if (tipo === 'bulletList') {
    return '• '
  }
  return tipo === 'orderedList' ? `${String(inicio + n)}. ` : ''
}

// El texto de un nodo, como lo deriva la base: un bloque por línea, los ítems con «• » o «n. ».
function textoDeNodo(nodo: unknown, padre: string, profundidad: number): string {
  const [tipo, objeto] = tipoDeNodo(nodo, padre, profundidad)
  if (tipo === 'text' || tipo === 'hardBreak') {
    return textoEnLinea(tipo, objeto)
  }
  const inicio = tipo === 'orderedList' ? inicioDeLista(objeto) : 1
  return hijosDe(tipo, objeto)
    .map((hijo, n) => prefijo(tipo, inicio, n) + textoDeNodo(hijo, tipo, profundidad + 1))
    .join(tipo === 'paragraph' ? '' : '\n')
}

// Todo el texto escrito, sin separadores: para saber si el documento dice algo.
export function textosDe(nodo: unknown): string {
  if (!esObjeto(nodo)) {
    return ''
  }
  const propio = typeof nodo.text === 'string' ? nodo.text : ''
  const hijos = Array.isArray(nodo.content) ? nodo.content.map(textosDe).join('') : ''
  return propio + hijos
}

// Lo que hace `btrim(…, E' \n\t')`.
export function recortar(texto: string): string {
  return texto.replace(/^[ \n\t]+|[ \n\t]+$/g, '')
}

// El documento escrito como lo escribe la base (`jsonb::text`: un espacio después de «:» y de
// «,»), para medirlo igual que `octet_length(p_doc::text)`.
function comoLaBase(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map(comoLaBase).join(', ')}]`
  }
  if (esObjeto(valor)) {
    return `{${Object.entries(valor)
      .map(([k, v]) => `${JSON.stringify(k)}: ${comoLaBase(v)}`)
      .join(', ')}}`
  }
  return valor === undefined ? 'null' : JSON.stringify(valor)
}

// Valida el documento contra la lista blanca y deriva su texto. Un documento sin ningún texto
// (párrafos o ítems vacíos) es «sin detalle»: `documento` y `texto` nulos, no un error.
export function validarDocumento(valor: unknown): ValidacionDeDocumento {
  if (valor === null || valor === undefined) {
    return { ok: true, documento: null, texto: null }
  }
  if (new TextEncoder().encode(comoLaBase(valor)).length > MAXIMO_DE_BYTES_DEL_DOCUMENTO) {
    return { ok: false, motivo: MOTIVO_DE_TAMANO }
  }
  try {
    const texto = recortar(textoDeNodo(valor, 'raiz', 0))
    if (recortar(textosDe(valor)) === '') {
      return { ok: true, documento: null, texto: null }
    }
    if ([...texto].length > MAXIMO_DEL_TEXTO_DEL_DETALLE) {
      return { ok: false, motivo: MOTIVO_DE_LARGO }
    }
    return { ok: true, documento: valor as Documento, texto }
  } catch (error) {
    if (error instanceof Rechazo) {
      return { ok: false, motivo: error.message }
    }
    throw error
  }
}
