'use client'

import { EditorDeCampos as EditorCompartido } from '@/shared/ui/campos'
import type { CampoDeLayout } from '../../../entities/campo'
import type { TipoDeOrigen } from '../../../entities/origen'
import { configuracionDeOrigen } from '../configuracion'
import { useCampos } from '../hooks/use-campos'

type Props = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly CampoDeLayout[]
  puedeGestionar: boolean
}

// La pestaña «Campos» de un origen: el editor compartido con las banderas, los textos y las
// operaciones de los vehículos.
export function EditorDeCampos({ origenId, tipoDeOrigen, campos, puedeGestionar }: Props) {
  const ediciones = useCampos()
  return (
    <EditorCompartido
      campos={campos}
      puedeGestionar={puedeGestionar}
      configuracion={configuracionDeOrigen({ origenId, tipoDeOrigen })}
      ediciones={ediciones}
    />
  )
}
