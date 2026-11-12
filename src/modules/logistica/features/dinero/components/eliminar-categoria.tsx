'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se elimina (la última que se vio, mientras el diálogo se va).
  categoria: CategoriaDeGasto | null
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alEliminar: (categoria: CategoriaDeGasto) => Promise<ErrorApp | null>
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» una categoría de gasto (`?panel=eliminar-categoria&categoria=<id>`): lo irreversible pide confirmar nombrándola. Una con gastos no se borra: la base lo rechaza (`on delete restrict`) y el
// diálogo dice que se desactive, sin cerrarse.
export function EliminarCategoria({
  abierto,
  alCerrar,
  categoria,
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
    if (!categoria) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await alEliminar(categoria)
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
      titulo={categoria ? `Eliminar la categoría «${categoria.nombre}»` : 'Eliminar la categoría'}
      descripcion="Se elimina para siempre y no se puede deshacer. Si ya tiene gastos, no se borra: se desactiva."
      etiquetaConfirmar="Eliminar categoría"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
