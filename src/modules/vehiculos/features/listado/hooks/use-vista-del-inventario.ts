'use client'

import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { CLAVE_DE_VISTA_DE_VEHICULOS, guardarPreferencia } from '@/modules/equipo/client'
import { CLAVE_DE_VISTA, vistaDeLista, type VistaDeLista } from '@/shared/lib/vista-de-lista'
import { avisarError } from '@/shared/ui/toasts'

// Tabla o tarjetas en escritorio: `?vista=` (para compartir lo que se ve) o, si no dice nada, lo que la persona eligió la última vez.
// Cambiar escribe la URL sin volver a pedir la página (las filas son las mismas) y guarda la preferencia, así la encuentra igual en
// su otro dispositivo. Si no se pudo guardar, la vista igual cambió en esta pestaña: sólo se avisa lo que la persona tiene que saber.
export function useVistaDelInventario(preferida: VistaDeLista | null) {
  const parametros = useSearchParams()
  const vista = vistaDeLista({ pedida: parametros.get(CLAVE_DE_VISTA), preferida })
  const { execute } = useAction(guardarPreferencia, {
    onError: ({ error }) => {
      if (error.serverError) avisarError(error.serverError)
    },
  })
  const cambiar = useCallback(
    (nueva: VistaDeLista) => {
      const siguientes = new URLSearchParams(parametros.toString())
      siguientes.set(CLAVE_DE_VISTA, nueva)
      window.history.replaceState(null, '', `${window.location.pathname}?${siguientes.toString()}`)
      execute({ clave: CLAVE_DE_VISTA_DE_VEHICULOS, valor: nueva })
    },
    [parametros, execute],
  )
  return { vista, cambiar }
}
