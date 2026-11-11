'use client'

import { parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from '../empresa/pestanas'

type Props = {
  // Los catálogos que esta persona puede abrir, sin su componente: la página decide cuáles.
  pestanas: AlMenosUna<{ clave: string; titulo: string }>
}

// El catálogo abierto vive en la URL (`?seccion=`): se puede recargar y compartir. El primero es el de por defecto: elegirlo quita `?seccion=`. La página la dibuja sólo
// con dos o más catálogos visibles.
export function PestanasDeLogistica({ pestanas }: Props) {
  const parametros = useMemo(
    () => ({
      seccion: parseAsStringLiteral(pestanas.map((pestana) => pestana.clave)).withDefault(
        pestanas[0].clave,
      ),
    }),
    [pestanas],
  )
  const [{ seccion }, setParametros] = useQueryStates(parametros, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({ seccion: elegida })
      }}
    />
  )
}
