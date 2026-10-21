'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('campos'),
  // El panel de una pestaña no sobrevive al cambiar a otra.
  campo: parseAsString,
  panel: parseAsString,
  origen: parseAsString,
  tipo: parseAsString,
  'tipo-de-seguimiento': parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasDeLeads() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={PESTANAS}
      valor={seccion}
      alElegir={(elegida) => {
        void setParametros({
          seccion: pestanaDe(elegida),
          campo: null,
          panel: null,
          origen: null,
          tipo: null,
          'tipo-de-seguimiento': null,
        })
      }}
    />
  )
}
