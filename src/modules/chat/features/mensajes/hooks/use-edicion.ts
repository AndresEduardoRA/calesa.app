'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { textoValido, type Mensaje } from '../../../entities/mensajes'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { editarMensaje } from '../actions/editar-mensaje'

type Props = {
  reemplazar: (id: string, cambios: Partial<Mensaje>) => void
}

export type ResultadoDeGuardar = { ok: true } | { ok: false; mensaje: string }

// Editar un mensaje propio en línea. Espera a la base (sin optimismo): al volver bien se aplica el cambio local y la señal `UPDATE` trae la fila
// verdadera; si la base lo rechaza (15 minutos, versión distinta, permiso) el editor sigue abierto con el texto y dice el motivo.
export function useEdicion({ reemplazar }: Props) {
  const accion = useAction(editarMensaje)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const cancelar = useCallback(() => {
    setEditandoId(null)
  }, [])

  const guardar = useCallback(
    async (mensaje: Mensaje, texto: string): Promise<ResultadoDeGuardar> => {
      const valido = textoValido(texto)
      if (!valido.ok) {
        return {
          ok: false,
          mensaje: valido.mensaje ?? 'El mensaje no puede quedar vacío.',
        }
      }
      const envio = await enviarAccion(
        accion.executeAsync({
          mensaje: mensaje.id,
          esperado: mensaje.editadoEn ?? mensaje.creadoEn,
          cuerpo: valido.cuerpo,
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (!envio.ok) {
        return { ok: false, mensaje: envio.error.mensaje }
      }
      if (envio.data.resultado === 'editado') {
        reemplazar(mensaje.id, { cuerpo: valido.cuerpo, editadoEn: envio.data.actualizadoEn })
      }
      setEditandoId(null)
      return { ok: true }
    },
    [accion, reemplazar],
  )

  return { editandoId, empezar: setEditandoId, cancelar, guardar }
}
