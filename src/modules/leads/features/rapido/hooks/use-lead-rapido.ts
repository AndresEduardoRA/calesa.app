'use client'

import { useEffect, useRef, useState } from 'react'
import { leerLeadRapido } from '../../../composicion.client'
import type { LecturaDelRapido } from '../../../entities/rapido'

// Lee el lead del drawer con la sesión de quien mira y lo vuelve a leer al volver a la pestaña:
// si mientras tanto le quitaron el acceso, o lo mandaron a la papelera, el drawer lo dice. Con un modal
// abierto adentro (`pausado`) no vuelve a leer: «no disponible» reemplazaría el contenido y se llevaría
// el modal con lo escrito; si el lead dejó de verse, lo dice el modal al guardar.
export function useLeadRapido(id: string | null, pausado = false) {
  const [lectura, setLectura] = useState<LecturaDelRapido | null>(null)
  const [intento, setIntento] = useState(0)
  const enPausa = useRef(pausado)
  useEffect(() => {
    enPausa.current = pausado
  })

  useEffect(() => {
    if (id === null) {
      return
    }
    let vigente = true
    // `relectura`: la de volver a la pestaña. Si al llegar hay un modal abierto, se descarta (pudo
    // salir justo antes de abrirlo): «no disponible» desmontaría el modal con lo escrito.
    const leer = async (relectura: boolean) => {
      let nueva: LecturaDelRapido
      try {
        const leido = await leerLeadRapido(id)
        nueva = !leido.ok
          ? { id, estado: 'error' }
          : leido.data === null
            ? { id, estado: 'no_disponible' }
            : { id, estado: 'listo', lead: leido.data }
      } catch {
        nueva = { id, estado: 'error' }
      }
      if (vigente && !(relectura && enPausa.current)) {
        setLectura(nueva)
      }
    }
    void leer(false)
    const alVolver = () => {
      if (document.visibilityState === 'visible' && !enPausa.current) {
        void leer(true)
      }
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      vigente = false
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [id, intento])

  // Una lectura de otro lead (se cambió de lead) no vale: se espera la nueva.
  const actual = lectura !== null && lectura.id === id ? lectura : null
  return {
    lectura: actual,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
