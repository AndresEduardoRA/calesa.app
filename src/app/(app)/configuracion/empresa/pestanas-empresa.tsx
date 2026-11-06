'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from './pestanas'

type Props = {
  // Las pestañas que esta persona puede abrir, sin sus permisos: la página decide cuáles.
  pestanas: AlMenosUna<{ clave: string; titulo: string }>
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace. Los parsers se arman con las
// claves que llegan, y la primera es la de por defecto: elegirla quita `?seccion=` de la URL.
export function PestanasEmpresa({ pestanas }: Props) {
  const parametros = useMemo(
    () => ({
      seccion: parseAsStringLiteral(pestanas.map((pestana) => pestana.clave)).withDefault(
        pestanas[0].clave,
      ),
      // Los paneles de una pestaña no sobreviven al cambiar a otra.
      tc: parseAsString,
      moneda: parseAsString,
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
        void setParametros({ seccion: elegida, tc: null, moneda: null, panel: null })
      }}
    />
  )
}
