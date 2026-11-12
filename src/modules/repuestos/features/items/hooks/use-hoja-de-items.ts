'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { useAltasYBajasDeItems } from './use-altas-y-bajas-de-items'
import { useEscrituraDeItems } from './use-escritura-de-items'

type Args = {
  proyectoId: string
  // Las filas como las leyó el servidor: cuando llegan otras (recargar, volver a entrar) valen ellas.
  filasDelServidor: readonly FilaDeItem[]
  // La moneda con que se guarda un precio puesto a un ítem que no tenía una (D52): la primera activa.
  monedaPorDefecto: string | null
}

// El estado de la hoja (8.09-2, C9 a C11): las filas, lo que cada celda dijo al guardar y si hubo un conflicto. Las escrituras son de `useEscrituraDeItems`.
export function useHojaDeItems({ proyectoId, filasDelServidor, monedaPorDefecto }: Args) {
  const [filas, setFilas] = useState<readonly FilaDeItem[]>(filasDelServidor)
  const [delServidor, setDelServidor] = useState(filasDelServidor)
  if (delServidor !== filasDelServidor) {
    setDelServidor(filasDelServidor)
    setFilas(filasDelServidor)
  }
  const [errores, setErrores] = useState<Readonly<Record<string, string>>>({})
  const [conflicto, setConflicto] = useState<string | null>(null)

  const filasRef = useRef(filas)
  const monedaRef = useRef(monedaPorDefecto)
  useEffect(() => {
    filasRef.current = filas
    monedaRef.current = monedaPorDefecto
  })

  const poner = useCallback((nuevas: readonly FilaDeItem[]) => {
    filasRef.current = nuevas
    setFilas(nuevas)
  }, [])
  const decirError = useCallback((clave: string, mensaje: string | null) => {
    setErrores((previos) => {
      if (mensaje === null) {
        if (!(clave in previos)) return previos
        const { [clave]: _quitado, ...resto } = previos
        return resto
      }
      return { ...previos, [clave]: mensaje }
    })
  }, [])
  const escritura = useEscrituraDeItems({
    filasRef,
    monedaRef,
    poner,
    decirError,
    alConflicto: setConflicto,
  })

  const altasYBajas = useAltasYBajasDeItems({ proyectoId, filasRef, poner })

  // Cambia una fila sobre la vigente (el hueco de la hoja, 8.10-2): un id que ya no está no hace nada.
  const cambiarFila = useCallback(
    (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => {
      if (!filasRef.current.some((f) => f.id === id)) return
      poner(filasRef.current.map((f) => (f.id === id ? cambio(f) : f)))
    },
    [poner],
  )

  return {
    filas,
    errores,
    conflicto,
    olvidarConflicto: () => {
      setConflicto(null)
    },
    alReiniciar: useCallback(() => undefined, []),
    cambiarFila,
    ...escritura,
    ...altasYBajas,
  }
}
