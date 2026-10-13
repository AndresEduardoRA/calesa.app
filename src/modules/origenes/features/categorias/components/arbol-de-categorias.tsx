'use client'

import { PlusIcon } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  arbolDeCategorias,
  destinoDeMoverCategoria,
  type Categoria,
} from '../../../entities/categoria'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { useCategorias } from '../hooks/use-categorias'
import { ListaDeCategorias } from './lista-de-categorias'
import { PanelDeCategoria } from './panel-de-categoria'

type Props = {
  origenId: string
  // El sustantivo del origen: «3 unidades».
  sustantivo: string
  categorias: readonly Categoria[]
  puedeGestionar: boolean
}

const CATEGORIA_NUEVA = 'nueva'

function CabeceraDeCategorias(props: { puedeGestionar: boolean; alCrear: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="categorias-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
        Categorías
      </h2>
      <Button
        variant="outline"
        className="h-11 md:h-8"
        disabled={!props.puedeGestionar}
        onClick={props.alCrear}
      >
        <PlusIcon aria-hidden />
        Nueva categoría
      </Button>
    </div>
  )
}

// La pestaña «Categorías»: un árbol de un nivel con botones para subir y bajar. Cada categoría se
// edita en su panel (`?categoria=`).
export function ArbolDeCategorias({ origenId, sustantivo, categorias, puedeGestionar }: Props) {
  const ediciones = useCategorias()
  const [{ categoria: abierta }, setParametros] = useQueryStates(
    { categoria: parseAsString },
    { shallow: false },
  )
  const [ocupado, setOcupado] = useState(false)
  const arbol = arbolDeCategorias(categorias)
  const raices = arbol.map((nodo) => nodo.categoria)
  const categoriaAbierta =
    abierta === CATEGORIA_NUEVA
      ? CATEGORIA_NUEVA
      : (categorias.find((categoria) => categoria.id === abierta) ?? null)

  async function mover(
    categoria: Categoria,
    hermanas: readonly Categoria[],
    sentido: 'subir' | 'bajar',
  ) {
    const destino = destinoDeMoverCategoria(hermanas, categoria.id, sentido)
    if (!destino) {
      return
    }
    setOcupado(true)
    try {
      await ediciones.mover(categoria, destino.despuesDe)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section aria-labelledby="categorias-titulo" className="grid gap-4">
      <CabeceraDeCategorias
        puedeGestionar={puedeGestionar}
        alCrear={() => void setParametros({ categoria: CATEGORIA_NUEVA })}
      />
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
      {arbol.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay categorías"
          descripcion="Sirven para agrupar los vehículos del origen: marcas, segmentos, medio uso. Son opcionales."
          accion={
            puedeGestionar ? (
              <Button onClick={() => void setParametros({ categoria: CATEGORIA_NUEVA })}>
                Crear la primera
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListaDeCategorias
          arbol={arbol}
          sustantivo={sustantivo}
          puedeGestionar={puedeGestionar}
          ocupado={ocupado || ediciones.enCurso}
          alAbrir={(id) => void setParametros({ categoria: id })}
          alMover={(categoria, hermanas, sentido) => void mover(categoria, hermanas, sentido)}
        />
      )}
      <PanelDeCategoria
        categoria={categoriaAbierta}
        origenId={origenId}
        raices={raices}
        hijasDe={(id) => categorias.filter((categoria) => categoria.padreId === id)}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={() => void setParametros({ categoria: null })}
      />
    </section>
  )
}
