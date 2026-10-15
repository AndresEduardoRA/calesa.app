import type { ReactNode } from 'react'
import {
  esObjeto,
  hrefSeguro,
  validarDocumento,
  type Crudo,
  type Marca,
} from '../../../entities/documento'

type Props = {
  documento: unknown
  // El texto que derivó la base: se muestra cuando no hay documento (los del alta) o cuando el
  // documento no pasa la lista blanca (una fila escrita por fuera).
  texto: string | null
}

function conMarcas(contenido: ReactNode, marcas: unknown): ReactNode {
  if (!Array.isArray(marcas)) {
    return contenido
  }
  return (marcas as Marca[]).reduce<ReactNode>((dentro, marca) => {
    if (marca.type === 'bold') {
      return <strong>{dentro}</strong>
    }
    if (marca.type === 'italic') {
      return <em>{dentro}</em>
    }
    const href = hrefSeguro(marca.attrs.href)
    if (href === null) {
      return dentro
    }
    const web = /^https?:/i.test(href)
    return (
      <a href={href} rel="noopener noreferrer nofollow" {...(web ? { target: '_blank' } : {})}>
        {dentro}
      </a>
    )
  }, contenido)
}

// Los nodos que sólo envuelven a sus hijos.
const ENVOLTORIOS = { paragraph: 'p', bulletList: 'ul', listItem: 'li' } as const

const esEnvoltorio = (tipo: unknown): tipo is keyof typeof ENVOLTORIOS =>
  typeof tipo === 'string' && tipo in ENVOLTORIOS

function inicioDe(nodo: Crudo): number {
  return esObjeto(nodo.attrs) && typeof nodo.attrs.start === 'number' ? nodo.attrs.start : 1
}

// Un nodo y sus hijos, con la misma lista blanca de la base: lo que no conoce se dibuja como su
// texto. Nunca `innerHTML`: el texto lo escapa React.
function Nodo({ nodo }: { nodo: unknown }): ReactNode {
  if (!esObjeto(nodo)) {
    return null
  }
  if (nodo.type === 'text') {
    return typeof nodo.text === 'string' ? conMarcas(nodo.text, nodo.marks) : null
  }
  if (nodo.type === 'hardBreak') {
    return <br />
  }
  const hijos = Array.isArray(nodo.content)
    ? nodo.content.map((hijo: unknown, n) => <Nodo key={n} nodo={hijo} />)
    : null
  if (nodo.type === 'orderedList') {
    return <ol start={inicioDe(nodo)}>{hijos}</ol>
  }
  if (esEnvoltorio(nodo.type)) {
    const Etiqueta = ENVOLTORIOS[nodo.type]
    return <Etiqueta>{hijos}</Etiqueta>
  }
  return <>{hijos}</>
}

// El detalle de un seguimiento, dibujado desde su documento. Sin documento (o uno que no pasa la
// lista blanca), el texto plano con sus saltos de línea.
export function DocumentoDeSeguimiento({ documento, texto }: Props) {
  const valido = validarDocumento(documento)
  if (valido.ok && valido.documento) {
    return (
      <div className="documento-de-seguimiento grid gap-1 text-(length:--text-sm) text-(--color-ink)">
        <Nodo nodo={valido.documento} />
      </div>
    )
  }
  if (texto === null || texto.trim() === '') {
    return null
  }
  return (
    <p className="documento-de-seguimiento text-(length:--text-sm) whitespace-pre-line text-(--color-ink)">
      {texto}
    </p>
  )
}
