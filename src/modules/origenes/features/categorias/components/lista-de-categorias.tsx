import {
  destinoDeMoverCategoria,
  type Categoria,
  type NodoDeCategoria,
} from '../../../entities/categoria'
import { FilaDeCategoria } from './fila-de-categoria'

type Props = {
  arbol: readonly NodoDeCategoria[]
  sustantivo: string
  puedeGestionar: boolean
  ocupado: boolean
  alAbrir: (id: string) => void
  alMover: (
    categoria: Categoria,
    hermanas: readonly Categoria[],
    sentido: 'subir' | 'bajar',
  ) => void
}

// Las raíces en su orden y, debajo de cada una, sus hijas sangradas.
export function ListaDeCategorias(props: Props) {
  const { arbol, sustantivo, puedeGestionar, ocupado, alAbrir, alMover } = props
  const raices = arbol.map((nodo) => nodo.categoria)

  function fila(categoria: Categoria, hermanas: readonly Categoria[], esHija: boolean) {
    return (
      <FilaDeCategoria
        key={categoria.id}
        categoria={categoria}
        sustantivo={sustantivo}
        puedeGestionar={puedeGestionar}
        ocupado={ocupado}
        puedeSubir={destinoDeMoverCategoria(hermanas, categoria.id, 'subir') !== null}
        puedeBajar={destinoDeMoverCategoria(hermanas, categoria.id, 'bajar') !== null}
        esHija={esHija}
        alAbrir={() => {
          alAbrir(categoria.id)
        }}
        alSubir={() => {
          alMover(categoria, hermanas, 'subir')
        }}
        alBajar={() => {
          alMover(categoria, hermanas, 'bajar')
        }}
      />
    )
  }

  return (
    <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      {arbol.flatMap((nodo) => [
        fila(nodo.categoria, raices, false),
        ...nodo.hijas.map((hija) => fila(hija, nodo.hijas, true)),
      ])}
    </ul>
  )
}
