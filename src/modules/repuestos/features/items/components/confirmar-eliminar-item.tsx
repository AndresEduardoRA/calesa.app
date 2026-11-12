'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { FilaDeItem } from '../../../entities/nucleo/item'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  item: FilaDeItem | null
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alEliminar: (item: FilaDeItem) => Promise<ErrorApp | null>
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un ítem (`?panel=eliminar-item&item=<id>`, 8.09-2, C11): lo irreversible pide confirmar nombrándolo. Uno con historial, documentos, compras, gastos o stock no se elimina: la base dice por
// qué (y que se pasa a stock o se marca perdido) y el diálogo lo muestra sin cerrarse; un conflicto se dice igual.
export function ConfirmarEliminarItem({
  abierto,
  alCerrar,
  item,
  alEliminar,
  focoAlCerrar,
}: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!item) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await alEliminar(item)
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
      titulo={item ? `Eliminar el ítem «${item.descripcion}»` : 'Eliminar el ítem'}
      descripcion="Se elimina para siempre; no se puede deshacer."
      etiquetaConfirmar="Eliminar"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    >
      {error ? (
        <Aviso tono={error.codigo === 'conflicto' ? 'aviso' : 'peligro'}>
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
