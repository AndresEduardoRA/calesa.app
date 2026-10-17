'use client'

import { useRef, useState } from 'react'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'

export type LecturaAPedido<T> =
  | { estado: 'sin_pedir' }
  | { estado: 'leyendo' }
  | { estado: 'leido'; dato: T }
  | { estado: 'fallo'; error: ErrorApp }

type Guardada<T> = { version: string; lectura: LecturaAPedido<T> }

// Algo que se lee sólo cuando la persona lo pide («Mostrar los 200» de un lote de la papelera, cierre 1). Lo leído vale
// para una `version` de lo que se mira: si cambia (la página se volvió a leer tras restaurar o purgar), vuelve a «sin
// pedir» y no se muestra algo viejo. Una respuesta que llega tarde (se volvió a pedir, o cambió la versión) se descarta.
export function useLecturaAPedido<T>(leer: () => Promise<Resultado<T>>, version: string) {
  const [guardada, setGuardada] = useState<Guardada<T>>({
    version,
    lectura: { estado: 'sin_pedir' },
  })
  const turno = useRef(0)

  const pedir = async () => {
    turno.current += 1
    const mio = turno.current
    setGuardada({ version, lectura: { estado: 'leyendo' } })
    const resultado = await leer()
    if (mio !== turno.current) {
      return
    }
    setGuardada({
      version,
      lectura: resultado.ok
        ? { estado: 'leido', dato: resultado.data }
        : { estado: 'fallo', error: resultado.error },
    })
  }

  const lectura: LecturaAPedido<T> =
    guardada.version === version ? guardada.lectura : { estado: 'sin_pedir' }
  return { lectura, pedir }
}
