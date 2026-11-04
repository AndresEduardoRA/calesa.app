'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

// Mientras llega la primera página: tres filas, con letrero para quien lee en voz alta.
export function EsqueletoDeRevisiones() {
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
    <div aria-busy="true" aria-label="Cargando las revisiones" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </>
      ) : null}
    </div>
  )
}
