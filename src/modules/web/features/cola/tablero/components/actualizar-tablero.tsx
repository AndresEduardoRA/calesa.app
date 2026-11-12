'use client'

import { RefreshCwIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { Button } from '@/shared/ui/button'

// El tablero no es en tiempo real: «Actualizar» lo vuelve a leer, y también al volver a la pestaña (otra persona pudo cambiar la rueda o los turnos).
export function ActualizarTablero() {
  const router = useRouter()
  const [leyendo, empezar] = useTransition()

  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [router])

  return (
    <Button
      variant="outline"
      className="min-h-11 md:min-h-9"
      disabled={leyendo}
      onClick={() => {
        empezar(() => {
          router.refresh()
        })
      }}
    >
      <RefreshCwIcon aria-hidden className={leyendo ? 'motion-safe:animate-spin' : undefined} />
      {leyendo ? 'Actualizando…' : 'Actualizar'}
    </Button>
  )
}
