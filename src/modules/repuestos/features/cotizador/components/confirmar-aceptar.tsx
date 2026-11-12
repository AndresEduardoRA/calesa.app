'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { Monto } from '@/shared/ui/monto'

type Props = {
  abierto: boolean
  alCerrar: () => void
  numero: number
  // El total **guardado** (D47): es el que pasa a los ítems.
  total: string | null
  moneda: string
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alAceptar: () => Promise<ErrorApp | null>
}

// «Aceptar la cotización #N» (`?panel=aceptar-cotizacion`, 8.12-4, C14): nombra el número y el total guardado. Fija el precio de los ítems y anula la
// aceptada anterior; no se deshace. Un conflicto (otra se aceptó recién) o una regla de la base se dicen adentro, sin cerrar.
export function ConfirmarAceptar({ abierto, alCerrar, numero, total, moneda, alAceptar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    setError(null)
    setEnCurso(true)
    const rechazo = await alAceptar()
    setEnCurso(false)
    if (rechazo === null) cerrar()
    else setError(rechazo)
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={alConfirmar}
      titulo={`Aceptar la cotización #${String(numero)}`}
      descripcion="El precio unitario de cada línea con ítem pasa a ese ítem y la cotización aceptada antes se anula. No se puede deshacer."
      etiquetaConfirmar="Aceptar cotización"
      enCurso={enCurso}
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">Total</span>
        {total === null ? (
          <span className="text-(--color-ink-soft)">Sin total</span>
        ) : (
          <Monto valor={Number(total)} moneda={moneda} className="font-semibold" />
        )}
      </p>
      {error ? (
        <Aviso tono={error.codigo === 'conflicto' ? 'aviso' : 'peligro'}>
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
