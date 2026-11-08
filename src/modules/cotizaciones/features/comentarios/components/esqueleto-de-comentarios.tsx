'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

// Mientras llega la primera página de comentarios: tres renglones con avatar y dos líneas, con letrero para quien lee en voz alta.
export function EsqueletoDeComentarios() {
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
    <div aria-busy="true" aria-label="Cargando los comentarios" className="grid gap-3">
      {visible
        ? [0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        : null}
    </div>
  )
}
