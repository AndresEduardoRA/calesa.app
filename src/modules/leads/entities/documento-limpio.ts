// Lo que entra al editor y lo que sale de él, reducido a la lista blanca de `documento.ts`.
import {
  esObjeto,
  hrefSeguro,
  recortar,
  textosDe,
  type Bloque,
  type Crudo,
  type Documento,
  type EnLinea,
  type ItemDeLista,
  type Marca,
  type Parrafo,
} from './documento'

const comoLista = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : [])

function limpiarMarcas(marcas: unknown): Marca[] {
  const vistas = new Set<string>()
  return comoLista(marcas).flatMap((marca): Marca[] => {
    if (!esObjeto(marca) || typeof marca.type !== 'string' || vistas.has(marca.type)) {
      return []
    }
    if (marca.type === 'bold' || marca.type === 'italic') {
      vistas.add(marca.type)
      return [{ type: marca.type }]
    }
    const href =
      marca.type === 'link' && esObjeto(marca.attrs) ? hrefSeguro(marca.attrs.href) : null
    if (href === null) {
      return []
    }
    vistas.add('link')
    return [{ type: 'link', attrs: { href } }]
  })
}

function limpiarEnLinea(nodos: unknown): EnLinea[] {
  return comoLista(nodos).flatMap((nodo): EnLinea[] => {
    if (!esObjeto(nodo)) {
      return []
    }
    const marcas = limpiarMarcas(nodo.marks)
    const conMarcas = marcas.length > 0 ? { marks: marcas } : {}
    if (nodo.type === 'hardBreak') {
      return [{ type: 'hardBreak', ...conMarcas }]
    }
    const texto = typeof nodo.text === 'string' ? nodo.text : textosDe(nodo)
    return texto === '' ? [] : [{ type: 'text', text: texto, ...conMarcas }]
  })
}

function limpiarItems(nodos: unknown): ItemDeLista[] {
  return comoLista(nodos).flatMap((item): ItemDeLista[] => {
    if (!esObjeto(item) || item.type !== 'listItem') {
      return []
    }
    const contenido = limpiarBloques(item.content)
    return [
      { type: 'listItem', content: contenido.length > 0 ? contenido : [{ type: 'paragraph' }] },
    ]
  })
}

function limpiarLista(nodo: Crudo): Bloque[] {
  const items = limpiarItems(nodo.content)
  if (items.length === 0) {
    return []
  }
  if (nodo.type === 'bulletList') {
    return [{ type: 'bulletList', content: items }]
  }
  const start = esObjeto(nodo.attrs) ? nodo.attrs.start : undefined
  const desde = typeof start === 'number' && Number.isInteger(start) && start > 1 ? start : null
  return [
    { type: 'orderedList', ...(desde === null ? {} : { attrs: { start: desde } }), content: items },
  ]
}

function limpiarBloques(nodos: unknown): Bloque[] {
  return comoLista(nodos).flatMap((nodo): Bloque[] => {
    if (!esObjeto(nodo)) {
      return []
    }
    if (nodo.type === 'bulletList' || nodo.type === 'orderedList') {
      return limpiarLista(nodo)
    }
    const contenido = limpiarEnLinea(nodo.content)
    return [
      contenido.length > 0 ? { type: 'paragraph', content: contenido } : { type: 'paragraph' },
    ]
  })
}

// El editor agrega atributos que la lista no admite (el `target`, el `rel` y la `class` de un
// enlace, el `type` de una lista numerada). Se deja sólo lo que la base acepta; un nodo o una
// marca que no conoce se pierde, pero su texto queda. Sin ningún texto, es «sin detalle».
export function documentoLimpio(valor: unknown): Documento | null {
  const documento: Documento = {
    type: 'doc',
    content: limpiarBloques(esObjeto(valor) ? valor.content : []),
  }
  return recortar(textosDe(documento)) === '' ? null : documento
}

// El detalle de un seguimiento del alta (sólo texto): un párrafo por línea, para que el editor
// arranque con lo que había.
export function documentoDesdeTexto(texto: string | null): Documento | null {
  if (texto === null || recortar(texto) === '') {
    return null
  }
  return {
    type: 'doc',
    content: texto
      .split('\n')
      .map((linea): Parrafo =>
        linea === ''
          ? { type: 'paragraph' }
          : { type: 'paragraph', content: [{ type: 'text', text: linea }] },
      ),
  }
}
