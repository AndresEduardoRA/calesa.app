'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import type { DetalleDeEvento } from '../../../entities/detalle'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { eliminarEvento } from '../actions/eliminar-evento'
import { useEliminarEventoPorUrl } from '../hooks/use-eliminar-evento-por-url'

type Props = { evento: DetalleDeEvento; alEliminar: () => void }

// «Eliminar» un evento (`?eliminar=evento`; irreversible: pide confirmar y nombra el evento). Si otra persona lo cambió mientras tanto, o la base no deja
// eliminarlo, el motivo se dice dentro del diálogo.
export function ConfirmarEliminarEvento({ evento, alEliminar }: Props) {
  const eliminar = useAction(eliminarEvento)
  const url = useEliminarEventoPorUrl()
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: evento.id, actualizadoEnEsperado: evento.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    url.cerrar()
    avisarExito(`Se eliminó el evento «${evento.titulo}».`)
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
        titulo={`Eliminar el evento «${evento.titulo}»`}
        descripcion="Deja de verse en la agenda de quien lo tenía. No se puede deshacer."
        etiquetaConfirmar="Eliminar evento"
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
