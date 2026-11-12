'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { EstadoError } from '@/shared/ui/estados'

// Un widget que no pudo leer: «Reintentar» vuelve a pedir la pantalla; los demás widgets no se tocan.
export function ErrorDeWidget() {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  return (
    <div aria-busy={pendiente}>
      <EstadoError alReintentar={() => empezar(() => router.refresh())} />
    </div>
  )
}
