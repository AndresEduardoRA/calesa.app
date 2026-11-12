'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Mensaje } from '../../../entities/mensajes'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { eliminarMensaje } from '../actions/eliminar-mensaje'

type Props = {
  // Lo que se va a borrar; nulo = cerrado. Estable entre renders (sale de lo cargado).
  objetivo: Mensaje | null
  usuarioId: string
  // Tras borrar bien: el cambio local (la señal `UPDATE` trae la fila verdadera).
  alBorrar: (id: string, cambios: Partial<Mensaje>) => void
  alCerrar: () => void
}

// «Borrar tu mensaje» / «Borrar el mensaje de {nombre}» (`?panel=borrar-mensaje&mensaje=<id>`). Un rechazo de la base (o sin red) se dice
// adentro y no cierra el diálogo.
export function ConfirmarBorrado({ objetivo, usuarioId, alBorrar, alCerrar }: Props) {
  const accion = useAction(eliminarMensaje)
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  // Mientras se cierra, el diálogo sigue mostrando lo último que tuvo.
  const mostrado = useUltimo(objetivo)
  const propio = mostrado?.autorId === usuarioId

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!objetivo) {
      return
    }
    setError(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      accion.executeAsync({ mensaje: objetivo.id }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    alBorrar(objetivo.id, { cuerpo: null, eliminadoEn: new Date().toISOString() })
    cerrar()
  }

  return (
    <Confirmar
      abierto={objetivo !== null}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={
        propio
          ? 'Borrar tu mensaje'
          : `Borrar el mensaje de ${mostrado?.autorNombre ?? 'alguien del equipo'}`
      }
      descripcion="Se vacía su texto para todas las personas de la conversación y queda «Mensaje eliminado». No se puede deshacer."
      etiquetaConfirmar="Borrar"
      enCurso={enCurso}
    >
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
    </Confirmar>
  )
}
