'use client'

import { useEffect, useState } from 'react'
import type { TablaDePaises } from '../../../entities/paises/resolver'

// La tabla de países se pide una sola vez, con `import()`, y recién cuando una pantalla la necesita
// (abrir el alta, el cambio del teléfono, un extra; la ficha ya hidratada; elegir un CSV): no entra en
// el JS de `/leads` ni en el de ninguna otra ruta. Un error de red al pedirla deja la pantalla como
// estaba: sin país, no rota; se vuelve a pedir la próxima vez.
let pedida: Promise<TablaDePaises> | null = null

export function cargarTablaDePaises(): Promise<TablaDePaises> {
  pedida ??= import('../../../entities/paises/tabla')
    .then((modulo) => modulo.TABLA_DE_PAISES)
    .catch((error: unknown) => {
      pedida = null
      throw error
    })
  return pedida
}

// `null` hasta que la tabla llega (también en el servidor y en el primer render: no hay diferencia
// de hidratación).
export function usePaises(activo: boolean): TablaDePaises | null {
  const [tabla, setTabla] = useState<TablaDePaises | null>(null)
  useEffect(() => {
    if (!activo) {
      return
    }
    let vigente = true
    cargarTablaDePaises().then(
      (cargada) => {
        if (vigente) {
          setTabla(cargada)
        }
      },
      () => undefined,
    )
    return () => {
      vigente = false
    }
  }, [activo])
  return tabla
}
