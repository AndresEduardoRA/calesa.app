'use client'

import { parseAsStringLiteral, useQueryStates } from 'nuqs'
import type { PestanaDeDatos } from '@/modules/datos'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'

const PARAMETROS = {
  seccion: parseAsStringLiteral(['exportar', 'importar'] as const).withDefault('exportar'),
}

// La barra de `/datos`: la sección abierta vive en la URL (`?seccion=`). «Importar» sin permiso se ve apagada con su motivo (D42).
export function PestanasDeDatos({
  pestanas,
  valor,
}: {
  pestanas: PestanaDeDatos[]
  valor: PestanaDeDatos['clave']
}) {
  const [, fijar] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={valor}
      alElegir={(elegida) => {
        void fijar({ seccion: elegida === 'importar' ? 'importar' : 'exportar' })
      }}
    />
  )
}
