'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { formatearFecha } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { tituloDeEliminarGasto, type Gasto } from '../../../entities/dinero/gasto'

type Props = {
  // El que se elimina; el último que se vio mientras el diálogo se va.
  gasto: Gasto | null
  abierto: boolean
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  eliminar: (gasto: Gasto) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de eliminar un gasto (`?panel=eliminar-gasto&gasto=<id>`): lo nombra por su categoría y su fecha y muestra el monto con `<Monto>`. No ofrece «Deshacer». Si la base lo
// rechaza (el último gasto de tributos que la fase exige), lo dice adentro y no se cierra.
export function ConfirmarEliminarGasto({ gasto, abierto, eliminar, alCerrar }: Props) {
  const { zonaHoraria } = useRegional()
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!gasto) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await eliminar(gasto)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={
        gasto
          ? tituloDeEliminarGasto(gasto, formatearFecha(gasto.fecha, { zona: zonaHoraria }))
          : 'Eliminar el gasto'
      }
      descripcion="Se quita de esta unidad y del margen. No se puede deshacer."
      etiquetaConfirmar="Eliminar gasto"
      enCurso={enCurso}
    >
      {gasto ? (
        <p className="text-(length:--text-sm)">
          Monto: <Monto valor={gasto.monto} moneda={gasto.moneda} />
        </p>
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
