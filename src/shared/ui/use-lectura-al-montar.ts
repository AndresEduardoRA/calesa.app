'use client'

import { useEffect, useState } from 'react'
import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'

export type LecturaAlMontar<T> =
  { estado: 'leyendo' } | { estado: 'leido'; dato: T } | { estado: 'fallo'; error: ErrorApp }

type Guardada<T> = { clave: string; lectura: LecturaAlMontar<T> }

// Lo que lee algo al montarse (una pestaña de un resumen al elegirla, el panel de edición al abrirse): `leer` corre una vez por `clave` (a
// quién se lee) y por `reintentar()`. Una respuesta que llega tarde (se cambió de clave, o se volvió a pedir) se descarta. Es el hermano de
// `useLecturaAPedido`, que lee cuando la persona lo pide.
export function useLecturaAlMontar<T>(leer: () => Promise<Resultado<T>>, clave: string) {
  const [guardada, setGuardada] = useState<Guardada<T> | null>(null)
  const [intento, setIntento] = useState(0)
  const pedido = `${clave}:${String(intento)}`

  useEffect(() => {
    let vigente = true
    void leer()
      .then((resultado): LecturaAlMontar<T> =>
        resultado.ok
          ? { estado: 'leido', dato: resultado.data }
          : { estado: 'fallo', error: resultado.error },
      )
      .catch((): LecturaAlMontar<T> => ({
        estado: 'fallo',
        error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO },
      }))
      .then((lectura) => {
        if (vigente) {
          setGuardada({ clave: pedido, lectura })
        }
      })
    return () => {
      vigente = false
    }
    // `leer` cambia en cada render; lo que decide cuándo se vuelve a leer es el pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido])

  const lectura: LecturaAlMontar<T> =
    guardada !== null && guardada.clave === pedido ? guardada.lectura : { estado: 'leyendo' }
  return {
    lectura,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
