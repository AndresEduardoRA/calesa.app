'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { MENSAJE_SIN_RED_AL_DESCARTAR } from '../../../entities/formula/descarte'

type Opciones = {
  // La hora del borrador que se descarta (4.21-3b-1): un conflicto se va cuando llega otra (la trae «Recargar»).
  version: string
  // Manda el descarte (la action, por `enviarAccion`).
  pedir: () => Promise<Envio<null>>
  // Entró: quien lo usa avisa y cierra.
  alDescartar: () => void
}

// Lo que hace «Descartar borrador» (4.20-2c): un envío a la vez; lo que no entró queda como aviso dentro del diálogo, que no se cierra. Sin reintento al volver la
// red: es irreversible y se confirma otra vez a mano. Sin respuesta no se sabe si borró, y el aviso lo dice así. El PT409 de la hora (otra persona lo guardó o ya no
// está, 4.21-3b-1) es un conflicto con el texto de la base, que espera la hora nueva.
export function useDescarteDelBorrador({ version, pedir, alDescartar }: Opciones) {
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)
  async function confirmar() {
    setAviso(null)
    setConflicto(null)
    const envio = await mandar(pedir)
    if (envio === null) {
      return
    }
    if (envio.ok) {
      alDescartar()
      return
    }
    if ('sinRed' in envio) {
      setAviso(MENSAJE_SIN_RED_AL_DESCARTAR)
    } else if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else {
      setAviso(envio.error.mensaje)
    }
  }
  return { enCurso, aviso, conflicto, confirmar }
}
