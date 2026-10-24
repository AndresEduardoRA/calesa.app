'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('niveles'),
  // El panel de una pestaña no sobrevive al cambiar a otra.
  panel: parseAsString,
  nivel: parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasDeCotizacion() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={PESTANAS}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({ seccion: pestanaDe(elegida), panel: null, nivel: null })
      }}
    />
  )
}
