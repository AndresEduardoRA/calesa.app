'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'

const REFRESCAN = new Set(['sin_permiso', 'regla', 'no_encontrado'])

// Lo común a las escrituras de «Reglas» y de la oferta: un pedido a la vez y la última versión conocida del flujo (la de la página o la de la última
// respuesta, la más nueva). Así apagar A, apagar B y «Deshacer» A no da un conflicto por culpa de la propia persona; si otra persona tocó el flujo, el
// conflicto sale igual y se dice dentro de la pantalla, no en un toast.
export function useEscrituraDeReglas(versionDelServidor: string) {
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()
  const version = useRef(versionDelServidor)
  const [conflicto, setConflicto] = useState<string | null>(null)

  useEffect(() => {
    version.current = versionDelServidor
  }, [versionDelServidor])

  function rechazar<T>(envio: Envio<T>) {
    if (envio.ok) {
      return
    }
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) {
      router.refresh()
    }
  }

  return {
    mandar: unaVez.mandar,
    enCurso: unaVez.enCurso,
    ultimaVersion: () => version.current,
    conocer: (nueva: string) => {
      version.current = nueva
    },
    conflicto,
    rechazar,
    recargar: () => {
      setConflicto(null)
      router.refresh()
    },
  }
}

export type EscrituraDeReglas = ReturnType<typeof useEscrituraDeReglas>
