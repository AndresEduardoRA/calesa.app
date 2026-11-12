'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import { tituloDe, type Conversacion } from '../../../entities/conversaciones'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { salirDeLaConversacion } from '../actions/salir-de-la-conversacion'
import { useSalirPorUrl } from '../hooks/use-salir-por-url'

type Props = {
  abierta: string | null
  filas: readonly Conversacion[]
  // Tras salir: quitar la fila de la lista y releerla (dejar una conversación no genera señal de Realtime).
  quitar: (id: string) => void
  recargar: () => Promise<void>
}

// «Salir del grupo «X»» / «Salir del canal «X»» (`?panel=salir`). Un rechazo se dice adentro y no cierra el diálogo.
export function ConfirmarSalir({ abierta, filas, quitar, recargar }: Props) {
  const router = useRouter()
  const salir = useAction(salirDeLaConversacion)
  const { abierto, conversacion, cerrar } = useSalirPorUrl(abierta, filas)
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const nombre = conversacion ? tituloDe(conversacion) : 'esta conversación'
  const canal = conversacion?.tipo === 'global'

  async function confirmar() {
    if (abierta === null) {
      return
    }
    setError(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      salir.executeAsync({ conversacion: abierta }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    quitar(abierta)
    void recargar()
    avisarExito(`Saliste de «${nombre}»`)
    // Cierra el diálogo y el hilo: la conversación ya no es mía.
    router.replace('/chat')
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={() => {
        setError(null)
        cerrar()
      }}
      alConfirmar={confirmar}
      titulo={
        conversacion
          ? `${canal ? 'Salir del canal' : 'Salir del grupo'} «${nombre}»`
          : 'Salir de la conversación'
      }
      descripcion={
        canal
          ? 'Dejas de recibir sus mensajes y de verlo en tu lista. Podrás volver con «Entrar al canal del equipo».'
          : 'Dejas de recibir sus mensajes y de verla en tu lista. Podrás volver a verla sólo si alguien te agrega de nuevo.'
      }
      etiquetaConfirmar="Salir"
      enCurso={enCurso}
    >
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
    </Confirmar>
  )
}
