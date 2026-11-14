'use client'

import { useState } from 'react'
import type { ModoGanada } from './use-modo-ganada'

// Lo que la persona va armando en el hueco «Qué falta» y no debe perderse cuando la lista se relee o la pantalla se repinta: a qué destino va, la nota que escribió y, si otra persona se le
// adelantó, el aviso de conflicto. Vive en el hueco y no en cada destino: tras un conflicto la unidad cambia de fase, los destinos son otros y la nota sigue ahí.
export type ConflictoDeMover = { mensaje: string }

// En el modo «La ganamos» (`ganada`), mover anota además la subasta ganada; el destino que abre solo es el primero que no es la subasta, hasta que la
// persona elige o cierra otro (`conAbiertoPorDefecto`).
export function useBorradorDeMover(ganada: ModoGanada | null = null) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [elegido, setElegido] = useState(false)
  const [nota, setNota] = useState('')
  const [conflicto, setConflicto] = useState<ConflictoDeMover | null>(null)
  return {
    abierto,
    elegido,
    nota,
    conflicto,
    ganada,
    abrir: (faseId: string) => {
      setAbierto(faseId)
      setElegido(true)
      setConflicto(null)
    },
    cerrar: () => {
      setAbierto(null)
      setElegido(true)
      setConflicto(null)
    },
    escribir: setNota,
    decirConflicto: (mensaje: string) => {
      setConflicto({ mensaje })
    },
    quitarConflicto: () => {
      setConflicto(null)
    },
    // Se movió: nada de lo armado sirve ya.
    vaciar: () => {
      setAbierto(null)
      setNota('')
      setConflicto(null)
    },
  }
}

export type BorradorDeMover = ReturnType<typeof useBorradorDeMover>

/** El borrador con un destino abierto por omisión mientras la persona no eligió ni cerró ninguno. */
export function conAbiertoPorDefecto(borrador: BorradorDeMover, faseId: string): BorradorDeMover {
  return borrador.elegido || borrador.abierto !== null ? borrador : { ...borrador, abierto: faseId }
}
