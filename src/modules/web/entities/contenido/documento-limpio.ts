// Lo que sale del editor del sitio, reducido a la lista blanca de `doc.ts`. Tiptap agrega atributos que la base no admite (el `target`, el
// `rel` y la `class` de un enlace, el `type` de una lista numerada, el nivel 1 o 4 de un título): se deja sólo lo que acepta. Un nodo o una
// marca que no conoce se pierde, pero su texto queda. Es defensa en el navegador, no la frontera: la base rechaza lo que no esté en la lista.
// Propio del área `contenido` de `web` (el editor de `leads` es otro: `web` no importa `leads`).
import { MAXIMO_DEL_ALT, hrefSeguro, htmlDelDocumento, rutaDeImagenSegura } from './doc'
import { esObjeto } from './doc-nodos'

type Crudo = Record<string, unknown>

export type Marca =
  { type: 'bold' } | { type: 'italic' } | { type: 'link'; attrs: { href: string } }
export type NodoDeTexto = { type: 'text'; text: string; marks?: Marca[] }
export type SaltoDeLinea = { type: 'hardBreak' }
export type EnLinea = NodoDeTexto | SaltoDeLinea
export type Parrafo = { type: 'paragraph'; content?: EnLinea[] }
export type Titulo = { type: 'heading'; attrs: { level: 2 | 3 }; content: EnLinea[] }
export type ItemDeLista = { type: 'listItem'; content: BloqueDeLista[] }
export type ListaConVinetas = { type: 'bulletList'; content: ItemDeLista[] }
export type ListaNumerada = {
  type: 'orderedList'
  attrs?: { start: number }
  content: ItemDeLista[]
}
export type BloqueDeLista = Parrafo | ListaConVinetas | ListaNumerada
export type Cita = { type: 'blockquote'; content: BloqueDeLista[] }
export type Imagen = { type: 'image'; attrs: { ruta: string; alt: string } }
export type Bloque = BloqueDeLista | Titulo | Cita | Imagen
export type DocumentoDelSitio = { type: 'doc'; content: Bloque[] }

// doc › lista › ítem › lista › ítem › párrafo › texto: la base admite hasta la profundidad 6, así que una lista sólo cabe hasta la
// profundidad 3 (lista = d, ítem = d+1, párrafo o lista de adentro = d+2, texto = d+3). Una más honda se aplana en párrafos.
const PROFUNDIDAD_MAXIMA_DE_UNA_LISTA = 3

const comoLista = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : [])

function limpiarMarcas(marcas: unknown): Marca[] {
  const vistas = new Set<string>()
  return comoLista(marcas).flatMap((marca): Marca[] => {
    if (!esObjeto(marca) || typeof marca['type'] !== 'string' || vistas.has(marca['type'])) {
      return []
    }
    if (marca['type'] === 'bold' || marca['type'] === 'italic') {
      vistas.add(marca['type'])
      return [{ type: marca['type'] }]
    }
    const attrs = marca['attrs']
    const href = marca['type'] === 'link' && esObjeto(attrs) ? hrefSeguro(attrs['href']) : null
    if (href === null) {
      return []
    }
    vistas.add('link')
    return [{ type: 'link', attrs: { href } }]
  })
}

// El texto de un nodo cualquiera, para no perderlo cuando el nodo no se admite.
function textoDe(nodo: unknown): string {
  if (!esObjeto(nodo)) {
    return ''
  }
  const propio = typeof nodo['text'] === 'string' ? nodo['text'] : ''
  return propio + comoLista(nodo['content']).map(textoDe).join('')
}

function limpiarEnLinea(nodos: unknown): EnLinea[] {
  return comoLista(nodos).flatMap((nodo): EnLinea[] => {
    if (!esObjeto(nodo)) {
      return []
    }
    if (nodo['type'] === 'hardBreak') {
      return [{ type: 'hardBreak' }]
    }
    const texto = typeof nodo['text'] === 'string' ? nodo['text'] : textoDe(nodo)
    if (texto === '') {
      return []
    }
    const marcas = limpiarMarcas(nodo['marks'])
    return [{ type: 'text', text: texto, ...(marcas.length > 0 ? { marks: marcas } : {}) }]
  })
}

function parrafo(contenido: EnLinea[]): Parrafo {
  return contenido.length > 0 ? { type: 'paragraph', content: contenido } : { type: 'paragraph' }
}

