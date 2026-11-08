'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { EditorDelDiseno } from './editor-del-diseno'
import { SelectorDeOrigen } from './selector-de-origen'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origenes: readonly Origen[]
  origen: Origen
  // La versión que se edita; con diseño nulo no hay nada que editar.
  leida: DisenoParaEditar | null
  niveles: readonly NivelDelDiseno[]
}

// La pestaña «Diseño» de Configuración › Cotización (4.22-2): el origen (con 2 o más, un selector que escribe `?origen=`) y su diseño. Sin versión o sin diseño, un
// vacío. El editor no se vuelve a montar al guardar (su `key` no lleva la versión); sólo «Recargar» tras un conflicto lo monta de nuevo, en la misma transición que
// trae la pestaña, sobre lo que haya entonces.
export function DisenoDelOrigen({ origenes, origen, leida, niveles }: Props) {
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [recargando, recargarPagina] = useTransition()
  const recargar = () => {
    recargarPagina(() => {
      router.refresh()
      setVuelta((v) => v + 1)
    })
  }
  const diseno = leida?.diseno ?? null
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-0.5">
        <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Diseño</h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Cómo se ve y se maneja la hoja de cada origen: sus secciones, sus celdas y quién ve y
          edita cada una.
        </p>
      </div>
      <SelectorDeOrigen origenes={origenes} origen={origen} />
      {leida === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Este origen todavía no tiene una fórmula.
        </p>
      ) : diseno === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Esta versión no tiene diseño de la hoja.
        </p>
      ) : (
        <EditorDelDiseno
          key={`${origen.id}:${String(vuelta)}`}
          origen={origen}
          leida={leida}
          disenoLeido={diseno}
          niveles={niveles}
          recargando={recargando}
          alRecargar={recargar}
        />
      )}
    </div>
  )
}
