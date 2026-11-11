'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { eliminarTarea } from '../actions/eliminar-tarea'
import { useEliminarTareaPorUrl } from '../hooks/use-eliminar-tarea-por-url'

type Props = { tarea: DetalleDeTarea; alEliminar: () => void }

// «Eliminar» una tarea (`?eliminar=tarea`; irreversible: pide confirmar y nombra la tarea). Un rechazo de la base se dice dentro del diálogo.
export function ConfirmarEliminarTarea({ tarea, alEliminar }: Props) {
  const eliminar = useAction(eliminarTarea)
  const url = useEliminarTareaPorUrl()
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: tarea.id, actualizadoEnEsperado: tarea.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    url.cerrar()
    avisarExito(`Se eliminó la tarea «${tarea.titulo}».`)
    alEliminar()
  }

  return (
    <>
      <Button
        variant="outline"
        className="min-h-11 text-(--color-peligro-ink) md:min-h-9"
        onClick={() => {
          setError(null)
          url.abrir()
        }}
      >
        Eliminar
      </Button>
      <Confirmar
        abierto={url.abierto}
        alCerrar={url.cerrar}
        alConfirmar={confirmar}
        titulo={`Eliminar la tarea «${tarea.titulo}»`}
        descripcion="Deja de verse en la agenda de quien la tenía. No se puede deshacer."
        etiquetaConfirmar="Eliminar tarea"
        enCurso={eliminar.isPending}
      >
        {error ? (
          <Aviso tono="peligro">
            <p>{error}</p>
          </Aviso>
        ) : null}
      </Confirmar>
    </>
  )
}
