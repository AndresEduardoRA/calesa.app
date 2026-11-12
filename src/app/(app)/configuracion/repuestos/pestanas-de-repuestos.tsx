'use client'

import { parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from '../empresa/pestanas'

type Props = {
  // Las pestañas que esta persona puede abrir: la página decide cuáles.
  pestanas: AlMenosUna<{ clave: string; titulo: string }>
}

// La pestaña abierta vive en la URL (`?seccion=`): se puede recargar y compartir. La primera («Catálogos») es la de por defecto: elegirla quita `?seccion=`.
// La página la dibuja sólo con dos o más pestañas visibles (8.12-2, C10).
export function PestanasDeRepuestos({ pestanas }: Props) {
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
