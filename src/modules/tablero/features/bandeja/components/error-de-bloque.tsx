'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { EstadoError } from '@/shared/ui/estados'

// Un bloque que no pudo leer: «Reintentar» vuelve a pedir la pantalla; los demás bloques no se tocan.
export function ErrorDeBloque() {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  return (
    <div aria-busy={pendiente}>
      <EstadoError alReintentar={() => empezar(() => router.refresh())} />
    </div>
  )
}
