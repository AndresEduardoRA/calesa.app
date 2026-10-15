'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Al volver a la pestaña la ficha se vuelve a leer: otra persona pudo editarla, compartirla o
// quitarle el acceso a quien mira. Con el panel de edición abierto no se refresca: reiniciaría lo
// que se está escribiendo.
export function RefrescarAlVolver({ activo }: { activo: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!activo) {
      return
    }
    function alVolver() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [activo, router])
  return null
}
