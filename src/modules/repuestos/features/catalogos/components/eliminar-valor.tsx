'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { ValorDeCatalogo } from '../../../entities/catalogos/catalogo'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  valor: ValorDeCatalogo | null
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alEliminar: (valor: ValorDeCatalogo) => Promise<ErrorApp | null>
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un valor de catálogo (`?panel=eliminar-valor&valor=<id>`): lo irreversible pide confirmar nombrándolo. Uno en uso no se borra: la base lo rechaza
// con el texto que dice desactivarlo, y el diálogo lo muestra sin cerrarse.
export function EliminarValor({ abierto, alCerrar, valor, alEliminar, focoAlCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!valor) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await alEliminar(valor)
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
      titulo={valor ? `Eliminar «${valor.nombre}»` : 'Eliminar el valor'}
      descripcion="Se elimina para siempre. Si algún ítem o cotización lo usa, no se elimina: desactívalo para que no se elija más."
      etiquetaConfirmar="Eliminar"
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
