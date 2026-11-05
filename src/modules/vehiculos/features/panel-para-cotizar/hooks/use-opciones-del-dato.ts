'use client'

import { useEffect, useState } from 'react'
import type {
  LectorDeOpciones,
  OpcionesDelDato,
  TablaDelDato,
} from '../../../entities/dato-para-elegir'

export type LecturaDeOpciones =
  { tipo: 'leyendo' } | { tipo: 'error' } | { tipo: 'lista'; opciones: OpcionesDelDato }

// Las opciones de un dato del vehículo, leídas al montarse el grupo (al abrir el panel con un elegido) con el lector que arma la página. «Reintentar» vuelve a leer.
export function useOpcionesDelDato(leer: LectorDeOpciones, tablas: readonly TablaDelDato[]) {
  const [lectura, setLectura] = useState<LecturaDeOpciones>({ tipo: 'leyendo' })
  const [vuelta, setVuelta] = useState(0)
  useEffect(() => {
    let vigente = true
    void leer(tablas).then((leido) => {
      if (vigente) {
        setLectura(leido.ok ? { tipo: 'lista', opciones: leido.data } : { tipo: 'error' })
      }
    })
    return () => {
      vigente = false
    }
  }, [leer, tablas, vuelta])
  return {
    lectura,
    reintentar: () => {
      setLectura({ tipo: 'leyendo' })
      setVuelta((v) => v + 1)
    },
  }
}
