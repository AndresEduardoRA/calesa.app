'use client'

import { useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerLayoutActivo, type LayoutActivo } from '../../../composicion.client'

export type { LayoutActivo }

export type LayoutLeido =
  | { estado: 'cargando' }
  | { estado: 'listo'; layout: LayoutActivo }
  | { estado: 'error'; error: ErrorApp }

// El layout activo de un origen leído desde el navegador, al montarse (el alta del panel del vehículo de la hoja de cotizar: la hoja no lo carga en cada apertura, P2 del 4.14-2c). Cada respuesta
// guarda el pedido que la trajo, así que un reintento vuelve a "cargando" y una respuesta vieja no se muestra.
export function useLayoutActivo(origenId: string) {
  const [intento, setIntento] = useState(0)
  const clave = `${origenId}|${String(intento)}`
  const [respuesta, setRespuesta] = useState<{
    clave: string
    resultado: Resultado<LayoutActivo>
  } | null>(null)
  useEffect(() => {
    let vigente = true
    leerLayoutActivo(origenId)
      .catch(() => fallo('inesperado', 'No se pudo leer el formulario del origen.'))
      .then((resultado) => {
        if (vigente) {
          setRespuesta({ clave, resultado })
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [clave, origenId])
  const leido: LayoutLeido =
    respuesta?.clave !== clave
      ? { estado: 'cargando' }
      : respuesta.resultado.ok
        ? { estado: 'listo', layout: respuesta.resultado.data }
        : { estado: 'error', error: respuesta.resultado.error }
  return {
    leido,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
