'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { Monto } from '@/shared/ui/monto'
import { tituloDeConfirmarPago, type Pago } from '../../../entities/dinero/pago'
import { useAmbitoDePago } from '../hooks/ambito-de-pago'

type Props = {
  // El que se confirma; el último que se vio mientras el diálogo se va.
  pago: Pago | null
  abierto: boolean
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  confirmar: (pago: Pago) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de un pago (`?panel=confirmar-pago&pago=<id>`): lo nombra por su concepto y muestra el monto con `<Monto>`. Avisa que queda sellado: no se podrá editar, y si hubo un error
// se anula con un motivo. Sin permiso, la base lo rechaza y se dice adentro.
export function ConfirmarPago({ pago, abierto, confirmar, alCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  // Un pago de proyecto todavía no se anula (8-13d): confirmarlo lo deja sellado del todo.
  const proyecto = useAmbitoDePago() === 'proyecto'

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
    const rechazo = await confirmar(pago)
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
      titulo={pago ? tituloDeConfirmarPago(pago) : 'Confirmar el pago'}
      descripcion={
        proyecto
          ? 'Queda sellado: no se podrá editar, eliminar ni anular por ahora.'
          : 'Queda sellado: no se podrá editar. Si te equivocas, se anula con un motivo.'
      }
      etiquetaConfirmar="Confirmar pago"
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
