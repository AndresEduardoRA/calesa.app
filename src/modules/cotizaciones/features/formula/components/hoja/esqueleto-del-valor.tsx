'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

// Mientras llega el valor por defecto del ⚙ (4.20-3b): una línea, con letrero para quien lee en voz alta.
export function EsqueletoDelValor() {
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
    <span
      aria-busy="true"
      aria-label="Cargando el valor por defecto"
      className="inline-block w-24 align-middle"
    >
      {visible ? <Skeleton className="h-5" /> : null}
    </span>
  )
}
