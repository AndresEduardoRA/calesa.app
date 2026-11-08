import type { Nodo } from '../../../entities/nodos'

const MAXIMO_DE_OPCIONES_A_LA_VISTA = 4

type Props = {
  tipo: 'variante' | 'subtotal'
  nodo: string
  etiqueta: string
  // El nodo de la fórmula: la variante lista sus opciones.
  definicion: Nodo | undefined
}

function textoDeLaVariante(definicion: Nodo | undefined) {
  const opciones = definicion?.tipo === 'opcion' ? definicion.opciones.map((o) => o.etiqueta) : []
  const vistas = opciones.slice(0, MAXIMO_DE_OPCIONES_A_LA_VISTA).join(', ')
  const resto = opciones.length - MAXIMO_DE_OPCIONES_A_LA_VISTA
  const lista = resto > 0 ? `${vistas} y ${String(resto)} más` : vistas
  return `Se elige con chips: ${lista}. La hoja siempre la pide.`
}

// Variante y subtotal no tienen más campo que su nodo: se ven, no se editan (cambiarles el nodo es mover estructura).
export function ItemDeLectura({ tipo, nodo, etiqueta, definicion }: Props) {
  return (
    <li
      className="min-w-0 rounded-(--radius-md) border border-dashed border-(--color-line) p-3"
      data-item={`${tipo}:${nodo}`}
    >
      <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
        {tipo === 'variante' ? `Variante ${etiqueta}.` : `Subtotal ${etiqueta}.`}
      </p>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {tipo === 'variante'
          ? textoDeLaVariante(definicion)
          : 'Se dibuja como una franja con el total de lo que suma.'}
      </p>
    </li>
  )
}
