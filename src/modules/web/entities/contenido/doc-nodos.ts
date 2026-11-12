// Los nodos del documento del sitio: la lista blanca y el HTML de cada nodo, espejo de `_web_doc_nodo()`,
// `_web_doc_marcas()` y `_web_doc_imagen()`. La entrada es `htmlDelDocumento()` de `doc.ts`.

export const MAXIMO_DE_BYTES_DEL_DOCUMENTO = 102400
// doc › lista › ítem › lista › ítem › párrafo › texto: dos niveles de lista.
export const PROFUNDIDAD_MAXIMA = 6
export const MAXIMO_DEL_ALT = 300

export const MOTIVO_DE_FORMATO = 'El documento tiene un formato que no se admite.'
export const MOTIVO_DE_ENLACE =
  'Ese enlace no se admite: usa una dirección http, https, mailto o tel.'
export const MOTIVO_DE_IMAGEN = 'Esa imagen no se admite: súbela desde el editor.'
export const MOTIVO_DE_NIVELES = 'El documento tiene demasiados niveles.'
export const MOTIVO_DE_TAMANO = 'El documento es demasiado largo.'

const HIJOS: Record<string, readonly string[]> = {
  raiz: ['doc'],
  doc: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'image'],
  blockquote: ['paragraph', 'bulletList', 'orderedList'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  paragraph: ['text', 'hardBreak'],
  heading: ['text', 'hardBreak'],
}

const CLAVES: Record<string, readonly string[]> = {
  text: ['type', 'text', 'marks'],
  hardBreak: ['type', 'marks'],
  orderedList: ['type', 'content', 'attrs'],
  heading: ['type', 'content', 'attrs'],
  image: ['type', 'attrs'],
}

const NO_VACIOS = ['bulletList', 'orderedList', 'listItem', 'blockquote']

const PROTOCOLO = /^(https?:\/\/|mailto:|tel:)/i
const RUTA_DE_IMAGEN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(webp|png|jpe?g)$/

// Un espacio o un caracter de control (lo que rechaza `[[:space:][:cntrl:]]` en la base).
function esEspacioOControl(caracter: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0
  return codigo <= 0x20 || codigo === 0x7f || /\s/.test(caracter)
}

// Lo que se puede poner en un `href` (`_seguimiento_href_valido`): http, https, mailto o tel, sin
// espacios ni caracteres de control, de 1 a 2000. `null` = no se admite.
export function hrefSeguro(href: unknown): string | null {
  if (typeof href !== 'string' || href.length === 0 || href.length > 2000) {
    return null
  }
  return PROTOCOLO.test(href) && ![...href].some(esEspacioOControl) ? href : null
}

// La ruta de una imagen dentro del bucket `web` (`_web_doc_ruta_valida`): sin esquema, host, `//` ni `..`.
export function rutaDeImagenSegura(ruta: unknown): string | null {
  if (typeof ruta !== 'string' || [...ruta].length > 300) {
    return null
  }
  return RUTA_DE_IMAGEN.test(ruta) ? ruta : null
}

// `_web_html_escapar`: `&` primero.
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export class Rechazo extends Error {}

function rechazar(motivo: string = MOTIVO_DE_FORMATO): never {
  throw new Rechazo(motivo)
}

export type Crudo = Record<string, unknown>

export function esObjeto(valor: unknown): valor is Crudo {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function soloClaves(objeto: Crudo, permitidas: readonly string[]) {
  if (Object.keys(objeto).some((k) => !permitidas.includes(k))) {
    rechazar()
  }
}

function hrefDelEnlace(marca: Crudo): string {
  soloClaves(marca, ['type', 'attrs'])
  const attrs = marca['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['href'])
  const href = attrs['href']
  if (typeof href !== 'string') {
    rechazar()
  }
  if (hrefSeguro(href) === null) {
    rechazar(MOTIVO_DE_ENLACE)
  }
  return href
}

type Marcas = { negrita: boolean; cursiva: boolean; href: string | null }

function leerMarca(marca: unknown, vistas: Set<string>, marcas: Marcas) {
  if (!esObjeto(marca) || typeof marca['type'] !== 'string' || vistas.has(marca['type'])) {
    rechazar()
  }
  const tipo = marca['type']
  vistas.add(tipo)
  if (tipo === 'bold' || tipo === 'italic') {
    soloClaves(marca, ['type'])
    if (tipo === 'bold') marcas.negrita = true
    else marcas.cursiva = true
  } else if (tipo === 'link') {
    marcas.href = hrefDelEnlace(marca)
  } else {
    rechazar()
  }
}

// `_web_doc_marcas`: valida y envuelve en orden fijo (enlace › cursiva › negrita).
function conMarcas(crudas: unknown, html: string): string {
  if (crudas === undefined) {
    return html
  }
  if (!Array.isArray(crudas)) {
    rechazar()
  }
  const vistas = new Set<string>()
  const marcas: Marcas = { negrita: false, cursiva: false, href: null }
  for (const marca of crudas) {
    leerMarca(marca, vistas, marcas)
  }
  let salida = html
  if (marcas.negrita) salida = `<strong>${salida}</strong>`
  if (marcas.cursiva) salida = `<em>${salida}</em>`
  if (marcas.href !== null) {
    salida = `<a href="${escaparHtml(marcas.href)}" rel="noopener noreferrer nofollow">${salida}</a>`
  }
  return salida
}

// `_web_doc_imagen`: `attrs` con `ruta` y `alt` (texto de hasta 300 o nulo), y nada más.
function imagen(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['ruta', 'alt'])
  const ruta = attrs['ruta']
  if (typeof ruta !== 'string') {
    rechazar()
  }
  let alt = ''
  const crudo = attrs['alt']
  if ('alt' in attrs && crudo !== null) {
    if (typeof crudo !== 'string' || [...crudo].length > MAXIMO_DEL_ALT) {
      rechazar()
    }
    alt = crudo
  }
  if (rutaDeImagenSegura(ruta) === null) {
    rechazar(MOTIVO_DE_IMAGEN)
  }
  return `<img data-ruta="${escaparHtml(ruta)}" alt="${escaparHtml(alt)}">`
}

function nivelDelTitulo(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['level'])
  const nivel = attrs['level']
  if (nivel !== 2 && nivel !== 3) {
    rechazar()
  }
  return String(nivel)
}

