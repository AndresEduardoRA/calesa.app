'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

// Mientras llega el valor del ⚙ (4.20-3b; el de un tipo de cambio, 4.20-3d): una línea, con letrero para quien lee en voz alta.
export function EsqueletoDelValor({
  letrero = 'Cargando el valor por defecto',
}: {
  letrero?: string
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, ESPERA_DEL_ESQUELETO_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <span aria-busy="true" aria-label={letrero} className="inline-block w-24 align-middle">
      {visible ? <Skeleton className="h-5" /> : null}
    </span>
  )
}