// Los bloques de un ítem o de una cita: párrafos y listas. Un título, una cita o una imagen de adentro baja a párrafo (o a sus hijos).
function limpiarBloquesDeLista(nodos: unknown, profundidad: number): BloqueDeLista[] {
  return comoLista(nodos).flatMap((nodo): BloqueDeLista[] => {
    if (!esObjeto(nodo)) {
      return []
    }
    const tipo = nodo['type']
    if (tipo === 'bulletList' || tipo === 'orderedList') {
      return limpiarLista(nodo, profundidad)
    }
    if (tipo === 'blockquote') {
      return limpiarBloquesDeLista(nodo['content'], profundidad)
    }
    if (tipo === 'image') {
      return []
    }
    return [parrafo(limpiarEnLinea(nodo['content']))]
  })
}

function limpiarItems(nodos: unknown, profundidad: number): ItemDeLista[] {
  return comoLista(nodos).flatMap((item): ItemDeLista[] => {
    if (!esObjeto(item) || item['type'] !== 'listItem') {
      return []
    }
    const contenido = limpiarBloquesDeLista(item['content'], profundidad + 2)
    return [
      { type: 'listItem', content: contenido.length > 0 ? contenido : [{ type: 'paragraph' }] },
    ]
  })
}

// Lo que dice una lista demasiado honda, como párrafos sueltos.
function aplanar(items: unknown): Parrafo[] {
  return comoLista(items).flatMap((item): Parrafo[] => {
    if (!esObjeto(item)) {
      return []
    }
    return comoLista(item['content']).flatMap((bloque): Parrafo[] => {
      if (!esObjeto(bloque)) {
        return []
      }
      if (bloque['type'] === 'bulletList' || bloque['type'] === 'orderedList') {
        return aplanar(bloque['content'])
      }
      const contenido = limpiarEnLinea(bloque['content'])
      return contenido.length > 0 ? [parrafo(contenido)] : []
    })
  })
}

function inicioDeLista(nodo: Crudo): number | null {
  const attrs = nodo['attrs']
  const start = esObjeto(attrs) ? attrs['start'] : undefined
  return typeof start === 'number' && Number.isInteger(start) && start > 1 && start <= 99999
    ? start
    : null
}

// `profundidad` es la de la lista misma (el documento es 0).
function limpiarLista(nodo: Crudo, profundidad: number): BloqueDeLista[] {
  if (profundidad > PROFUNDIDAD_MAXIMA_DE_UNA_LISTA) {
    return aplanar(nodo['content'])
  }
  const items = limpiarItems(nodo['content'], profundidad)
  if (items.length === 0) {
    return []
  }
  if (nodo['type'] === 'bulletList') {
    return [{ type: 'bulletList', content: items }]
  }
  const desde = inicioDeLista(nodo)
  return [
    { type: 'orderedList', ...(desde === null ? {} : { attrs: { start: desde } }), content: items },
  ]
}

function nivelDelTitulo(nodo: Crudo): 2 | 3 {
  const attrs = nodo['attrs']
  return esObjeto(attrs) && attrs['level'] === 2 ? 2 : 3
}

function limpiarImagen(nodo: Crudo): Imagen[] {
  const attrs = nodo['attrs']
  const ruta = esObjeto(attrs) ? rutaDeImagenSegura(attrs['ruta']) : null
  if (ruta === null || !esObjeto(attrs)) {
    return []
  }
  const alt =
    typeof attrs['alt'] === 'string' ? [...attrs['alt']].slice(0, MAXIMO_DEL_ALT).join('') : ''
  return [{ type: 'image', attrs: { ruta, alt } }]
}

function limpiarBloques(nodos: unknown): Bloque[] {
  return comoLista(nodos).flatMap((nodo): Bloque[] => {
    if (!esObjeto(nodo)) {
      return []
    }
    switch (nodo['type']) {
      case 'bulletList':
      case 'orderedList':
        return limpiarLista(nodo, 1)
      case 'heading': {
        const contenido = limpiarEnLinea(nodo['content'])
        return contenido.length > 0
          ? [{ type: 'heading', attrs: { level: nivelDelTitulo(nodo) }, content: contenido }]
          : []
      }
      case 'blockquote': {
        const contenido = limpiarBloquesDeLista(nodo['content'], 2)
        return contenido.length > 0 ? [{ type: 'blockquote', content: contenido }] : []
      }
      case 'image':
        return limpiarImagen(nodo)
      default:
        return [parrafo(limpiarEnLinea(nodo['content']))]
    }
  })
}

// Lo que emite el editor, reducido a la lista blanca. Sin texto ni imagen, es «sin cuerpo» (`null`). Lo que pasa de tamaño o de niveles
// no se toca: el motivo lo dice `htmlDelDocumento` junto al editor.
export function documentoLimpio(valor: unknown): DocumentoDelSitio | null {
  const documento: DocumentoDelSitio = {
    type: 'doc',
    content: limpiarBloques(esObjeto(valor) ? valor['content'] : []),
  }
  const html = htmlDelDocumento(documento)
  return html.ok && html.html === '' ? null : documento
}