// El número con el que empieza una lista numerada (`attrs.start`, 1 si no viene).
function inicioDeLista(nodo: Crudo): number {
  if (!('attrs' in nodo)) {
    return 1
  }
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['start'])
  const start = attrs['start']
  if (typeof start !== 'number' || !Number.isInteger(start) || start < 1 || start > 99999) {
    rechazar()
  }
  return start
}

function hijosDe(tipo: string, nodo: Crudo): unknown[] {
  if (!('content' in nodo)) {
    if (NO_VACIOS.includes(tipo)) {
      rechazar()
    }
    return []
  }
  const hijos = nodo['content']
  if (!Array.isArray(hijos) || (NO_VACIOS.includes(tipo) && hijos.length === 0)) {
    rechazar()
  }
  return hijos
}

function envolver(tipo: string, interior: string, nivel: string, inicio: number): string {
  switch (tipo) {
    case 'paragraph':
      return `<p>${interior}</p>`
    case 'heading':
      return `<h${nivel}>${interior}</h${nivel}>`
    case 'bulletList':
      return `<ul>${interior}</ul>`
    case 'orderedList':
      return `${inicio === 1 ? '<ol>' : `<ol start="${String(inicio)}">`}${interior}</ol>`
    case 'listItem':
      return `<li>${interior}</li>`
    case 'blockquote':
      return `<blockquote>${interior}</blockquote>`
    default:
      return interior
  }
}

// El tipo de un nodo, si puede ir dentro de `padre` y no trae claves de más.
function tipoDeNodo(nodo: unknown, padre: string, profundidad: number): [string, Crudo] {
  if (profundidad > PROFUNDIDAD_MAXIMA) {
    rechazar(MOTIVO_DE_NIVELES)
  }
  if (!esObjeto(nodo) || typeof nodo['type'] !== 'string') {
    rechazar()
  }
  const tipo = nodo['type']
  if (!(HIJOS[padre] ?? []).includes(tipo)) {
    rechazar()
  }
  soloClaves(nodo, CLAVES[tipo] ?? ['type', 'content'])
  return [tipo, nodo]
}

// Texto, salto o imagen: lo que no tiene hijos. `null` = es un nodo con hijos.
function htmlSinHijos(tipo: string, nodo: Crudo): string | null {
  if (tipo === 'text') {
    const texto = nodo['text']
    if (typeof texto !== 'string' || texto === '') {
      rechazar()
    }
    return conMarcas(nodo['marks'], escaparHtml(texto))
  }
  if (tipo === 'hardBreak') {
    conMarcas(nodo['marks'], '')
    return '<br>'
  }
  return tipo === 'image' ? imagen(nodo) : null
}

// `_web_doc_nodo`: niveles, forma, padre, claves, y después lo propio del tipo.
export function htmlDeNodo(crudo: unknown, padre: string, profundidad: number): string {
  const [tipo, nodo] = tipoDeNodo(crudo, padre, profundidad)
  const hoja = htmlSinHijos(tipo, nodo)
  if (hoja !== null) {
    return hoja
  }
  const nivel = tipo === 'heading' ? nivelDelTitulo(nodo) : ''
  const inicio = tipo === 'orderedList' ? inicioDeLista(nodo) : 1
  const interior = hijosDe(tipo, nodo)
    .map((hijo) => htmlDeNodo(hijo, tipo, profundidad + 1))
    .join('')
  return envolver(tipo, interior, nivel, inicio)
}
