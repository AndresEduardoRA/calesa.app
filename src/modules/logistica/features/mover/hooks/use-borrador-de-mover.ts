'use client'

import { useState } from 'react'

// Lo que la persona va armando en el hueco «Qué falta» y no debe perderse cuando la lista se relee o la pantalla se repinta: a qué destino va, la nota que escribió y, si otra persona se le
// adelantó, el aviso de conflicto. Vive en el hueco y no en cada destino: tras un conflicto la unidad cambia de fase, los destinos son otros y la nota sigue ahí.
export type ConflictoDeMover = { mensaje: string }

export function useBorradorDeMover() {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [conflicto, setConflicto] = useState<ConflictoDeMover | null>(null)
  return {
    abierto,
    nota,
    conflicto,
    abrir: (faseId: string) => {
      setAbierto(faseId)
      setConflicto(null)
    },
    cerrar: () => {
      setAbierto(null)
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
