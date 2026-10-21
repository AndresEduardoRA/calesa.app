'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('empresa'),
  // Los paneles de una pestaña no sobreviven al cambiar a otra.
  tc: parseAsString,
  moneda: parseAsString,
  panel: parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasEmpresa() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={PESTANAS}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({ seccion: pestanaDe(elegida), tc: null, moneda: null, panel: null })
      }}
    />
  )
}
