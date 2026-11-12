'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'

type Props = {
  // El que se elimina; el último que se vio mientras el diálogo se va.
  documento: DocumentoDeLaUnidad | null
  abierto: boolean
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  eliminar: (documento: DocumentoDeLaUnidad) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de eliminar un documento (`?panel=eliminar-documento&documento=<id>`): lo nombra por su archivo. No ofrece «Deshacer» (no se restaura). Si una fase lo exige para
// salir, la base lo rechaza y el motivo se dice aquí tal cual, con el diálogo abierto.
export function ConfirmarEliminarDocumento({ documento, abierto, eliminar, alCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!documento) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await eliminar(documento)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  const nombre = documento?.nombre ?? 'Documento sin nombre'
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={alConfirmar}
      titulo={documento ? `Eliminar «${nombre}»` : 'Eliminar el documento'}
      descripcion="Se quita de esta unidad y de «Qué falta». No se puede deshacer."
      etiquetaConfirmar="Eliminar documento"
      enCurso={enCurso}
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
