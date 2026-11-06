'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { MENSAJE_SIN_RED_AL_DESCARTAR } from '../../../entities/formula/descarte'

type Opciones = {
  // Manda el descarte (la action, por `enviarAccion`).
  pedir: () => Promise<Envio<null>>
  // Entró: quien lo usa avisa y cierra.
  alDescartar: () => void
}

// Lo que hace «Descartar borrador» (4.20-2c): un envío a la vez; lo que no entró queda como aviso dentro del diálogo, que no se cierra. Sin reintento al volver la
// red: es irreversible y se confirma otra vez a mano. Sin respuesta no se sabe si borró, y el aviso lo dice así.
export function useDescarteDelBorrador({ pedir, alDescartar }: Opciones) {
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aviso, setAviso] = useState<string | null>(null)
  async function confirmar() {
    setAviso(null)
    const envio = await mandar(pedir)
    if (envio === null) {
      return
    }
    if (envio.ok) {
      alDescartar()
      return
    }
    setAviso('sinRed' in envio ? MENSAJE_SIN_RED_AL_DESCARTAR : envio.error.mensaje)
  }
  return { enCurso, aviso, confirmar }
}
