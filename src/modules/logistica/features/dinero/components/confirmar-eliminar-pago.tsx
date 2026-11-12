'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { Monto } from '@/shared/ui/monto'
import { tituloDeEliminarPago, type Pago } from '../../../entities/dinero/pago'

type Props = {
  // El que se elimina; el último que se vio mientras el diálogo se va.
  pago: Pago | null
  abierto: boolean
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  eliminar: (pago: Pago) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de eliminar un pago sin confirmar (`?panel=eliminar-pago&pago=<id>`): lo nombra por su concepto y muestra el monto con `<Monto>`. No ofrece «Deshacer». Un pago confirmado no
// se elimina: se anula.
export function ConfirmarEliminarPago({ pago, abierto, eliminar, alCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!pago) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await eliminar(pago)
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
      alConfirmar={alConfirmar}
      titulo={pago ? tituloDeEliminarPago(pago) : 'Eliminar el pago'}
      descripcion="Se quita de esta unidad y del margen. No se puede deshacer."
      etiquetaConfirmar="Eliminar pago"
      enCurso={enCurso}
    >
      {pago ? (
        <p className="text-(length:--text-sm)">
          Monto: <Monto valor={pago.monto} moneda={pago.moneda} />
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
