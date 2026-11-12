'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { alMenosUna } from '../empresa/pestanas'
import { CLAVES_DE_PESTANA, pestanaDe, type Pestana, type PestanaDeLeads } from './pestanas'

const parametrosCon = (porDefecto: Pestana) => ({
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault(porDefecto),
  // El panel de una pestaña no sobrevive al cambiar a otra.
  campo: parseAsString,
  panel: parseAsString,
  origen: parseAsString,
  tipo: parseAsString,
  'tipo-de-seguimiento': parseAsString,
})

type Props = {
  // Las cuatro; la que no se puede abrir, con su motivo (`pestanasPara()`).
  pestanas: readonly PestanaDeLeads[]
  // La primera habilitada: la que se abre sin `?seccion=`.
  porDefecto: Pestana
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasDeLeads({ pestanas, porDefecto }: Props) {
  const [{ seccion }, setParametros] = useQueryStates(
    useMemo(() => parametrosCon(porDefecto), [porDefecto]),
    { shallow: false },
  )
  const habilitadas = alMenosUna(pestanas.filter((p) => !p.motivo)) ?? [{ clave: porDefecto }]
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={pestanaDe(seccion, habilitadas)}
      alElegir={(elegida) => {
        void setParametros({
          seccion: pestanaDe(elegida, habilitadas),
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
