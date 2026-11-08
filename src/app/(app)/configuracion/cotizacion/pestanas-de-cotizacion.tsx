'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import type { AlMenosUna } from '../empresa/pestanas'

type Props = {
  // Las pestañas que esta persona puede abrir, sin sus permisos: la página decide cuáles.
  pestanas: AlMenosUna<{ clave: string; titulo: string }>
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace. La primera es la de por defecto: elegirla quita `?seccion=`.
export function PestanasDeCotizacion({ pestanas }: Props) {
  const parametros = useMemo(
    () => ({
      seccion: parseAsStringLiteral(pestanas.map((pestana) => pestana.clave)).withDefault(
        pestanas[0].clave,
      ),
      // Lo abierto en una pestaña no sobrevive al cambiar a otra.
      panel: parseAsString,
      nivel: parseAsString,
      origen: parseAsString,
      version: parseAsString,
      tabla: parseAsString,
    }),
    [pestanas],
  )
  const [{ seccion }, setParametros] = useQueryStates(parametros, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({
          seccion: elegida,
          panel: null,
          nivel: null,
          origen: null,
          version: null,
          tabla: null,
        })
      }}
    />
  )
}
