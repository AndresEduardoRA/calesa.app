'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from '../empresa/pestanas'

type Props = {
  // Las pestañas que esta persona puede abrir, sin sus permisos: la página decide cuáles.
  pestanas: AlMenosUna<{ clave: string; titulo: string }>
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace. La primera es la de por defecto: elegirla quita `?seccion=`. Conserva el flujo
// (`?origen=`, `?ambito=`) y limpia lo abierto de la pestaña anterior (`?fase=`, `?panel=`). La página la dibuja sólo con dos o más pestañas visibles.
export function PestanasDeFlujos({ pestanas }: Props) {
  const parametros = useMemo(
    () => ({
      seccion: parseAsStringLiteral(pestanas.map((pestana) => pestana.clave)).withDefault(
        pestanas[0].clave,
      ),
      fase: parseAsString,
      panel: parseAsString,
    }),
    [pestanas],
  )
  const [{ seccion }, setParametros] = useQueryStates(parametros, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({ seccion: elegida, fase: null, panel: null })
      }}
    />
  )
}
