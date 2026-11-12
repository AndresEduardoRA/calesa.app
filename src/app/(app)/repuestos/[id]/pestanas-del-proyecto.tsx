'use client'

import { parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from '../../configuracion/empresa/pestanas'
import { PESTANA_DE_ITEMS, type PestanaDelProyecto } from './pestanas'

// La barra de pestañas del proyecto: la abierta vive en la URL (`?pestana=`; la primera es la de por defecto). La página la dibuja sólo con dos o más pestañas llenas.
export function PestanasDelProyecto({ pestanas }: { pestanas: AlMenosUna<PestanaDelProyecto> }) {
  const parametros = useMemo(
    () => ({
      pestana: parseAsStringLiteral(pestanas.map((p) => p.clave)).withDefault(PESTANA_DE_ITEMS),
    }),
    [pestanas],
  )
  const [{ pestana }, fijar] = useQueryStates(parametros, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={pestana}
      alElegir={(elegida) => {
        void fijar({ pestana: elegida })
      }}
    />
  )
}
