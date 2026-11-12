'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Inicio no es en tiempo real (la campana llega en la Fase 7): al volver a la pestaña relee, porque un turno pudo vencer o reasignarse mientras tanto.
export function ActualizarAlVolver() {
  const router = useRouter()
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
  return null
}
