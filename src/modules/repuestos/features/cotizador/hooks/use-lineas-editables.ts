'use client'

import { useCallback, useMemo, useState } from 'react'
import type { BloqueDeCotizacion } from '../../../entities/cotizador/formula'
import {
  cantidadDeCelda,
  lineaNueva,
  montoDeCelda,
  type ItemParaCotizar,
  type LineaEditable,
} from '../../../entities/cotizador/hoja-editable'

const CAMPOS_NUMERICOS = new Set(['cantidad', 'costo', 'logistica'])

function sinClave(errores: Record<string, string>, clave: string): Record<string, string> {
  if (!(clave in errores)) return errores
  const resto = { ...errores }
  delete resto[clave]
  return resto
}

// Las líneas de la hoja editable y sus errores por celda (8.12-4, C10–C11). Lo que emite una `XCell` pasa por `montoDeCelda`/`cantidadDeCelda`: si no
// sirve, no entra al estado y la celda muestra el error. Los callbacks son estables (`memo` de la `XCell` y de la línea): el id de celda es
// `<línea>:<campo>`.
export function useLineasEditables(iniciales: readonly LineaEditable[]) {
  const [lineas, setLineas] = useState<LineaEditable[]>(() => [...iniciales])
  // Los de la celda (lo tipeado no sirve) y los de la base (`porCampo` del último guardar), por `<línea>:<campo>`.
  const [errores, setErrores] = useState<Record<string, string>>({})

  const cambiar = useCallback((id: string, cambios: Partial<LineaEditable>) => {
    setLineas((antes) => antes.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
  }, [])

  // Un solo `onCommit` estable para todas las celdas (`memo` de la `XCell`): el id es `<línea>:<campo>`.
  const alConfirmarNumero = useCallback(
    (idDeCelda: string, valor: number | null) => {
      const corte = idDeCelda.lastIndexOf(':')
      const id = idDeCelda.slice(0, corte)
      const campo = idDeCelda.slice(corte + 1)
      if (!CAMPOS_NUMERICOS.has(campo)) return
      const leido = campo === 'cantidad' ? cantidadDeCelda(valor) : montoDeCelda(valor)
      if (!leido.ok) {
        setErrores((antes) => ({ ...antes, [idDeCelda]: leido.error }))
        return
      }
      setErrores((antes) => sinClave(antes, idDeCelda))
      cambiar(id, { [campo]: leido.valor })
    },
    [cambiar],
  )

  // ↺ sólo existe en la logística: vuelve a la sugerida del tramo (la escrita queda nula, D46).
  const alReiniciar = useCallback(
    (idDeCelda: string) => {
      const corte = idDeCelda.lastIndexOf(':')
      if (idDeCelda.slice(corte + 1) !== 'logistica') return
      setErrores((antes) => sinClave(antes, idDeCelda))
      cambiar(idDeCelda.slice(0, corte), { logistica: null })
    },
    [cambiar],
  )

  const alCambiarTexto = useCallback(
    (id: string, campo: 'descripcion' | 'caja', valor: string | null) => {
      setErrores((antes) => sinClave(antes, `${id}:${campo}`))
      cambiar(id, campo === 'descripcion' ? { descripcion: valor ?? '' } : { caja: valor })
    },
    [cambiar],
  )

  const quitar = useCallback((id: string) => {
    setLineas((antes) => antes.filter((l) => l.id !== id))
  }, [])

  const agregar = useCallback((bloque: BloqueDeCotizacion, item?: ItemParaCotizar) => {
    setLineas((antes) => [...antes, lineaNueva(crypto.randomUUID(), bloque, item)])
  }, [])

  // Un solo objeto estable para todas las líneas (`memo` de la línea).
  const acciones = useMemo(
    () => ({ alConfirmarNumero, alReiniciar, alCambiarTexto, quitar, agregar }),
    [alConfirmarNumero, alReiniciar, alCambiarTexto, quitar, agregar],
  )

  return { lineas, setLineas, errores, setErrores, acciones }
}
