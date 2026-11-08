'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { MENSAJE_SIN_RED_AL_DESCARTAR_LA_PLANTILLA } from '../../../entities/plantilla/descartar-la-plantilla'

type Opciones = {
  // El `actualizadoEn` del borrador que la pestaña leyó (nula: no hay nada que descartar). Un conflicto se va cuando llega otro.
  esperada: string | null
  // Manda el descarte con la esperada de ahora (la action, por `enviarAccion`).
  pedir: (esperada: string) => Promise<Envio<null>>
  // Entró: quien lo usa avisa y cierra.
  alDescartar: () => void
}

// Lo que hace «Descartar borrador» de la tarjeta (4.19-3c): un envío a la vez; lo que no entró queda dentro del diálogo, que no se cierra. El PT409 es un conflicto con
// el mensaje de la base, que se va **al llegar** el borrador nuevo (lo trae «Recargar»). Sin reintento al volver la red: es irreversible y se confirma otra vez a
// mano; sin respuesta no se sabe si borró, y el aviso lo dice así.
export function useDescarteDeLaPlantilla({ esperada, pedir, alDescartar }: Opciones) {
  const router = useRouter()
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(esperada)
  const [recargando, recargarPagina] = useTransition()

  async function confirmar() {
    if (conflicto !== null || esperada === null) return
    setAviso(null)
    const envio = await mandar(() => pedir(esperada))
    if (envio === null) return
    if (envio.ok) {
      alDescartar()
      return
    }
    if ('sinRed' in envio) {
      setAviso(MENSAJE_SIN_RED_AL_DESCARTAR_LA_PLANTILLA)
    } else if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  return {
    enCurso,
    aviso,
    conflicto,
    recargando,
    confirmar,
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}
