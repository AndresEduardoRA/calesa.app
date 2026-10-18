'use client'

import { useEffect, useRef, useState } from 'react'
import { leerVehiculoDelResumen } from '../../../composicion.client'
import type { LecturaDelResumen } from '../../../entities/resumen'

// Lee el vehículo del resumen con la sesión de quien mira y lo vuelve a leer al volver a la pestaña: si mientras tanto le quitaron el
// acceso, o lo mandaron a la papelera, el resumen lo dice. Con el panel de edición encima (`pausado`) no vuelve a leer: «no disponible»
// reemplazaría el contenido y se llevaría lo que se está escribiendo; si el vehículo dejó de verse, lo dice el guardado.
export function useVehiculoDelResumen(id: string | null, pausado: boolean) {
  const [lectura, setLectura] = useState<LecturaDelResumen | null>(null)
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
    // `relectura`: la de volver a la pestaña. Si al llegar hay un panel de edición encima, se descarta (pudo salir justo antes de
    // abrirlo).
    const leer = async (relectura: boolean) => {
      let nueva: LecturaDelResumen
      try {
        const leido = await leerVehiculoDelResumen(id)
        nueva = !leido.ok
          ? { id, estado: 'error' }
          : leido.data === null
            ? { id, estado: 'no_disponible' }
            : { id, estado: 'listo', vehiculo: leido.data }
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

  // Una lectura de otro vehículo (se cambió de vehículo) no vale: se espera la nueva.
  const actual = lectura !== null && lectura.id === id ? lectura : null
  return {
    lectura: actual,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
