'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'

type Props = {
  abierto: boolean
  alCerrar: () => void
  numero: number
  // En la hoja editable con cambios: anular los descarta y lo dice.
  sinGuardar: boolean
  alAnular: () => Promise<ErrorApp | null>
}

const DESCRIPCION =
  'Ya no se podrá editar ni aceptar. El precio que ya pasó a los ítems no cambia. No se puede deshacer.'

// «Anular la cotización #N» (`?panel=anular-cotizacion`, 8.12-4, C15): desde borrador o aceptada; no revierte los precios que ya pasaron a los ítems
// (D12 de 8.12-1). Un conflicto o una regla de la base se dicen adentro, sin cerrar.
export function ConfirmarAnular({ abierto, alCerrar, numero, sinGuardar, alAnular }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    setError(null)
    setEnCurso(true)
    const rechazo = await alAnular()
    setEnCurso(false)
    if (rechazo === null) cerrar()
    else setError(rechazo)
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={alConfirmar}
      titulo={`Anular la cotización #${String(numero)}`}
      descripcion={sinGuardar ? `${DESCRIPCION} Los cambios sin guardar se pierden.` : DESCRIPCION}
      etiquetaConfirmar="Anular cotización"
      enCurso={enCurso}
    >
      {error ? (
        <Aviso tono={error.codigo === 'conflicto' ? 'aviso' : 'peligro'}>
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
