'use client'

import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { motivoParaNoEliminar, type OrigenDeLeadConUso } from '../../../entities/origen-de-lead'

type Props = {
  origen: OrigenDeLeadConUso
  alEditar: () => void
  // Confirmado: elimina y dice si pudo.
  alEliminar: () => Promise<boolean>
}

// «Editar» y «Eliminar» de un origen. Eliminar está apagado y dice por qué si algún lead lo usa: ahí
// sólo se desactiva. Lo irreversible pide confirmar nombrando el origen.
export function AccionesDeOrigen({ origen, alEditar, alEliminar }: Props) {
  const [eliminando, setEliminando] = useState(false)
  const [enCurso, setEnCurso] = useState(false)
  const motivo = motivoParaNoEliminar(origen)
  const idMotivo = `origen-${origen.id}-motivo`

  async function confirmar() {
    setEnCurso(true)
    const eliminado = await alEliminar()
    setEnCurso(false)
    if (!eliminado) {
      setEliminando(false)
    }
  }

  return (
    <div className="order-3 ml-auto flex md:order-4 md:ml-0">
      <Button
        variant="outline"
        className="h-11 md:h-8"
        aria-label={`Editar ${origen.nombre}`}
        onClick={alEditar}
      >
        <PencilIcon aria-hidden />
        Editar
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Eliminar ${origen.nombre}`}
        aria-describedby={motivo ? idMotivo : undefined}
        disabled={motivo !== null}
        title={motivo ?? undefined}
        onClick={() => {
          setEliminando(true)
        }}
      >
        <Trash2Icon aria-hidden />
      </Button>
      {motivo ? (
        <span id={idMotivo} className="sr-only">
          {motivo}
        </span>
      ) : null}
      <Confirmar
        abierto={eliminando}
        alCerrar={() => {
          setEliminando(false)
        }}
        alConfirmar={() => void confirmar()}
        titulo={`Eliminar el origen «${origen.nombre}»`}
        descripcion="Ningún lead lo usa. Se elimina para siempre y no se puede deshacer."
        etiquetaConfirmar="Eliminar origen"
        enCurso={enCurso}
      />
    </div>
  )
}
